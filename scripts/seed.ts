import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. See the README.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

function daysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const seedData = [
  {
    email: "alex@tallyroom.test",
    password: "trial-pass-1",
    client: "Harbour Bakery Ltd",
    documents: [
      { name: "March bank statement", doc_type: "bank_statement", status: "received", due_date: daysFromToday(-20) },
      { name: "Flour supplier invoice", doc_type: "invoice", status: "outstanding", due_date: daysFromToday(5) },
      { name: "Van fuel receipts", doc_type: "receipt", status: "outstanding", due_date: daysFromToday(-10) },
    ],
  },
  {
    email: "sam@tallyroom.test",
    password: "trial-pass-2",
    client: "Northgate Plumbing",
    documents: [
      { name: "Parts wholesaler invoice", doc_type: "invoice", status: "received", due_date: daysFromToday(-15) },
      { name: "Q1 bank statement", doc_type: "bank_statement", status: "outstanding", due_date: daysFromToday(-9) },
    ],
  },
];

async function findOrCreateUser(email: string, password: string): Promise<string> {
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!created.error && created.data.user) return created.data.user.id;

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email === email);
  if (!existing) throw created.error ?? new Error(`Could not create ${email}`);
  return existing.id;
}

async function main() {
  for (const entry of seedData) {
    const userId = await findOrCreateUser(entry.email, entry.password);

    const { error: deleteError } = await admin.from("clients").delete().eq("user_id", userId);
    if (deleteError) throw deleteError;

    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({ name: entry.client, user_id: userId })
      .select("id")
      .single();
    if (clientError) throw clientError;

    const { error: docsError } = await admin
      .from("documents")
      .insert(entry.documents.map((doc) => ({ ...doc, client_id: client.id })));
    if (docsError) throw docsError;

    console.log(`Seeded ${entry.client} (${entry.email}) with ${entry.documents.length} documents`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
