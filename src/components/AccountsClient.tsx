"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount, createEntry, deleteAccount, deleteEntry } from "@/server/ledger";
import { useToast } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

interface Account { id: string; name: string; kind: string; currency: string; balanceMinor: number }
interface Entry { id: string; date: string | Date; direction: string; amountMinor: number; currency: string; label: string; category: string | null; account: { name: string } }

export default function AccountsClient({ accounts, entries }: { accounts: Account[]; entries: Entry[] }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");

  async function addAccount(fd: FormData) {
    setErr("");
    const o = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    try {
      await createAccount({ name: o.name.trim(), kind: o.kind, currency: o.currency || "MAD", openingBalanceMinor: Math.round(Number(o.opening || 0) * 100) });
      toast({ kind: "ok", title: "Account added" }); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }

  async function addEntry(fd: FormData) {
    setErr("");
    const o = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
    try {
      await createEntry({ accountId: o.accountId, direction: o.direction, amountMinor: Math.round(Number(o.amount || 0) * 100), label: o.label.trim(), category: o.category || null, date: o.date ? new Date(o.date).toISOString() : new Date().toISOString() });
      toast({ kind: "ok", title: "Entry recorded" }); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: m }); }
  }

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <h2 className="section-title mb-3">Add an account</h2>
        <form action={addAccount} className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><label className="label">Name *</label><input name="name" required placeholder="e.g. Company bank, Cash" className="input" /></div>
          <div><label className="label">Kind</label><select name="kind" className="input" defaultValue="BANK"><option value="BANK">Bank</option><option value="CASH">Cash</option></select></div>
          <div><label className="label">Opening balance</label><input name="opening" type="number" step="0.01" defaultValue={0} className="input" /></div>
          <div><label className="label">Currency</label><input name="currency" defaultValue="MAD" className="input" /></div>
          <div className="md:col-span-4"><button className="btn-primary btn-sm">Add account</button></div>
        </form>
      </div>

      {accounts.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-3">Record money in / out</h2>
          <form action={addEntry} className="grid gap-3 md:grid-cols-4">
            <div><label className="label">Account</label><select name="accountId" className="input">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            <div><label className="label">Direction</label><select name="direction" className="input" defaultValue="IN"><option value="IN">Money in</option><option value="OUT">Money out</option></select></div>
            <div><label className="label">Amount *</label><input name="amount" type="number" step="0.01" min={0.01} required className="input" /></div>
            <div><label className="label">Date</label><input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" /></div>
            <div className="md:col-span-2"><label className="label">Label *</label><input name="label" required placeholder="e.g. Client payment, Rent" className="input" /></div>
            <div><label className="label">Category</label><input name="category" className="input" /></div>
            <div className="md:col-span-1 flex items-end"><button className="btn-primary btn-sm w-full">Record entry</button></div>
          </form>
        </div>
      )}

      {err && <p className="field-err">{err}</p>}

      {accounts.length > 0 && (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Label</th><th>Account</th><th className="num">In</th><th className="num">Out</th><th></th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="tabular-nums text-ink-500">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="font-medium">{e.label}{e.category ? <span className="meta block">{e.category}</span> : null}</td>
                  <td className="text-ink-500">{e.account.name}</td>
                  <td className="num tabular-nums text-success-600">{e.direction === "IN" ? formatMoney(e.amountMinor, e.currency) : "—"}</td>
                  <td className="num tabular-nums text-error-600">{e.direction === "OUT" ? formatMoney(e.amountMinor, e.currency) : "—"}</td>
                  <td className="text-right">
                    <button onClick={async () => { try { await deleteEntry(e.id); toast({ kind: "ok", title: "Entry deleted" }); r.refresh(); } catch { toast({ kind: "err", title: "Failed" }); } }} className="btn-ghost btn-sm hover:text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="text-ink-500">No entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {accounts.length > 0 && (
        <div className="text-right">
          <button
            onClick={async () => {
              const a = accounts[0];
              if (!a) return;
              if (!confirm(`Remove account "${a.name}"? Entries are kept but the account is hidden.`)) return;
              try { await deleteAccount(a.id); toast({ kind: "ok", title: "Account removed" }); r.refresh(); } catch { toast({ kind: "err", title: "Failed" }); }
            }}
            className="btn-ghost btn-sm hover:text-red-700"
          >
            Remove first account
          </button>
        </div>
      )}
    </div>
  );
}
