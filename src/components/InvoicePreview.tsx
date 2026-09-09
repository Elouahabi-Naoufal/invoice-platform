import { calcInvoice, formatMoney, amountInWords } from "@/domain/invoice";

export interface PreviewLine {
  description: string; quantityMilli: number; unit: string;
  unitPriceMinor: number; discountBps: number; taxRateBps: number; taxExempt: boolean;
}

export default function InvoicePreview({ doc }: {
  doc: {
    docType: string; invoiceNumber: string | null; linkedNumber?: string | null; correctionReason?: string | null;
    issueDate: string; dueDate?: string | null; currency: string; locale: string;
    seller: Record<string, string | null | undefined>; buyer: Record<string, string | null | undefined>;
    lines: PreviewLine[]; invDiscountBps: number; invDiscountFixedMinor: number;
    poNumber?: string | null; paymentMode?: string | null; taxMention?: string | null; notes?: string | null; footerText?: string | null;
  };
}) {
  // ONE engine: same calcInvoice() as PDF + server. No React-side money logic.
  const calc = calcInvoice({ lines: doc.lines, invDiscountBps: doc.invDiscountBps, invDiscountFixedMinor: doc.invDiscountFixedMinor });
  const fmt = (m: number) => formatMoney(m, doc.currency, doc.locale.startsWith("en") ? "en-GB" : "fr-MA");
  const title = doc.docType === "AVOIR" ? "AVOIR" : doc.docType === "RECTIFICATIVE" ? "FACTURE RECTIFICATIVE" : "FACTURE";
  return (
    <div style={{ background: "#fff", padding: 28, width: 560, fontSize: 12, boxShadow: "0 2px 12px rgba(0,0,0,.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{doc.seller.legalName || "Vendeur"}</div>
          <div style={{ color: "#555" }}>{doc.seller.address}{doc.seller.city ? `, ${doc.seller.city}` : ""}</div>
          <div style={{ color: "#555", fontSize: 11 }}>
            {[doc.seller.ice && `ICE ${doc.seller.ice}`, doc.seller.identifiantFiscal && `IF ${doc.seller.identifiantFiscal}`, doc.seller.patente && `TP ${doc.seller.patente}`, doc.seller.rc && `RC ${doc.seller.rc}${doc.seller.rcCity ? ` ${doc.seller.rcCity}` : ""}`, doc.seller.cnss && `CNSS ${doc.seller.cnss}`].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{title}</div>
          <div>{doc.invoiceNumber ?? <em style={{ color: "#888" }}>Numéro attribué à la finalisation</em>}</div>
          {doc.linkedNumber && <div style={{ color: "#555" }}>{doc.docType === "AVOIR" ? `Avoir sur ${doc.linkedNumber}` : `Annule et remplace ${doc.linkedNumber}`}</div>}
          {doc.correctionReason && <div style={{ color: "#555" }}>Motif : {doc.correctionReason}</div>}
          <div style={{ color: "#555" }}>Émise le {doc.issueDate}{doc.dueDate ? ` · Échéance ${doc.dueDate}` : ""}</div>
          {doc.paymentMode && <div style={{ color: "#555" }}>Paiement : {doc.paymentMode}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, margin: "14px 0" }}>
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
          <strong>Vendeur</strong><div>{doc.seller.legalName}</div>
        </div>
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 8, borderRadius: 4 }}>
          <strong>Facturé à</strong>
          <div>{doc.buyer.companyName || doc.buyer.name || "—"}</div>
          <div style={{ color: "#555" }}>{doc.buyer.address || ""}</div>
          {doc.buyer.ice && <div style={{ color: "#555" }}>ICE {doc.buyer.ice}</div>}
        </div>
      </div>
      {doc.poNumber && <div>Bon de commande : {doc.poNumber}</div>}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead><tr style={{ background: "#111", color: "#fff" }}>
          <th style={{ textAlign: "left", padding: 6 }}>Description</th><th>Qté</th><th>P.U. HT</th><th>Total HT</th>
        </tr></thead>
        <tbody>
          {doc.lines.map((l, i) => {
            const gross = Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000);
            const net = gross - Math.floor((gross * l.discountBps + 5000) / 10000);
            return (
              <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 6 }}>{l.description}{l.taxExempt ? " (exonéré)" : ` [TVA ${l.taxRateBps / 100}%]`}</td>
                <td style={{ textAlign: "right" }}>{l.quantityMilli / 1000} {l.unit}</td>
                <td style={{ textAlign: "right" }}>{fmt(l.unitPriceMinor)}</td>
                <td style={{ textAlign: "right" }}>{fmt(net)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginLeft: "auto", width: 260, marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total brut HT</span><span>{fmt(calc.subtotalHT)}</span></div>
        {calc.invDiscountTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Remise</span><span>-{fmt(calc.invDiscountTotal)}</span></div>}
        {calc.buckets.map((b, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>TVA {b.rateBps / 100}% (base {fmt(b.taxable)})</span><span>{fmt(b.tax)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, borderTop: "2px solid #111", marginTop: 4, paddingTop: 4 }}>
          <span>{doc.docType === "AVOIR" ? "Net à déduire" : "Total TTC"} ({doc.currency})</span><span>{fmt(calc.totalTTC)}</span>
        </div>
      </div>
      {doc.taxMention && <div style={{ marginTop: 8, fontWeight: 700 }}>{doc.taxMention}</div>}
      <div style={{ marginTop: 4, fontStyle: "italic", fontSize: 11 }}>{amountInWords(calc.totalTTC, doc.currency)}</div>
      {doc.notes && <div style={{ marginTop: 8 }}>Notes : {doc.notes}</div>}
      <div style={{ marginTop: 12, borderTop: "1px solid #ddd", paddingTop: 8, color: "#555", fontSize: 10 }}>
        {doc.footerText || `${doc.seller.legalName || ""} — ICE ${doc.seller.ice || "—"}`} · Conservation 10 ans (art. 211 CGI)
      </div>
    </div>
  );
}
