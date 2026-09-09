import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getInvoiceDetail } from "@/server/invoice-ops";
import InvoiceActions from "@/components/InvoiceActions";
import InvoicePreview from "@/components/InvoicePreview";

export default async function DetailPage({ params }: { params: { id: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  let inv;
  try { inv = await getInvoiceDetail(params.id); } catch { redirect("/invoices"); }
  const buckets = inv.taxBreakdown ? JSON.parse(inv.taxBreakdown) : [];
  const lines = inv.linesSnapshot ? JSON.parse(inv.linesSnapshot) : inv.lines.map((l) => ({
    description: l.description, quantityMilli: l.quantityMilli, unit: l.unit,
    unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps, taxRateBps: l.taxRateBps, taxExempt: l.taxExempt,
  }));
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h1>{inv.invoiceNumber ?? <em>Brouillon (numéro à la finalisation)</em>} <span style={{ fontSize: 14 }}>· {inv.docType} · {inv.display} ({inv.status})</span></h1>
      <InvoiceActions inv={{
        id: inv.id, status: inv.status, docType: inv.docType, invoiceNumber: inv.invoiceNumber,
        totalTTC: inv.totalTTC, remaining: inv.remaining, currency: inv.currency,
        sellerName: (inv.sellerView as { legalName?: string })?.legalName ?? "?",
        buyerName: (inv.buyerView as { companyName?: string; name?: string })?.companyName ?? (inv.buyerView as { name?: string })?.name ?? "?",
        issueDate: inv.issueDate.toISOString().slice(0, 10),
        dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : null,
      }} />
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <InvoicePreview doc={{
          docType: inv.docType, invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate.toISOString().slice(0, 10),
          dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : null,
          currency: inv.currency, locale: inv.invoiceLocale,
          seller: (inv.sellerView ?? {}) as Record<string, string>, buyer: (inv.buyerView ?? {}) as Record<string, string>,
          lines, invDiscountBps: inv.invDiscountBps, invDiscountFixedMinor: inv.invDiscountFixedMinor,
          poNumber: inv.poNumber, paymentMode: inv.paymentMode, taxMention: inv.taxMention,
          notes: inv.notes, footerText: inv.footerText,
        }} />
        <div style={{ display: "grid", gap: 12, minWidth: 300 }}>
          <div style={{ background: "#fff", padding: 14, borderRadius: 8 }}>
            <h3>Paiements — Total {(inv.totalTTC / 100).toFixed(2)} · Payé {(inv.paidAmount / 100).toFixed(2)} · Reste {(inv.remaining / 100).toFixed(2)} {inv.currency}</h3>
            {inv.payments.map((p) => (
              <div key={p.id} style={{ fontSize: 13 }}>{new Date(p.paymentDate).toLocaleDateString()} · {(p.amountMinor / 100).toFixed(2)} · {p.method} · {p.reference ?? ""}</div>
            ))}
            {inv.payments.length === 0 && <div style={{ fontSize: 13, opacity: 0.6 }}>Aucun encaissement.</div>}
          </div>
          <div style={{ background: "#fff", padding: 14, borderRadius: 8 }}>
            <h3>TVA ventilée (buckets du domaine)</h3>
            {buckets.map((b: { rateBps: number; taxable: number; tax: number }, i: number) => (
              <div key={i} style={{ fontSize: 13 }}>TVA {b.rateBps / 100}% — base {(b.taxable / 100).toFixed(2)} → {(b.tax / 100).toFixed(2)}</div>
            ))}
            {inv.taxMention && <div style={{ fontWeight: 700 }}>{inv.taxMention}</div>}
          </div>
          <div style={{ background: "#fff", padding: 14, borderRadius: 8 }}>
            <h3>Historique</h3>
            {inv.events.map((e) => (
              <div key={e.id} style={{ fontSize: 13 }}>{new Date(e.createdAt).toLocaleString()} · <strong>{e.type}</strong> {e.metadata ?? ""}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
