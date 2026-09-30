import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "../lib/reminders/auth";
import { createEmailSender } from "../lib/email";

describe("reminder configuration", () => {
  it("requires a configured secret and the matching bearer token", () => {
    expect(isCronAuthorized(null, "secret")).toBe(false);
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer wrong!", "secret")).toBe(false);
    expect(isCronAuthorized("secret", "secret")).toBe(false);
    expect(isCronAuthorized("Bearer secret", "secret")).toBe(true);
  });

  it("fails before sending when SMTP is not configured", () => {
    expect(() => createEmailSender({})).toThrow("Missing SMTP_HOST");
  });

  it("rejects unsupported SMTP ports", () => {
    expect(() => createEmailSender({
      SMTP_HOST: "smtp.example.com", SMTP_PORT: "25", SMTP_USER: "user",
      SMTP_PASSWORD: "password", EMAIL_FROM: "firm@example.com",
    })).toThrow("SMTP_PORT must be 465 or 587");
  });
});
