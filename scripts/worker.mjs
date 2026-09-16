#!/usr/bin/env node
/**
 * Background worker: periodically triggers the in-app automation endpoint
 * (recurring invoice generation + due reminders). Runs as a separate process
 * so it never has to be bundled into the Next.js build.
 *
 * Requires CRON_SECRET. Disable with SCHEDULER_ENABLED=false.
 */
const port = process.env.PORT || "3007";
const url = process.env.CRON_URL || `http://127.0.0.1:${port}/api/cron`;
const secret = process.env.CRON_SECRET;
const intervalMs = Math.max(60000, Number(process.env.SCHEDULER_INTERVAL_MS || 300000));

if (process.env.SCHEDULER_ENABLED === "false") {
  console.log("[worker] disabled (SCHEDULER_ENABLED=false)");
  process.exit(0);
}
if (!secret) {
  console.log("[worker] CRON_SECRET not set — automation worker disabled");
  process.exit(0);
}

async function tick() {
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${secret}` } });
    const text = await res.text();
    console.log(`[worker] ${res.status} ${text}`);
  } catch (e) {
    console.error(`[worker] ${e instanceof Error ? e.message : e}`);
  }
}

setTimeout(tick, 20000);
setInterval(tick, intervalMs);
console.log(`[worker] started interval=${intervalMs}ms url=${url}`);
