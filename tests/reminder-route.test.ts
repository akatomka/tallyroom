import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sender: vi.fn(), store: vi.fn(), run: vi.fn() }));
vi.mock("@/lib/email", () => ({ createEmailSender: mocks.sender }));
vi.mock("@/lib/reminders/store", () => ({ createReminderStore: mocks.store }));
vi.mock("@/lib/reminders/run", () => ({ runReminders: mocks.run }));
import { GET } from "../app/api/cron/reminders/route";

const request = (token?: string) => new Request("http://localhost/api/cron/reminders", {
  headers: token ? { authorization: `Bearer ${token}` } : {},
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.stubEnv("REMINDERS_ENABLED", "false");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("scheduled reminder endpoint", () => {
  it("rejects absent, wrong and unconfigured credentials before any database or SMTP work", async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("wrong"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("test-secret"))).status).toBe(401);
    expect(mocks.sender).not.toHaveBeenCalled();
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it("returns disabled for an authorised request without creating a sender", async () => {
    const response = await GET(request("test-secret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "disabled" });
    expect(mocks.sender).not.toHaveBeenCalled();
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("runs the worker only when authorised and explicitly enabled", async () => {
    vi.stubEnv("REMINDERS_ENABLED", "true");
    mocks.run.mockResolvedValue({ sent: 1, previewed: 0, skipped: 0, failed: 0 });
    const response = await GET(request("test-secret"));
    expect(response.status).toBe(200);
    expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({ preview: false }));
  });
  it("reports partial delivery failure with a failing HTTP status", async () => {
    vi.stubEnv("REMINDERS_ENABLED", "true");
    mocks.run.mockResolvedValue({ sent: 1, previewed: 0, skipped: 0, failed: 1 });
    expect((await GET(request("test-secret"))).status).toBe(500);
  });
  it("does not expose provider configuration in error responses", async () => {
    vi.stubEnv("REMINDERS_ENABLED", "true");
    mocks.sender.mockImplementation(() => { throw new Error("private provider details"); });
    const response = await GET(request("test-secret"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private provider details");
  });
});
