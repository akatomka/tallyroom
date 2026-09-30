import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { overdueCutoff } from "../lib/reminders/dates";

config({ path: ".env.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert(url && key && publicKey, "Supabase configuration is required.");
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const client = createClient(url, publicKey, { auth: { persistSession: false } });
  const anonymous = createClient(url, publicKey, { auth: { persistSession: false } });
  const { error: loginError } = await client.auth.signInWithPassword({
    email: "alex@tallyroom.test", password: "trial-pass-1",
  });
  assert.ifError(loginError);
  const { data: business, error: businessError } = await client.from("clients").select("id").single();
  assert.ifError(businessError);
  assert(business);

  const cutoff = overdueCutoff();
  const earlier = new Date(`${cutoff}T00:00:00Z`);
  earlier.setUTCDate(earlier.getUTCDate() - 1);
  const ids = Array.from({ length: 4 }, () => randomUUID());
  const fixtures = ids.map((id, i) => ({
    id, client_id: business.id, name: "Temporary reminder verification", doc_type: "receipt",
    status: i === 2 ? "received" : "outstanding",
    due_date: i === 1 ? cutoff : earlier.toISOString().slice(0, 10),
  }));
  const { error: insertError } = await admin.from("documents").insert(fixtures);
  assert.ifError(insertError);
  try {
    const claims = await Promise.all(Array.from({ length: 5 }, () =>
      admin.rpc("claim_document_reminder", { target_document: ids[0] })));
    for (const claim of claims) assert.ifError(claim.error);
    assert.equal(claims.filter((claim) => claim.data !== null).length, 1,
      "Exactly one concurrent worker should reserve the reminder.");
    const { data: reservations, error: readError } = await admin.from("document_reminders")
      .select("id, state").eq("document_id", ids[0]);
    assert.ifError(readError);
    assert.equal(reservations?.length, 1);
    assert.equal(reservations?.[0].state, "processing");
    const repeated = await admin.rpc("claim_document_reminder", { target_document: ids[0] });
    assert.ifError(repeated.error);
    assert.equal(repeated.data, null);
    console.log("PASS: concurrent and repeated claims reserve exactly one reminder.");

    const { error: updateError } = await admin.from("documents").update({ status: "received" }).eq("id", ids[3]);
    assert.ifError(updateError);
    for (const id of ids.slice(1)) {
      const result = await admin.rpc("claim_document_reminder", { target_document: id });
      assert.ifError(result.error);
      assert.equal(result.data, null);
    }
    console.log("PASS: exactly seven days overdue, received, and newly received documents are excluded.");

    for (const [label, actor] of [["signed-in client", client], ["anonymous visitor", anonymous]] as const) {
      const reads = await actor.from("document_reminders").select("id");
      assert.equal(reads.error?.code, "42501", `${label} must not read reminder records.`);
      const writes = await actor.from("document_reminders").insert({ document_id: ids[1] });
      assert.equal(writes.error?.code, "42501", `${label} must not write reminder records.`);
      const rpc = await actor.rpc("claim_document_reminder", { target_document: ids[0] });
      assert.equal(rpc.error?.code, "42501", `${label} must not reserve reminders.`);
    }
    console.log("PASS: clients and anonymous visitors cannot read/write the log or call the reservation function.");
  } finally {
    // Delete only the random IDs created by this invocation; FK cascade removes their reservations.
    const { error } = await admin.from("documents").delete().in("id", ids);
    assert.ifError(error);
    const remaining = await admin.from("document_reminders").select("id").in("document_id", ids);
    assert.ifError(remaining.error);
    assert.equal(remaining.data?.length, 0);
    console.log("Temporary documents and reminder reservations removed. No emails were sent.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Database reminder verification failed.");
  process.exitCode = 1;
});
