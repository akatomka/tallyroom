import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";

type Document = {
  id: string;
  name: string;
  doc_type: string;
  status: string;
  due_date: string;
};

const typeLabels: Record<string, string> = {
  receipt: "Receipt",
  invoice: "Invoice",
  bank_statement: "Bank statement",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase.from("clients").select("name").single();

  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, doc_type, status, due_date")
    .order("due_date", { ascending: true });

  const docs = (documents ?? []) as Document[];
  const outstanding = docs.filter((d) => d.status === "outstanding").length;

  return (
    <div className="card">
      <div className="summary">
        <div>
          <h1>{client?.name ?? "Your documents"}</h1>
          <p className="muted">Signed in as {user.email}</p>
        </div>
        <span className="pill">Outstanding: {outstanding}</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Type</th>
            <th>Status</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {docs.length === 0 ? (
            <tr>
              <td className="empty" colSpan={4}>
                No documents yet.
              </td>
            </tr>
          ) : (
            docs.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.name}</td>
                <td>{typeLabels[doc.doc_type] ?? doc.doc_type}</td>
                <td>{doc.status === "received" ? "Received" : "Outstanding"}</td>
                <td>{new Date(doc.due_date).toLocaleDateString("en-GB")}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <form action={signOut} style={{ marginTop: 20 }}>
        <button className="secondary" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
