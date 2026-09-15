"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { reconcileAvoir, removeReconciliation } from "@/server/reconciliations";
import { useToast } from "@/components/ui";

export function LettrageForm({ avoirs, invoices, onDone }: { avoirs: { id: string; invoiceNumber: string | null; totalTTC: number; currency: string }[]; invoices: { id: string; invoiceNumber: string | null }[]; onDone: () => void }) {
  const r = useRouter(); const toast = useToast(); const [err, setErr] = useState("");
  async function submit(fd: FormData) {
    const obj: Record<string, string> = {}; fd.forEach((v, k) => { obj[k] = String(v); });
    try {
      await reconcileAvoir("", { avoirId: obj.avoirId, invoiceId: obj.invoiceId, amountMinor: Math.round(Number(obj.amount) * 100) } as never);
      toast({ kind: "ok", title: "Lettrage created" }); onDone(); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }
  return (
    <form action={submit as never} className="flex flex-wrap gap-2 items-end">
      <div><label className="label">Avoir *</label>
        <select name="avoirId" required className="input min-w-[180px]">
          <option value="">— choose —</option>{avoirs.map((a) => <option key={a.id} value={a.id}>{a.invoiceNumber ?? a.id.slice(0, 8)} · {(a.totalTTC / 100).toFixed(2)} {a.currency}</option>)}
        </select>
      </div>
      <div><label className="label">Invoice *</label>
        <select name="invoiceId" required className="input min-w-[180px]">
          <option value="">— choose —</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber ?? i.id.slice(0, 8)}</option>)}
        </select>
      </div>
      <div><label className="label">Amount *</label><input name="amount" type="number" step="0.01" min={0.01} required placeholder="e.g. 1200.00" className="input w-[140px]" /></div>
      <button type="submit" className="btn-primary btn-sm">Lettrer</button>
      {err && <p className="field-err w-full">{err}</p>}
    </form>
  );
}

export function RemoveBtn({ id }: { id: string }) {
  const r = useRouter(); const toast = useToast();
  return <button onClick={async () => { await removeReconciliation(id); toast({ kind: "ok", title: "Removed" }); r.refresh(); }} className="text-xs text-red-600 hover:underline">Remove</button>;
}
