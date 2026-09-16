"use server";
import { requireWrite } from "@/server/auth";
import { runDueJobs } from "@/server/automation";

/** Manual "run automation now" from Settings → Automation. */
export async function runAutomationNow() {
  await requireWrite();
  return runDueJobs();
}
