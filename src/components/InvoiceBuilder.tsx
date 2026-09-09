"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calcInvoice } from "@/domain/invoice";
import InvoicePreview, { PreviewLine } from "@/components/InvoicePreview";
import ClientForm from "@/components/ClientForm";
import { createDraft } from "@/server/invoice-ops";
import { listClients } from "@/server/companies-clients";

type Company = Record<string, string | number | null | undefined> & { id: string; legalName: string };
type Client = { id: string; type: string; name: string; companyName?: string | null; ice?: string | null; address?: string | null; city?: string | null; clientIF?: string | null; clientRC?: string | null };

const TVA_CHOICES = [
  { label: "20%", v: 2000 }, { label: "14%", v: 1400 }, { label: "10%", v: 1000 },
  { label: "7%", v: 700 }, { label: "0%", v: 0 }, { label: "Exonéré", v: -1 },
];

export default function InvoiceBuilder({ companies, initialClients, linked }: { companies: Company[]; initialClients: Client[]; linked?: { id: string; number: string | null } | null }) {
  const r = useRouter();
  const [step, setStep] = useState(0);
  const [sellerId, setSellerId] = useState(companies[0]?.id ?? "");
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [buyerId, setBuyerId] = useState("");
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [docType, setDocType] = useState("FACTURE");
  const [issueDate, setIssueDate] = useState("2026-09-09");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("MAD");
  const [paymentMode, setPaymentMode] = useState("VIREMENT");
  const [paymentTerms, setPaymentTerms] = useState("D30");
  const [poNumber, setPoNumber] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [invDiscPct, setInvDiscPct] = useState(0);
  const [lines, setLines] = useState<PreviewLine[]>([
    { description: "", quantityMilli: 1000, unit: "piece", unitPriceMinor: 0, discountBps: 0, taxRateBps: 2000, taxExempt: false },
  ]);
  const [err, setErr] = useState("");

  const seller = companies.find((c) => c.id === sellerId);
  const buyer = clients.find((c) => c.id === buyerId);

  // Live totals via the ONE domain engine — no local money math.
  const calc = useMemo(() => {
    try {
      return calcInvoice({ lines, invDiscountBps: Math.round(invDiscPct * 100), invDiscountFixedMinor: 0 });
    } catch { return null; }
  }, [lines, invDiscPct]);

  async function search() {
    const res = await listClients(q);
    setClients(res as Client[]);
  }

  function setLine(i: number, patch: Partial<PreviewLine>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function move(i: number, dir: number) {
    setLines((ls) => {
      const j = i + dir;
      if (j < 0 || j >= ls.length) return ls;
      const copy = [...ls];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    setErr("");
    try {
      const inv = await createDraft({
        companyId: sellerId, clientId: buyerId, docType,
        linkedInvoiceId: linked?.id ?? undefined,
        correctionReason: (docType === "AVOIR" || docType === "RECTIFICATIVE") ? correctionReason : undefined,
        currency, invoiceLocale: "fr", issueDate,
        paymentTerms, paymentMode, poNumber: poNumber || undefined, notes: notes || undefined,
        invDiscountBps: Math.round(invDiscPct * 100), invDiscountFixedMinor: 0,
        lines: lines.map((l) => ({ ...l, quantity: undefined })),
      });
      r.push(`/invoices/${(inv as { id: string }).id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    }
  }

  const sellerView = seller ? {
    legalName: String(seller.legalName ?? ""), tradeName: String(seller.tradeName ?? ""),
    address: String(seller.address ?? ""), city: String(seller.city ?? ""),
    ice: String(seller.ice ?? ""), identifiantFiscal: String(seller.identifiantFiscal ?? ""),
    patente: String(seller.patente ?? ""), rc: String(seller.rc ?? ""), rcCity: String(seller.rcCity ?? ""),
    cnss: String(seller.cnss ?? ""),
  } : {};
  const buyerView = buyer ? {
    name: buyer.name, companyName: buyer.companyName ?? undefined,
    address: buyer.address ?? undefined, city: buyer.city ?? undefined,
    ice: buyer.ice ?? undefined, clientIF: buyer.clientIF ?? undefined, clientRC: buyer.clientRC ?? undefined,
  } : { name: "—" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["1 · Vendeur", "2 · Acheteur", "3 · Détails + lignes"].map((s, i) => (
          <button key={s} onClick={() => setStep(i)} style={{ fontWeight: step === i ? 800 : 400 }}>{s}</button>
        ))}
        <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ marginLeft: "auto" }}>
          <option>FACTURE</option><option>AVOIR</option><option>RECTIFICATIVE</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: 1, background: "#fff", padding: 16, borderRadius: 8, display: "grid", gap: 12 }}>
          {step === 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {companies.map((c) => (
                <label key={c.id} style={{ border: sellerId === c.id ? "2px solid #111" : "1px solid #ccc", padding: 10, borderRadius: 6 }}>
                  <input type="radio" checked={sellerId === c.id} onChange={() => { setSellerId(c.id); setCurrency(String(c.defaultCurrency ?? "MAD")); }} />
                  <strong> {String(c.legalName)}</strong> <span style={{ fontSize: 12 }}>· ICE {String(c.ice ?? "—")} · {String(c.defaultCurrency ?? "")}</span>
                </label>
              ))}
              <button onClick={() => setStep(1)}>Continuer →</button>
            </div>
          )}
          {step === 1 && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher client…" style={{ flex: 1, padding: 8 }} />
                <button onClick={search}>OK</button>
                <button onClick={() => setShowNew(true)}>+ Nouveau client</button>
              </div>
              {showNew && (
                <div style={{ border: "1px dashed #888", padding: 12 }}>
                  <ClientForm onDone={(id) => { setShowNew(false); listClients("").then((cs) => { setClients(cs as Client[]); setBuyerId(id); }); }} />
                </div>
              )}
              {clients.map((c) => (
                <label key={c.id} style={{ border: buyerId === c.id ? "2px solid #111" : "1px solid #ccc", padding: 8, borderRadius: 6 }}>
                  <input type="radio" checked={buyerId === c.id} onChange={() => setBuyerId(c.id)} />
                  <strong> {c.companyName || c.name}</strong> <span style={{ fontSize: 12 }}>· {c.type} · ICE {c.ice || "—"}</span>
                </label>
              ))}
              <button onClick={() => setStep(2)}>Continuer →</button>
            </div>
          )}
          {step === 2 && (
            <div style={{ display: "grid", gap: 10 }}>
              {(docType === "AVOIR" || docType === "RECTIFICATIVE") && (
                <>
                  <div>Facture d&apos;origine : <strong>{linked?.number ?? linked?.id ?? "—"}</strong></div>
                  <input value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} placeholder="Motif (obligatoire) *" style={{ padding: 8 }} />
                </>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <label>Date *<input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
                <label>Échéance<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
                <label>Devise<select value={currency} onChange={(e) => setCurrency(e.target.value)}><option>MAD</option><option>EUR</option><option>USD</option><option>GBP</option></select></label>
                <label>Paiement<select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option>VIREMENT</option><option>ESPECES</option><option>CHEQUE</option><option>EFFET</option></select></label>
                <label>Conditions<select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}><option value="ON_RECEIPT">À réception</option><option value="D7">7 j</option><option value="D15">15 j</option><option value="D30">30 j</option><option value="D60">60 j</option><option value="CUSTOM">Personnalisé</option></select></label>
                <label>Bon de commande<input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} /></label>
                <label>Remise facture %<input type="number" min={0} max={100} value={invDiscPct} onChange={(e) => setInvDiscPct(Number(e.target.value))} /></label>
              </div>
              {lines.map((l, i) => (
                <div key={i} style={{ border: "1px solid #ddd", padding: 8, borderRadius: 6, display: "grid", gap: 6 }}>
                  <input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder={`Ligne ${i + 1} — description *`} style={{ padding: 6 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6 }}>
                    <label>Qté<input type="number" step="0.001" value={l.quantityMilli / 1000} onChange={(e) => setLine(i, { quantityMilli: Math.round(Number(e.target.value) * 1000) })} /></label>
                    <label>Unité<select value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })}><option value="piece">pièce</option><option value="heure">heure</option><option value="jour">jour</option><option value="kg">kg</option><option value="service">service</option></select></label>
                    <label>P.U. HT (cent.)<input type="number" value={l.unitPriceMinor} onChange={(e) => setLine(i, { unitPriceMinor: Number(e.target.value) })} /></label>
                    <label>Remise %<input type="number" min={0} max={100} value={l.discountBps / 100} onChange={(e) => setLine(i, { discountBps: Math.round(Number(e.target.value) * 100) })} /></label>
                    <label>TVA<select value={l.taxExempt ? -1 : l.taxRateBps} onChange={(e) => { const v = Number(e.target.value); setLine(i, v === -1 ? { taxExempt: true, taxRateBps: 0 } : { taxExempt: false, taxRateBps: v }); }}>
                      {TVA_CHOICES.map((t) => <option key={t.label} value={t.v}>{t.label}</option>)}
                    </select></label>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => move(i, -1)}>↑</button>
                    <button onClick={() => move(i, 1)}>↓</button>
                    <button onClick={() => setLines((ls) => [...ls.slice(0, i + 1), { ...ls[i] }, ...ls.slice(i + 1)])}>Dupliquer</button>
                    <button onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Supprimer</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setLines((ls) => [...ls, { description: "", quantityMilli: 1000, unit: "piece", unitPriceMinor: 0, discountBps: 0, taxRateBps: 2000, taxExempt: false }])}>+ Ajouter une ligne</button>
              <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
              {err && <p style={{ color: "crimson" }}>{err}</p>}
              <button onClick={save} style={{ padding: 12, fontWeight: 800 }}>Enregistrer le brouillon (numéro attribué à la finalisation)</button>
            </div>
          )}
        </div>
        <div>
          <InvoicePreview doc={{
            docType, invoiceNumber: null, linkedNumber: linked?.number ?? null, correctionReason: correctionReason || null,
            issueDate, dueDate: dueDate || null, currency, locale: "fr",
            seller: sellerView, buyer: buyerView, lines,
            invDiscountBps: Math.round(invDiscPct * 100), invDiscountFixedMinor: 0,
            poNumber: poNumber || null, paymentMode, notes: notes || null,
          }} />
          {!calc && <p style={{ color: "crimson" }}>Lignes invalides (montants ≥ 0 requis).</p>}
        </div>
      </div>
    </div>
  );
}
