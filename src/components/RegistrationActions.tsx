"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveRegistration, rejectRegistration } from "@/server/admin-actions";

export default function RegistrationActions({ id }: { id: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setErr("");
    try {
      await fn();
      r.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <button onClick={() => run(() => approveRegistration(id))} disabled={busy} className="btn-primary btn-xs">Approve</button>
        <button onClick={() => run(() => rejectRegistration(id))} disabled={busy} className="btn-ghost btn-xs hover:text-red-700">Reject</button>
      </div>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}