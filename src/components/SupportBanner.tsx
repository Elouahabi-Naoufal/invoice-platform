"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SupportBanner() {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  async function end() {
    setBusy(true);
    try {
      await fetch("/api/support-login", { method: "DELETE" });
      r.push("/login");
      r.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2 text-[13px] font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200">
      <span>Support session — read-only access. Actions are disabled.</span>
      <button onClick={end} disabled={busy} className="rounded border border-amber-300 px-2 py-0.5 text-[12px] hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40">
        {busy ? "Ending…" : "End session"}
      </button>
    </div>
  );
}