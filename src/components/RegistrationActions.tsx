"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveRegistration, rejectRegistration } from "@/server/admin-actions";

export default function RegistrationActions({ id, adminId }: { id: string; adminId: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    try { await approveRegistration(id, adminId); r.refresh(); } catch { setBusy(false); }
  }
  async function reject() {
    setBusy(true);
    try { await rejectRegistration(id, adminId); r.refresh(); } catch { setBusy(false); }
  }
  return (
    <div className="flex gap-1">
      <button onClick={approve} disabled={busy} className="btn-primary btn-xs">Approve</button>
      <button onClick={reject} disabled={busy} className="btn-ghost btn-xs hover:text-red-700">Reject</button>
    </div>
  );
}