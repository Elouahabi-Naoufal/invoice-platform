"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContract, deleteContract } from "@/server/contracts";
import { useToast } from "@/components/ui";
import { PAYMENT_TERM_OPTIONS } from "@/lib/options";

interface Client { id: string; name: string; companyName?: string | null }

export function ContractForm({ clients }: { clients: Client[] }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  async function submit(fd: FormData) {
    setErr("");
    const o = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    try {
      await createContract({
        clientId: o.clientId,
        title: o.title.trim(),
        valueMinor: Math.round(Number(o.value || 0) * 100),
        currency: o.currency || "MAD",
        periodDays: Number(o.periodDays || 30),
        taxRateBps: Math.round(Number(o.taxRate || 0) * 100),
        paymentTerms: o.paymentTerms || "D30",
        startDate: o.startDate ? new Date(o.startDate).toISOString() : new Date().toISOString(),
        endDate: o.endDate ? new Date(o.endDate).toISOString() : null,
        notes: o.notes || null,
      });
      toast({ kind: "ok", title: "Contract added" }); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }
  if (clients.length === 0) return <p className="meta">Add a client first.</p>;
  return (
    <form action={submit} className="grid gap-3 md:grid-cols-4">
      <div className="md:col-span-2"><label className="label">Title *</label><input name="title" required placeholder="e.g. Retainer 2026" className="input" /></div>
      <div className="md:col-span-2"><label className="label">Client *</label><select name="clientId" required className="input">{clients.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}</select></div>
      <div><label className="label">Contract value (HT)</label><input name="value" type="number" step="0.01" min={0} defaultValue={0} className="input" /></div>
      <div><label className="label">Currency</label><input name="currency" defaultValue="MAD" className="input" /></div>
      <div><label className="label">Period (days)</label><input name="periodDays" type="number" min={1} defaultValue={30} className="input" /></div>
      <div><label className="label">VAT %</label><input name="taxRate" type="number" step="0.01" min={0} defaultValue={20} className="input" /></div>
      <div><label className="label">Terms</label><select name="paymentTerms" className="input" defaultValue="D30">{PAYMENT_TERM_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
      <div><label className="label">Start</label><input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></div>
      <div><label className="label">End (optional)</label><input name="endDate" type="date" className="input" /></div>
      <div className="md:col-span-2"><label className="label">Notes</label><input name="notes" className="input" /></div>
      {err && <p className="field-err md:col-span-4">{err}</p>}
      <div className="md:col-span-4"><button className="btn-primary btn-sm">Add contract</button></div>
    </form>
  );
}

export function ContractDelete({ id }: { id: string }) {
  const r = useRouter(); const toast = useToast();
  return <button onClick={async () => { try { await deleteContract(id); toast({ kind: "ok", title: "Contract removed" }); r.refresh(); } catch { toast({ kind: "err", title: "Failed" }); } }} className="btn-ghost btn-sm hover:text-red-700">Remove</button>;
}
