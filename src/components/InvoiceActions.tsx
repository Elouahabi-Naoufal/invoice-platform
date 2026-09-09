"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { finalize, pay, cancel, duplicate, markSentOp, deleteDraft } from "@/server/invoice-ops";

export default function InvoiceActions({ inv }: { inv: { id: string; status: string; docType: string; invoiceNumber: string | null; totalTTC: number; remaining: number; currency: string; sellerName: string; buyerName: string; issueDate: string; dueDate: string | null } }) {
  const r = useRouter();
  const [err, setErr] = useState("");
  const [confirmFin, setConfirmFin] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [amt, setAmt] = useState(inv.remaining / 100);
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [ref, setRef] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState("");

  async function run(fn: () => Promise<unknown>, go?: string) {
    setErr("");
    try { await fn(); r.refresh(); if (go) r.push(go); } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <a href={`/api/invoices/${inv.id}/pdf`}><button>Télécharger PDF</button></a>
      {inv.status === "DRAFT" && (
        <>
          <button onClick={() => setConfirmFin(true)} style={{ fontWeight: 800 }}>Finaliser la facture</button>
          <button onClick={() => run(() => duplicate(inv.id))}>Dupliquer</button>
          <button onClick={() => run(() => deleteDraft(inv.id), "/invoices")}>Supprimer brouillon</button>
        </>
      )}
      {inv.status === "ISSUED" && (
        <>
          <button onClick={() => setPayOpen(true)}>Encaisser ({(inv.remaining / 100).toFixed(2)} {inv.currency})</button>
          <button onClick={() => run(() => duplicate(inv.id))}>Dupliquer → brouillon</button>
          <a href={`/invoices/new?linked=${inv.id}`}><button>Créer avoir / rectificative</button></a>
          <button onClick={() => run(() => cancel(inv.id, cancelReason || "annulation"), undefined)}>Annuler (motif requis ci-dessous)</button>
          <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motif d'annulation" style={{ padding: 6 }} />
        </>
      )}
      {(inv.status === "ISSUED" || inv.status === "CANCELLED") && (
        <button onClick={() => run(() => duplicate(inv.id))}>Dupliquer</button>
      )}
      {inv.status === "ISSUED" && (
        <span style={{ display: "inline-flex", gap: 6 }}>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@exemple.ma" style={{ padding: 6 }} />
          <button disabled={sending} onClick={async () => {
            setSending(true); setErr("");
            try {
              const res = await fetch(`/api/invoices/${inv.id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to }) });
              if (!res.ok) throw new Error(await res.text());
              await run(() => markSentOp(inv.id, to));
            } catch (e) { setErr(e instanceof Error ? e.message : "error"); } finally { setSending(false); }
          }}>{sending ? "Envoi…" : "Envoyer (PDF + lien)"}</button>
          <button onClick={async () => { await navigator.clipboard.writeText(`${location.origin}/i/${(inv as { publicToken?: string }).publicToken ?? ""}`); }}>Copier lien public</button>
        </span>
      )}
      {err && <span style={{ color: "crimson" }}>{err}</span>}
      {confirmFin && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, maxWidth: 460 }}>
            <h3>Finaliser — opération irréversible</h3>
            <ul>
              <li>Type : {inv.docType}</li>
              <li>Vendeur : {inv.sellerName}</li>
              <li>Acheteur : {inv.buyerName}</li>
              <li>Total TTC : {(inv.totalTTC / 100).toFixed(2)} {inv.currency}</li>
              <li>Émise : {inv.issueDate} · Échéance : {inv.dueDate ?? "—"}</li>
            </ul>
            <p>La finalisation attribue le numéro officiel et fige le document (vendeur, acheteur, lignes, montants). Plus aucune modification ensuite — correction uniquement par avoir/rectificative.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmFin(false)}>Retour</button>
              <button onClick={() => run(() => finalize(inv.id))} style={{ fontWeight: 800 }}>Confirmer la finalisation</button>
            </div>
          </div>
        </div>
      )}
      {payOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "grid", placeItems: "center" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, maxWidth: 420, display: "grid", gap: 8 }}>
            <h3>Encaisser — max {(inv.remaining / 100).toFixed(2)} {inv.currency} (dépassement interdit)</h3>
            <label>Montant<input type="number" step="0.01" value={amt} onChange={(e) => setAmt(Number(e.target.value))} /></label>
            <label>Méthode<select value={method} onChange={(e) => setMethod(e.target.value)}><option value="BANK_TRANSFER">Virement</option><option value="CASH">Espèces</option><option value="CARD">Carte</option><option value="CHECK">Chèque</option><option value="OTHER">Autre</option></select></label>
            <label>Référence<input value={ref} onChange={(e) => setRef(e.target.value)} /></label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPayOpen(false)}>Fermer</button>
              <button onClick={() => run(() => pay(inv.id, { amountMinor: Math.round(amt * 100), method, reference: ref || undefined }))}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
