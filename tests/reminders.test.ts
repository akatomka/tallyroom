import { describe, expect, it, vi } from "vitest";
import { runReminders, type ReminderDocument, type ReminderStore } from "../lib/reminders/run";

const now = new Date("2026-09-30T10:00:00Z");
const document: ReminderDocument = {
  id: "doc-1", name: "Bank statement", status: "outstanding", due_date: "2026-09-20",
  client: { name: "Test Business", user_id: "user-1" },
};

function fixture(documents = [document]) {
  const states = new Map<string, string>();
  const store: ReminderStore = {
    candidates: vi.fn(async () => documents),
    emailForUser: vi.fn(async () => "client@example.com"),
    claim: vi.fn(async (id) => {
      if (states.has(id)) return null;
      states.set(id, "processing");
      return id;
    }),
    complete: vi.fn(async (id, state) => { states.set(id, state); }),
  };
  const deliver = vi.fn(async () => undefined);
  return { store, states, deliver };
}

describe("reminder delivery", () => {
  it("sends once across repeated and overlapping runs", async () => {
    const f = fixture();
    const options = { ...f, now, preview: false };
    await Promise.all([runReminders(options), runReminders(options)]);
    await runReminders(options);
    expect(f.deliver).toHaveBeenCalledTimes(1);
    expect(f.states.get(document.id)).toBe("sent");
    expect(f.deliver.mock.calls[0]).toEqual([expect.objectContaining({
      to: "client@example.com", body: expect.stringContaining("Bank statement"),
    })]);
  });

  it("previews without reserving or marking messages sent", async () => {
    const f = fixture();
    const result = await runReminders({ ...f, now, preview: true });
    expect(result).toEqual({ sent: 0, previewed: 1, skipped: 0, failed: 0 });
    expect(f.store.claim).not.toHaveBeenCalled();
    expect(f.store.complete).not.toHaveBeenCalled();
  });

  it("does not send received documents or documents exactly seven days overdue", async () => {
    const f = fixture([
      { ...document, status: "received" },
      { ...document, id: "doc-2", due_date: "2026-09-23" },
    ]);
    const result = await runReminders({ ...f, now, preview: false });
    expect(result.skipped).toBe(2);
    expect(f.deliver).not.toHaveBeenCalled();
  });

  it("does not send when the database no longer considers the document eligible", async () => {
    const f = fixture();
    vi.mocked(f.store.claim).mockResolvedValue(null);
    const result = await runReminders({ ...f, now, preview: false });
    expect(result.skipped).toBe(1);
    expect(f.deliver).not.toHaveBeenCalled();
  });

  it("records uncertain sends for review, continues other documents, and avoids automatic retries", async () => {
    const f = fixture([document, { ...document, id: "doc-2" }]);
    f.deliver.mockRejectedValueOnce(new Error("SMTP timeout"));
    const result = await runReminders({ ...f, now, preview: false });
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(1);
    expect(f.states.get("doc-1")).toBe("needs_review");
    await runReminders({ ...f, now, preview: false });
    expect(f.deliver).toHaveBeenCalledTimes(2);
  });

  it("keeps the reservation if recording an accepted message fails", async () => {
    const f = fixture();
    vi.mocked(f.store.complete).mockRejectedValue(new Error("Database unavailable"));
    const result = await runReminders({ ...f, now, preview: false });
    expect(result.failed).toBe(1);
    expect(f.states.get(document.id)).toBe("processing");
    await runReminders({ ...f, now, preview: false });
    expect(f.deliver).toHaveBeenCalledTimes(1);
  });

  it("rejects test recipients before reserving a live reminder", async () => {
    const f = fixture();
    vi.mocked(f.store.emailForUser).mockResolvedValue("alex@tallyroom.test");
    const result = await runReminders({ ...f, now, preview: false });
    expect(result.failed).toBe(1);
    expect(f.store.claim).not.toHaveBeenCalled();
    expect(f.deliver).not.toHaveBeenCalled();
  });

  it("reports missing recipient details without consuming the reminder", async () => {
    const f = fixture();
    vi.mocked(f.store.emailForUser).mockResolvedValue("");
    expect((await runReminders({ ...f, now, preview: false })).failed).toBe(1);
    expect(f.store.claim).not.toHaveBeenCalled();
  });
});
