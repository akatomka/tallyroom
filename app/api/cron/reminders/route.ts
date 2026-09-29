import { NextResponse } from "next/server";
import { createEmailSender } from "@/lib/email";
import { isCronAuthorized } from "@/lib/reminders/auth";
import { runReminders } from "@/lib/reminders/run";
import { createReminderStore } from "@/lib/reminders/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.REMINDERS_ENABLED !== "true") {
    return NextResponse.json({ status: "disabled" });
  }
  try {
    const result = await runReminders({
      store: createReminderStore(), preview: false, deliver: createEmailSender(),
      onError: (id) => console.error(`Reminder failed for document ${id}; inspect its attempt record.`),
    });
    return NextResponse.json(result, { status: result.failed ? 500 : 200 });
  } catch {
    console.error("Reminder run failed; check server configuration and database connectivity.");
    return NextResponse.json({ error: "Reminder run failed" }, { status: 500 });
  }
}
