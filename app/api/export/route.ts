import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Month-end export for the firm's staff
export async function GET(request: Request) {
  const clientId = new URL(request.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("documents")
    .select("name, doc_type, status, due_date")
    .eq("client_id", clientId)
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = [
    "name,type,status,due_date",
    ...(data ?? []).map((d) => [d.name, d.doc_type, d.status, d.due_date].map((v) => `"${v}"`).join(",")),
  ];

  return new NextResponse(rows.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="export-${clientId}.csv"`,
    },
  });
}
