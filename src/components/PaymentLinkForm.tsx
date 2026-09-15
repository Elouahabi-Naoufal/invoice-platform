"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPaymentLink } from "@/server/payment-links";
import { useToast } from "@/components/ui";

export function PaymentLinkForm({ invoices, onDone }: { invoices: { id: string; invoiceNumber: string | null; totalTTC: number; currency: string }[]; onDone?: () => void }) {
  const r = useRouter(); const toast = useToast(); const [err, setErr] = useState("");
  async function submit(fd: FormData) {
    const obj: Record<string, string> = {}; fd.forEach((v, k) => { obj[k] = String(v); });
    try {
      const link = await createPaymentLink("", { invoiceId: obj.invoiceId, amountMinor: obj.amount ? Math.round(Number(obj.amount) * 100) : undefined } as never) as { token: string };
      toast({ kind: "ok", title: `Payment link created — token ${link.token}` }); onDone?.(); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }
  return (
    <form action={submit as never} className="flex flex-wrap gap-2 items-end">
      <div><label className="label">Invoice * (must be ISSUED)</label>
        <select name="invoiceId" required className="input min-w-[220px]">
          <option value="">— choose —</option>
          {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber ?? inv.id.slice(0, 8)} · {(inv.totalTTC / 100).toFixed(2)} {inv.currency}</option>)}
        </select>
      </div>
      <div><label className="label">Amount override (optional)</label><input name="amount" type="number" step="0.01" min={0} placeholder="Leave empty = full TTC" className="input w-[180px]" /></div>
      <button type="submit" className="btn-primary btn-sm">Create link</button>
      {err && <p className="field-err w-full">{err}</p>}
    </form>
  );
}
