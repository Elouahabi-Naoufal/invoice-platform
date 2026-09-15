"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRecurringTemplate, toggleRecurringTemplate, generateInvoiceFromTemplate } from "@/server/recurring";
import { useToast } from "@/components/ui";

export function RecurringForm({ companies, clients, onDone }: { companies: { id: string; legalName: string }[]; clients: { id: string; name: string; companyName?: string | null }[]; onDone: () => void }) {
  const r = useRouter();
  const toast = useToast();
  const [lines, setLines] = useState([{ description: "", quantityMilli: 1000, unit: "piece", unitPriceMinor: 0, discountBps: 0, taxRateBps: 2000, taxExempt: false }]);
  const [err, setErr] = useState("");
  async function submit(fd: FormData) {
    setErr("");
    const obj: Record<string, string> = {};
    fd.forEach((v, k) => { obj[k] = String(v); });
    const data = {
      name: obj.name?.trim(),
      companyId: obj.companyId || undefined,
      clientId: obj.clientId || undefined,
      docType: obj.docType || "FACTURE",
      currency: obj.currency || "MAD",
      paymentTerms: obj.paymentTerms || "D30",
      periodDays: Number(obj.periodDays),
      startDate: new Date(obj.startDate).toISOString(),
      lines: lines.filter((l) => l.description.trim()).map((l) => ({ ...l, quantityMilli: Number(l.quantityMilli) || 1000, unitPriceMinor: Math.round(Number(l.unitPriceMinor) * 1) || 0 })),
    };
    if (!data.name || data.name.length < 2) { setErr("Name required"); return; }
    if (!data.lines.length) { setErr("Add at least one line with description"); return; }
    try {
      await createRecurringTemplate("", data as never);
      toast({ kind: "ok", title: "Recurring template created" });
      onDone(); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }
  return (
    <form action={submit as never} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Template name *</label><input name="name" required className="input" placeholder="e.g. Monthly retainer — Client X" /></div>
        <div><label className="label">Period (days) *</label><input name="periodDays" type="number" min={1} defaultValue={30} required className="input" /></div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="label">Seller company</label>
          <select name="companyId" className="input" defaultValue={companies[0]?.id ?? ""}>
            <option value="">— select —</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
          </select>
        </div>
        <div><label className="label">Client</label>
          <select name="clientId" className="input">
            <option value="">— select —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.companyName || c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div><label className="label">Doc type</label><select name="docType" className="input" defaultValue="FACTURE"><option value="FACTURE">Facture</option><option value="DEVIS">Devis</option></select></div>
        <div><label className="label">Currency</label><input name="currency" defaultValue="MAD" className="input" /></div>
        <div><label className="label">Payment terms</label><select name="paymentTerms" className="input" defaultValue="D30"><option value="ON_RECEIPT">On receipt</option><option value="D7">D7</option><option value="D15">D15</option><option value="D30">D30</option><option value="D60">D60</option></select></div>
        <div><label className="label">Start date *</label><input name="startDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></div>
      </div>
      <div className="card p-3">
        <p className="label mb-2">Lines (fill every column — no hardcoded products)</p>
        {lines.map((l, i) => (
          <div key={i} className="mb-2 grid grid-cols-[1fr_90px_90px_90px_70px_40px] gap-2">
            <input value={l.description} onChange={(e) => setLines((a) => a.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" className="input" />
            <input type="number" step="0.001" value={l.quantityMilli / 1000} onChange={(e) => setLines((a) => a.map((x, j) => j === i ? { ...x, quantityMilli: Math.round(Number(e.target.value) * 1000) } : x))} className="input" placeholder="Qty" />
            <input value={l.unit} onChange={(e) => setLines((a) => a.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} className="input" placeholder="Unit" />
            <input type="number" step="0.01" value={l.unitPriceMinor / 100} onChange={(e) => setLines((a) => a.map((x, j) => j === i ? { ...x, unitPriceMinor: Math.round(Number(e.target.value) * 100) } : x))} className="input" placeholder="Price HT" />
            <select value={l.taxRateBps} onChange={(e) => setLines((a) => a.map((x, j) => j === i ? { ...x, taxRateBps: Number(e.target.value), taxExempt: Number(e.target.value) === -1 } : x))} className="input"><option value={2000}>20%</option><option value={1000}>10%</option><option value={0}>0%</option><option value={-1}>Exo</option></select>
            <button type="button" onClick={() => setLines((a) => a.filter((_, j) => j !== i))} className="btn-ghost btn-sm">×</button>
          </div>
        ))}
        <button type="button" onClick={() => setLines((a) => [...a, { description: "", quantityMilli: 1000, unit: "piece", unitPriceMinor: 0, discountBps: 0, taxRateBps: 2000, taxExempt: false }])} className="btn-outline btn-sm">Add line</button>
      </div>
      {err && <p className="field-err">{err}</p>}
      <button type="submit" className="btn-primary w-fit">Create template</button>
    </form>
  );
}

export function RecurringActions({ id, active }: { id: string; active: boolean }) {
  const r = useRouter();
  const toast = useToast();
  return (
    <span className="flex gap-1">
      <button onClick={async () => { await toggleRecurringTemplate(id); toast({ kind: "ok", title: active ? "Paused" : "Activated" }); r.refresh(); }} className="btn-ghost btn-sm">{active ? "Pause" : "Activate"}</button>
      <button onClick={async () => { const inv = await generateInvoiceFromTemplate(id) as { id: string }; toast({ kind: "ok", title: "Invoice generated" }); r.push(`/invoices/${inv.id}`); }} className="btn-primary btn-sm">Generate now</button>
    </span>
  );
}
