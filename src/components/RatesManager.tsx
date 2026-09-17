"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRate, archiveRate, updateRate } from "@/server/rates";
import { useToast, EmptyState, PageHeader } from "@/components/ui";
import { applyRate } from "@/domain/charges";
import { formatMoney } from "@/domain/invoice";

interface Rate {
  id: string; name: string; kind: string; percentBps: number; fixedMinor: number;
  capMinor: number | null; appliesTo: string; notes: string | null;
}

const APPLIES: Record<string, string> = { ANY: "Any", EMPLOYER: "Payroll — employer", EMPLOYEE: "Payroll — employee", EXPENSE: "Expense add-on" };

export default function RatesManager({ rates }: { rates: Rate[] }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = rates.find((x) => x.id === editingId) ?? null;
  const [calcRateId, setCalcRateId] = useState(rates[0]?.id ?? "");
  const [base, setBase] = useState(0);
  const selected = rates.find((x) => x.id === calcRateId);
  const calcAmount = selected ? applyRate(selected, Math.round(base * 100)) : 0;

  async function submit(fd: FormData) {
    setErr("");
    const obj = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    try {
      const payload = {
        name: obj.name.trim(),
        kind: obj.kind,
        percentBps: Math.round(Number(obj.percent || 0) * 100),
        fixedMinor: Math.round(Number(obj.fixed || 0) * 100),
        capMinor: obj.cap ? Math.round(Number(obj.cap) * 100) : null,
        appliesTo: obj.appliesTo,
        notes: obj.notes || null,
      };
      if (editingId) await updateRate(editingId, payload);
      else await createRate(payload);
      toast({ kind: "ok", title: editingId ? "Rate updated" : "Rate added" });
      setEditingId(null);
      r.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Failed";
      setErr(m);
      toast({ kind: "err", title: m });
    }
  }

  async function remove(id: string) {
    try {
      await archiveRate(id);
      toast({ kind: "ok", title: "Rate removed" });
      r.refresh();
    } catch {
      toast({ kind: "err", title: "Remove failed" });
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Rates & charges" description="Define any rate yourself — no country assumptions. Use them in payroll, on expenses, or in the calculator." />

      <div className="card p-5">
        <h2 className="section-title mb-3">{editing ? `Edit “${editing.name}”` : "Add a rate"}</h2>
        <form key={editingId ?? "new"} action={submit} className="grid gap-3 md:grid-cols-2">
          <div><label className="label">Name *</label><input name="name" required defaultValue={editing?.name ?? ""} placeholder="e.g. CNSS employer, Insurance…" className="input" /></div>
          <div><label className="label">Type</label><select name="kind" className="input" defaultValue={editing?.kind ?? "PERCENT"}><option value="PERCENT">Percentage</option><option value="FIXED">Fixed amount</option></select></div>
          <div><label className="label">Percent (%)</label><input name="percent" type="number" step="0.01" min={0} defaultValue={editing ? editing.percentBps / 100 : 0} className="input" /></div>
          <div><label className="label">Fixed amount</label><input name="fixed" type="number" step="0.01" min={0} defaultValue={editing ? editing.fixedMinor / 100 : 0} className="input" /></div>
          <div><label className="label">Cap (optional)</label><input name="cap" type="number" step="0.01" min={0} defaultValue={editing?.capMinor ? editing.capMinor / 100 : ""} className="input" /></div>
          <div><label className="label">Applies to</label><select name="appliesTo" className="input" defaultValue={editing?.appliesTo ?? "ANY"}>{Object.entries(APPLIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="md:col-span-2"><label className="label">Notes</label><input name="notes" defaultValue={editing?.notes ?? ""} className="input" /></div>
          {err && <p className="field-err md:col-span-2">{err}</p>}
          <div className="flex gap-2 md:col-span-2">
            <button className="btn-primary btn-sm">{editing ? "Save changes" : "Add rate"}</button>
            {editing && <button type="button" onClick={() => setEditingId(null)} className="btn-ghost btn-sm">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-3">Calculator</h2>
        <div className="grid items-end gap-3 sm:grid-cols-3">
          <div><label className="label">Rate</label><select value={calcRateId} onChange={(e) => setCalcRateId(e.target.value)} className="input">{rates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div><label className="label">Base amount</label><input type="number" step="0.01" value={base} onChange={(e) => setBase(Number(e.target.value))} className="input" /></div>
          <div><label className="label">Charge</label><div className="input bg-ink-50 tabular-nums dark:bg-white/5">{selected ? formatMoney(calcAmount, "MAD") : "—"}</div></div>
        </div>
        {rates.length === 0 && <p className="meta mt-3">Add a rate first.</p>}
      </div>

      {rates.length === 0 ? (
        <EmptyState title="No rates yet" body="Add percentages or fixed charges you use (social contributions, insurance, taxes). They are fully user-defined." />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Value</th><th>Cap</th><th>Applies to</th><th></th></tr></thead>
            <tbody>
              {rates.map((x) => (
                <tr key={x.id}>
                  <td className="font-medium">{x.name}{x.notes ? <span className="meta block">{x.notes}</span> : null}</td>
                  <td>{x.kind === "PERCENT" ? `${x.percentBps / 100}%` : formatMoney(x.fixedMinor, "MAD")}</td>
                  <td className="text-ink-500">{x.capMinor ? formatMoney(x.capMinor, "MAD") : "—"}</td>
                  <td className="text-ink-500">{APPLIES[x.appliesTo] ?? x.appliesTo}</td>
                  <td className="text-right">
                    <button onClick={() => setEditingId(x.id)} className="btn-ghost btn-sm">Edit</button>
                    <button onClick={() => remove(x.id)} className="btn-ghost btn-sm hover:text-red-700">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
