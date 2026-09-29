import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See the README.");
}

async function signInAs(email: string, password: string) {
  const supabase = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in as ${email}: ${error.message}. Have you run npm run seed?`);
  return supabase;
}

async function visibleDocuments(email: string, password: string) {
  const supabase = await signInAs(email, password);

  const { data: client, error: clientError } = await supabase.from("clients").select("id, name").single();
  if (clientError) throw clientError;

  const { data: documents, error: docsError } = await supabase.from("documents").select("id, client_id");
  if (docsError) throw docsError;

  return { client, documents: documents ?? [] };
}

describe("document visibility", () => {
  it("does not expose another client's documents when their business ID is requested", async () => {
    const harbour = await signInAs("alex@tallyroom.test", "trial-pass-1");
    const northgate = await signInAs("sam@tallyroom.test", "trial-pass-2");

    const { data: otherClient, error: clientError } = await northgate
      .from("clients").select("id").single();
    if (clientError) throw clientError;

    const { data, error } = await harbour.from("documents")
      .select("id, client_id").eq("client_id", otherClient.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("shows Harbour Bakery its own 3 documents and nothing else", async () => {
    const { client, documents } = await visibleDocuments("alex@tallyroom.test", "trial-pass-1");

    expect(client.name).toBe("Harbour Bakery Ltd");
    expect(documents).toHaveLength(3);
    expect(documents.every((d) => d.client_id === client.id)).toBe(true);
  });

  it("shows Northgate Plumbing its own 2 documents and nothing else", async () => {
    const { client, documents } = await visibleDocuments("sam@tallyroom.test", "trial-pass-2");

    expect(client.name).toBe("Northgate Plumbing");
    expect(documents).toHaveLength(2);
    expect(documents.every((d) => d.client_id === client.id)).toBe(true);
  });
});
