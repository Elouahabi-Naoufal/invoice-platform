"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExpense, deleteExpense, invoiceFromBillableExpenses } from "@/server/expenses";
import { useToast } from "@/components/ui";

interface Rate { id: string; name: string; percentBps: number; kind: string; fixedMinor: number }

export function ExpenseForm({ rates }: { rates: Rate[] }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");

  async function submit(fd: FormData) {
    setErr("");
    const obj = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    const rateIds = fd.getAll("rateIds").map(String);
    try {
      await createExpense({
        supplier: obj.supplier || null,
        category: obj.category || null,
        description: obj.description.trim(),
        date: obj.date ? new Date(obj.date).toISOString() : new Date().toISOString(),
        amountHTMinor: Math.round(Number(obj.amount || 0) * 100),
        taxRateBps: Math.round(Number(obj.taxRate || 0) * 100),
        taxExempt: obj.taxExempt === "on",
        rateIds,
        currency: obj.currency || "MAD",
        paymentMethod: obj.paymentMethod,
        reference: obj.reference || null,
        billable: obj.billable === "on",
        notes: obj.notes || null,
      });
      toast({ kind: "ok", title: "Expense recorded" });
      r.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed";
      setErr(m);
      toast({ kind: "err", title: m });
    }
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-3">
      <div className="md:col-span-2"><label className="label">Description *</label><input name="description" required placeholder="e.g. Office rent — March" className="input" /></div>
      <div><label className="label">Date</label><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></div>
      <div><label className="label">Supplier</label><input name="supplier" className="input" /></div>
      <div><label className="label">Category</label><input name="category" placeholder="Rent, Utilities…" className="input" /></div>
      <div><label className="label">Amount HT *</label><input name="amount" type="number" step="0.01" min={0} required defaultValue={0} className="input" /></div>
      <div><label className="label">VAT %</label><input name="taxRate" type="number" step="0.01" min={0} defaultValue={20} className="input" /></div>
      <div><label className="label">Payment</label><select name="paymentMethod" className="input" defaultValue="BANK_TRANSFER"><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="CHECK">Check</option><option value="OTHER">Other</option></select></div>
      <div><label className="label">Currency</label><input name="currency" defaultValue="MAD" className="input" /></div>
      <div><label className="label">Reference</label><input name="reference" className="input" /></div>
      <div className="flex items-end gap-4">
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="taxExempt" /> VAT exempt</label>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="billable" /> Billable</label>
      </div>
      {rates.length > 0 && (
        <div className="md:col-span-3">
          <label className="label">Add-on charges (optional)</label>
          <div className="flex flex-wrap gap-3">
            {rates.map((x) => (
              <label key={x.id} className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" name="rateIds" value={x.id} />
                {x.name} <span className="meta">{x.kind === "PERCENT" ? `${x.percentBps / 100}%` : ""}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="md:col-span-3"><label className="label">Notes</label><input name="notes" className="input" /></div>
      {err && <p className="field-err md:col-span-3">{err}</p>}
      <div className="md:col-span-3"><button className="btn-primary btn-sm">Record expense</button></div>
    </form>
  );
}

export function ExpenseRowDelete({ id }: { id: string }) {
  const r = useRouter();
  const toast = useToast();
  return (
    <button
      onClick={async () => {
        try {
          await deleteExpense(id);
          toast({ kind: "ok", title: "Expense deleted" });
          r.refresh();
        } catch {
          toast({ kind: "err", title: "Delete failed" });
        }
      }}
      className="btn-ghost btn-sm hover:text-red-700"
    >
      Delete
    </button>
  );
}

export function InvoiceFromBillable() {
  const r = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await invoiceFromBillableExpenses() as { count: number; invoiceIds: string[] };
          toast({ kind: "ok", title: "Draft invoice created", body: `${res.count} invoice(s) from billable expenses` });
          if (res.invoiceIds[0]) r.push(`/invoices/${res.invoiceIds[0]}`);
          else r.refresh();
        } catch (e) {
          toast({ kind: "err", title: "Failed", body: e instanceof Error ? e.message : undefined });
        } finally {
          setBusy(false);
        }
      }}
      className="btn-outline btn-sm"
    >
      {busy ? "Creating…" : "Invoice billable expenses"}
    </button>
  );
}
