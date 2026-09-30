import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createEmailSender } from "../lib/email";
import { createReminderStore } from "../lib/reminders/store";
import { runReminders } from "../lib/reminders/run";

config({ path: ".env.local" });

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--send")) throw new Error("Usage: npm run reminders:preview OR npm run reminders:send");
  const preview = !args.includes("--send");
  if (!preview && process.env.REMINDERS_ENABLED !== "true") {
    throw new Error("Set REMINDERS_ENABLED=true after configuring and reviewing live delivery.");
  }
  const deliver = preview ? async (email: { to: string; subject: string; body: string }) => {
    await mkdir(".reminder-previews", { recursive: true });
    await writeFile(`.reminder-previews/${randomUUID()}.txt`,
      `PREVIEW ONLY - NOT SENT\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.body}\n`);
  } : createEmailSender();
  const result = await runReminders({
    store: createReminderStore(), preview, deliver,
    onError: (id) => console.error(`Reminder failed for document ${id}; review configuration and attempt state.`),
  });
  console.log(preview ? "Preview only; no emails sent or database records changed." : "Live reminder run complete; sent means SMTP accepted, not confirmed inbox delivery.");
  console.log(result);
  if (preview && result.previewed) console.log("Open .reminder-previews/ to inspect the email text.");
  if (result.failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Reminder run failed.");
  process.exitCode = 1;
});
