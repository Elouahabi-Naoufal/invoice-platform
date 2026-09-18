"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resendNotification } from "@/server/admin-ops";

export default function NotificationRetryButton({ id }: { id: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    try { await resendNotification(id); r.refresh(); } catch { setBusy(false); }
  }
  return <button onClick={retry} disabled={busy} className="btn-ghost btn-sm">{busy ? "…" : "Retry"}</button>;
}