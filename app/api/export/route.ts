import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvCell(value: string): string {
  const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Month-end export for the firm's staff
export async function GET(request: Request) {
  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Configured only by the server operator, never from user-editable metadata.
  const staffIds = (process.env.EXPORT_STAFF_USER_IDS ?? "")
    .split(",").map((id) => id.trim()).filter(Boolean);
  if (!staffIds.includes(user.id)) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!clientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
    return NextResponse.json({ error: "A valid clientId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("name, doc_type, status, due_date")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Could not export documents" }, { status: 500 });
  }

  const rows = [
    "name,type,status,due_date",
    ...(data ?? []).map((d) => [d.name, d.doc_type, d.status, d.due_date].map(csvCell).join(",")),
  ];

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="export-${clientId}.csv"`,
    },
  });
}
