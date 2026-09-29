// Due dates are calendar dates. Use the firm's London date, including BST.
export function overdueCutoff(now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

export function isEligible(status: string, dueDate: string, cutoff: string): boolean {
  return status === "outstanding" && dueDate < cutoff;
}
