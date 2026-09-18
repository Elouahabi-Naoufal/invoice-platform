"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveRegistration, rejectRegistration, deleteRegistration } from "@/server/admin-actions";

export default function RegistrationActions({ id, status }: { id: string; status: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        {status === "PENDING" && (
          <>
            <button onClick={() => run(() => approveRegistration(id))} disabled={busy} className="btn-primary btn-sm">Approve</button>
            <button onClick={() => run(() => rejectRegistration(id))} disabled={busy} className="btn-ghost btn-sm hover:text-red-700">Reject</button>
          </>
        )}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} disabled={busy} className="btn-ghost btn-sm text-ink-400 hover:text-red-700" title="Delete registration">Delete</button>
        ) : (
          <>
            <button onClick={() => run(() => deleteRegistration(id))} disabled={busy} className="btn-danger btn-sm">{busy ? "Deleting…" : "Confirm"}</button>
            <button onClick={() => setConfirmDelete(false)} disabled={busy} className="btn-ghost btn-sm">Cancel</button>
          </>
        )}
      </div>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}