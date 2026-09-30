import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { createEmailSender } from "../lib/email";
import { reminderEmail } from "../lib/reminders/run";

// Explicit, manual network smoke test. Ethereal captures mail and never forwards it.
// Uses synthetic data only; does not load .env.local or touch Supabase.
const timeout = setTimeout(() => {
  console.error("SMTP sandbox check timed out. Live delivery remains unverified.");
  process.exit(1);
}, 60_000);

async function main() {
  const account = await nodemailer.createTestAccount();
  if (account.smtp.host !== "smtp.ethereal.email") throw new Error("Unexpected sandbox SMTP host.");
  await mkdir(".reminder-previews", { recursive: true });
  await writeFile(".reminder-previews/ethereal-account.json", JSON.stringify({
    note: "Temporary test mailbox only; never commit or show credentials in your video.",
    login: "https://ethereal.email/login", user: account.user, password: account.pass,
  }, null, 2));
  const send = createEmailSender({
    SMTP_HOST: account.smtp.host, SMTP_PORT: String(account.smtp.port),
    SMTP_USER: account.user, SMTP_PASSWORD: account.pass, EMAIL_FROM: account.user,
  });
  const due = new Date();
  due.setUTCDate(due.getUTCDate() - 10);
  await send(reminderEmail({
    id: "smtp-demo", name: "DEMO receipt (synthetic test data)",
    status: "outstanding", due_date: due.toISOString().slice(0, 10),
    client: { name: "Demo Business", user_id: "smtp-demo" },
  }, account.user));
  console.log("PASS: the application's SMTP adapter submitted a synthetic reminder to Ethereal over TLS.");
  console.log("Ethereal captures messages; this is NOT delivery to a real client inbox.");
  console.log("Mailbox login details are in .reminder-previews/ethereal-account.json (Git-ignored).");
}

main().catch(() => {
  console.error("SMTP sandbox verification failed. Do not claim successful SMTP delivery.");
  process.exitCode = 1;
}).finally(() => clearTimeout(timeout));
