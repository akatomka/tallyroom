import nodemailer from "nodemailer";

export type Email = { to: string; subject: string; body: string };

export function createEmailSender(env: Record<string, string | undefined> = process.env) {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM"];
  for (const name of required) {
    if (!env[name]?.trim()) throw new Error(`Missing ${name}; live email is not configured.`);
  }
  const port = Number(env.SMTP_PORT);
  if (port !== 465 && port !== 587) throw new Error("SMTP_PORT must be 465 or 587.");
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return async (email: Email): Promise<void> => {
    if (!isDeliverableAddress(email.to)) throw new Error("A real recipient email address is required.");
    const result = await transport.sendMail({
      from: env.EMAIL_FROM, to: email.to, subject: email.subject, text: email.body,
    });
    if (!result.accepted.length || result.rejected.length) {
      throw new Error("SMTP server did not accept the recipient.");
    }
  };
}

export function isDeliverableAddress(address: string): boolean {
  return /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(address)
    && !/\.(test|invalid|localhost)$/i.test(address);
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  await createEmailSender()({ to, subject, body });
}
