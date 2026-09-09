"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Send, Copy, Pencil, Trash2, Ban, Plus } from "lucide-react";
import { finalize, pay, cancel, duplicate, markSentOp, deleteDraft } from "@/server/invoice-ops";
import { Modal, useToast } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

type Inv = {
  id: string; status: string; docType: string; invoiceNumber: string | null;
  totalTTC: number; remaining: number; currency: string; publicToken: string | null;
  sellerName: string; buyerName: string; issueDate: string; dueDate: string | null;
};

export default function InvoiceActions({ inv }: { inv: Inv }) {
  const r = useRouter();
  const toast = useToast();
  const [err, setErr] = useState("");
  const [confirmFin, setConfirmFin] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [amt, setAmt] = useState(inv.remaining / 100);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(label: string, fn: () => Promise<unknown>, go?: string) {
    setErr(""); setBusy(true);
    try {
      await fn();
      toast({ kind: "ok", title: label });
      r.refresh();
      if (go) r.push(go);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Operation failed";
      setErr(msg);
      toast({ kind: "err", title: label + " failed", body: msg });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setErr(""); setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }),
      });
      if (!res.ok) throw new Error(await res.text());
      await markSentOp(inv.id, to);
      toast({ kind: "ok", title: "Invoice sent", body: `Delivered to ${to}` });
      setSendOpen(false);
      r.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      setErr(msg);
      toast({ kind: "err", title: "Unable to send invoice", body: "The email provider rejected the message. Check your email configuration and try again." });
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    const url = `${location.origin}/i/${inv.publicToken ?? ""}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ kind: "ok", title: "Link copied" }),
      () => toast({ kind: "err", title: "Copy failed", body: url })
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={`/api/invoices/${inv.id}/pdf`} className="btn-outline btn-sm"><Download size={14} /> PDF</a>

      {inv.status === "DRAFT" && (
        <>
          <a href={`/invoices/new?edit=${inv.id}`} className="btn-outline btn-sm"><Pencil size={14} /> Edit</a>
          <button onClick={() => setConfirmFin(true)} className="btn-primary btn-sm">Finalize invoice</button>
          <button onClick={() => run("Draft duplicated", () => duplicate(inv.id))} className="btn-ghost btn-sm">Duplicate</button>
          <button onClick={() => run("Draft deleted", () => deleteDraft(inv.id), "/invoices")} className="btn-ghost btn-sm hover:text-red-700"><Trash2 size={14} /></button>
        </>
      )}

      {inv.status === "ISSUED" && (
        <>
          <button onClick={() => setPayOpen(true)} className="btn-primary btn-sm">
            Record payment · {formatMoney(inv.remaining, inv.currency)}
          </button>
          <button onClick={() => setSendOpen(true)} className="btn-outline btn-sm"><Send size={14} /> Send</button>
          <button onClick={copyLink} className="btn-outline btn-sm"><Copy size={14} /> Copy link</button>
          <button onClick={() => run("Draft created from invoice", () => duplicate(inv.id))} className="btn-ghost btn-sm"><Plus size={14} /> Duplicate</button>
          <a href={`/invoices/new?linked=${inv.id}`} className="btn-ghost btn-sm">Credit note</a>
          <button onClick={() => setCancelOpen(true)} className="btn-ghost btn-sm hover:text-red-700"><Ban size={14} /> Cancel</button>
        </>
      )}

      {inv.status === "CANCELLED" && (
        <button onClick={() => run("Draft created from invoice", () => duplicate(inv.id))} className="btn-outline btn-sm"><Plus size={14} /> Duplicate as draft</button>
      )}

      {err && <span className="field-err w-full">{err}</span>}

      {confirmFin && (
        <Modal title="Finalize invoice?" onClose={() => setConfirmFin(false)}>
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-ink-500 dark:text-stone-400">Document</dt><dd className="font-medium">{inv.docType} · {inv.issueDate}</dd>
            <dt className="text-ink-500 dark:text-stone-400">Seller → Buyer</dt><dd className="font-medium">{inv.sellerName} → {inv.buyerName}</dd>
            <dt className="text-ink-500 dark:text-stone-400">Total</dt><dd className="font-semibold tabular-nums">{formatMoney(inv.totalTTC, inv.currency)}</dd>
            <dt className="text-ink-500 dark:text-stone-400">Due</dt><dd className="font-medium">{inv.dueDate ?? "—"}</dd>
          </dl>
          <p className="mb-5 rounded-md bg-ink-50 dark:bg-white/5 p-3 text-[13px] text-ink-700 dark:text-stone-300">
            Once finalized, the invoice becomes <strong>immutable</strong> and receives its official invoice number.
            Corrections afterwards require a credit note.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmFin(false)} className="btn-ghost">Cancel</button>
            <button disabled={busy} onClick={() => run("Invoice finalized", () => finalize(inv.id))} className="btn-primary">
              {busy ? "Finalizing…" : "Finalize invoice"}
            </button>
          </div>
        </Modal>
      )}

      {payOpen && (
        <Modal title={`Record payment — ${formatMoney(inv.remaining, inv.currency)} remaining`} onClose={() => setPayOpen(false)}>
          <div className="grid gap-3">
            <div><label className="label">Amount ({inv.currency})</label><input type="number" step="0.01" min={0.01} max={inv.remaining / 100} value={amt} onChange={(e) => setAmt(Number(e.target.value))} className="input num" /></div>
            <div><label className="label">Method</label><select value={method} onChange={(e) => setMethod(e.target.value)} className="input"><option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="CHECK">Check</option><option value="OTHER">Other</option></select></div>
            <div><label className="label">Reference</label><input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. VIR-2026-118" className="input" /></div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPayOpen(false)} className="btn-ghost">Cancel</button>
              <button disabled={busy} onClick={() => run("Payment recorded", () => pay(inv.id, { amountMinor: Math.round(amt * 100), method, reference: ref || undefined }))} className="btn-primary">{busy ? "Saving…" : "Record"}</button>
            </div>
          </div>
        </Modal>
      )}

      {cancelOpen && (
        <Modal title="Cancel invoice?" onClose={() => setCancelOpen(false)}>
          <p className="mb-3 text-[13px] text-ink-500 dark:text-stone-400">The number <strong className="text-ink-950 dark:text-stone-100">{inv.invoiceNumber}</strong> is kept and never reused. Use a credit note if money must be returned.</p>
          <label className="label">Reason (required)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Issued in error" className="input mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancelOpen(false)} className="btn-ghost">Keep invoice</button>
            <button disabled={busy || !reason.trim()} onClick={() => run("Invoice cancelled", () => cancel(inv.id, reason))} className="btn-danger">{busy ? "Cancelling…" : "Cancel invoice"}</button>
          </div>
        </Modal>
      )}

      {sendOpen && (
        <Modal title="Send invoice" onClose={() => setSendOpen(false)}>
          <div className="grid gap-3">
            <div><label className="label">Recipient</label><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@company.ma" type="email" className="input" /></div>
            <p className="hint">Sends the PDF attachment plus the secure public link. The invoice is only marked sent after the provider confirms delivery.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSendOpen(false)} className="btn-ghost">Cancel</button>
              <button disabled={busy || !to.includes("@")} onClick={send} className="btn-primary">{busy ? "Sending…" : "Send"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
