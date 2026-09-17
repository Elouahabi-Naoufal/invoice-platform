"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveTenant, rejectTenant } from "@/server/hub-admin";

export default function TenantActions({ id }: { id: string }) {
  const r = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  async function approve() {
    setBusy(true); setResult("");
    try {
      const res = await approveTenant(id, "admin");
      setResult(`Approved! Domain: ${res.domain}. Support key saved.`);
      r.refresh();
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally { setBusy(false); }
  }

  async function reject() {
    setBusy(true); setResult("");
    try {
      await rejectTenant(id, "admin");
      setResult("Rejected.");
      r.refresh();
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : "failed"}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button onClick={approve} disabled={busy} className="btn-primary btn-sm">{busy ? "Processing…" : "Approve & deploy"}</button>
      <button onClick={reject} disabled={busy} className="btn-ghost btn-sm hover:text-red-700">Reject</button>
      {result && <span className="text-sm text-ink-500">{result}</span>}
    </div>
  );
}