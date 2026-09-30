import type { Email } from "../email";
import { isDeliverableAddress } from "../email";
import { isEligible, overdueCutoff } from "./dates";

export type ReminderDocument = {
  id: string; name: string; status: string; due_date: string;
  client: { name: string; user_id: string };
};

export interface ReminderStore {
  candidates(cutoff: string): Promise<ReminderDocument[]>;
  emailForUser(userId: string): Promise<string>;
  claim(documentId: string): Promise<string | null>;
  complete(attemptId: string, state: "sent" | "needs_review"): Promise<void>;
}

export function reminderEmail(document: ReminderDocument, to: string): Email {
  return {
    to,
    subject: `Tallyroom: overdue document reminder`,
    body: `Hello ${document.client.name},\n\nWe are still waiting for ${document.name}, due on ${document.due_date}. It is now more than a week overdue.\n\nPlease sign in to Tallyroom to review your outstanding documents and send the document to the firm using your usual method. If you have already sent it, please contact the firm so we can update our records.\n\nThank you,\nThe Tallyroom team`,
  };
}

export async function runReminders(options: {
  store: ReminderStore;
  preview: boolean;
  deliver: (email: Email) => Promise<void>;
  now?: Date;
  onError?: (documentId: string) => void;
}) {
  const { store, preview, deliver } = options;
  const cutoff = overdueCutoff(options.now);
  const result = { sent: 0, previewed: 0, skipped: 0, failed: 0 };
  const documents = await store.candidates(cutoff);
  for (const document of documents) {
    if (!isEligible(document.status, document.due_date, cutoff)) {
      result.skipped++;
      continue;
    }
    let attemptId: string | null = null;
    try {
      const to = await store.emailForUser(document.client.user_id);
      if (!to) throw new Error("Client has no email address.");
      const email = reminderEmail(document, to);
      if (preview) {
        await deliver(email);
        result.previewed++;
        continue;
      }
      if (!isDeliverableAddress(to)) throw new Error("Client requires a deliverable email address.");
      // The database atomically rechecks eligibility and reserves one send per document.
      attemptId = await store.claim(document.id);
      if (!attemptId) {
        result.skipped++;
        continue;
      }
      await deliver(email);
      await store.complete(attemptId, "sent");
      result.sent++;
    } catch {
      if (attemptId) {
        // SMTP can time out after accepting mail. Never automatically resend an uncertain attempt.
        // If this update fails, the original processing row still prevents duplicate sends.
        await store.complete(attemptId, "needs_review").catch(() => undefined);
      }
      result.failed++;
      options.onError?.(document.id);
    }
  }
  return result;
}
