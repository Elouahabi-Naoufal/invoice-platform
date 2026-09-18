import { NextResponse } from "next/server";
import { runDueJobs } from "@/server/automation";
import { advanceProvisioningJobs } from "@/server/provisioning";
import { sendPendingNotifications } from "@/server/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const url = new URL(req.url);
  return auth === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

/** External trigger for recurring generation + reminders (redundant with the in-process scheduler). */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueJobs();
  const provisioning = await advanceProvisioningJobs().catch((e) => ({ error: String(e) }));
  const notifications = await sendPendingNotifications().catch((e) => ({ error: String(e) }));
  return NextResponse.json({ ...result, provisioning, notifications });
}

export const POST = GET;
