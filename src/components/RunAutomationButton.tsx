"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { runAutomationNow } from "@/server/settings-actions";
import { useToast } from "@/components/ui";

export default function RunAutomationButton() {
  const r = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const result = (await runAutomationNow()) as {
        reminders: { processed: number; sent: number; failed: number };
        recurring: { processed: number; generated: number; sent: number; failed: number };
      };
      toast({
        kind: "ok",
        title: "Automation run complete",
        body: `Reminders: ${result.reminders.sent}/${result.reminders.processed} sent · Recurring: ${result.recurring.generated} generated, ${result.recurring.sent} sent`,
      });
      r.refresh();
    } catch (e) {
      toast({ kind: "err", title: "Run failed", body: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button disabled={busy} onClick={run} className="btn-outline btn-sm">
      {busy ? "Running…" : "Run automation now"}
    </button>
  );
}
