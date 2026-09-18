"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { processNotifications } from "@/server/admin-ops";

export default function ProcessNotificationsButton() {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    setBusy(true); setMsg("");
    try {
      const res = await processNotifications();
      setMsg(`Processed ${res.processed} notification(s)`);
      r.refresh();
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally { setBusy(false); }
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={run} disabled={busy} className="btn-outline btn-sm">{busy ? "Processing…" : "Process pending now"}</button>
      {msg && <span className="text-[12px] text-ink-500">{msg}</span>}
    </div>
  );
}