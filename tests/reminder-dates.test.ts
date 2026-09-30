import { describe, expect, it } from "vitest";
import { isEligible, overdueCutoff } from "../lib/reminders/dates";

describe("overdue reminder dates", () => {
  it("excludes exactly seven days overdue and includes eight days", () => {
    const cutoff = overdueCutoff(new Date("2026-09-30T10:00:00Z"));
    expect(cutoff).toBe("2026-09-23");
    expect(isEligible("outstanding", "2026-09-23", cutoff)).toBe(false);
    expect(isEligible("outstanding", "2026-09-22", cutoff)).toBe(true);
    expect(isEligible("outstanding", "2026-10-01", cutoff)).toBe(false);
    expect(isEligible("received", "2026-09-01", cutoff)).toBe(false);
  });

  it("uses the London calendar day when BST is ahead of UTC", () => {
    expect(overdueCutoff(new Date("2026-09-29T23:30:00Z"))).toBe("2026-09-23");
  });

  it("handles month boundaries and winter time", () => {
    expect(overdueCutoff(new Date("2026-01-03T23:30:00Z"))).toBe("2025-12-27");
  });
});
