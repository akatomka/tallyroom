export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  throw new Error("Email provider not configured.");
}
