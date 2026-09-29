import { createAdminClient } from "../supabase/admin";
import type { ReminderDocument, ReminderStore } from "./run";

export function createReminderStore(): ReminderStore {
  const db = createAdminClient();
  return {
    async candidates(cutoff) {
      const documents: ReminderDocument[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db.from("documents")
          .select("id, name, status, due_date, client:clients!inner(name, user_id)")
          .eq("status", "outstanding").lt("due_date", cutoff)
          .order("id").range(offset, offset + 499);
        if (error) throw new Error("Could not load reminder documents.");
        // Supabase infers an array without generated schema types; this FK is many-to-one.
        documents.push(...data as unknown as ReminderDocument[]);
        if (data.length < 500) return documents;
      }
    },
    async emailForUser(userId) {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error || !data.user.email) throw new Error("Could not resolve client email.");
      return data.user.email;
    },
    async claim(documentId) {
      const { data, error } = await db.rpc("claim_document_reminder", { target_document: documentId });
      if (error) throw new Error("Could not reserve reminder; check the migration was applied.");
      return data as string | null;
    },
    async complete(attemptId, state) {
      const { data, error } = await db.from("document_reminders")
        .update({ state, updated_at: new Date().toISOString() })
        .eq("id", attemptId).select("id").single();
      if (error || !data) throw new Error("Could not record reminder outcome.");
    },
  };
}
