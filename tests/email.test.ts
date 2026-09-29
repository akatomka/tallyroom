import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMail, createTransport } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) };
});
vi.mock("nodemailer", () => ({ default: { createTransport } }));

import { createEmailSender } from "../lib/email";

const config = {
  SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "user",
  SMTP_PASSWORD: "password", EMAIL_FROM: "firm@example.com",
};
const email = { to: "client@example.com", subject: "Reminder", body: "Please send your receipt." };

beforeEach(() => {
  vi.clearAllMocks();
  sendMail.mockResolvedValue({ accepted: [email.to], rejected: [] });
});

describe("SMTP adapter", () => {
  it("requires STARTTLS on port 587 and sends plain text to the intended recipient", async () => {
    await createEmailSender(config)(email);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      port: 587, secure: false, requireTLS: true,
    }));
    expect(sendMail).toHaveBeenCalledWith({
      from: config.EMAIL_FROM, to: email.to, subject: email.subject, text: email.body,
    });
  });

  it("uses immediate TLS on port 465", async () => {
    await createEmailSender({ ...config, SMTP_PORT: "465" })(email);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 465, secure: true }));
  });

  it("does not report success for a rejected recipient", async () => {
    sendMail.mockResolvedValue({ accepted: [], rejected: [email.to] });
    await expect(createEmailSender(config)(email)).rejects.toThrow("did not accept");
  });

  it("does not send seeded test addresses", async () => {
    await expect(createEmailSender(config)({ ...email, to: "alex@tallyroom.test" }))
      .rejects.toThrow("real recipient");
    expect(sendMail).not.toHaveBeenCalled();
  });
});
