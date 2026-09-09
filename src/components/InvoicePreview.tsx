import { calcInvoice, formatMoney, amountInWords } from "@/domain/invoice";

export interface PreviewLine {
  description: string; quantityMilli: number; unit: string;
  unitPriceMinor: number; discountBps: number; taxRateBps: number; taxExempt: boolean;
}

export interface PreviewDoc {
  docType: string; invoiceNumber: string | null; linkedNumber?: string | null; correctionReason?: string | null;
  issueDate: string; dueDate?: string | null; currency: string; locale: string;
  seller: Record<string, string | null | undefined>; buyer: Record<string, string | null | undefined>;
  lines: PreviewLine[]; invDiscountBps: number; invDiscountFixedMinor: number;
  poNumber?: string | null; paymentMode?: string | null; taxMention?: string | null; notes?: string | null; footerText?: string | null;
}

/** A4 document — same calcInvoice() engine as the PDF. No local money math. */
export default function InvoicePreview({ doc }: { doc: PreviewDoc }) {
  const calc = calcInvoice({ lines: doc.lines, invDiscountBps: doc.invDiscountBps, invDiscountFixedMinor: doc.invDiscountFixedMinor });
  const fmt = (m: number) => formatMoney(m, doc.currency, doc.locale.startsWith("en") ? "en-GB" : "fr-MA");
  const title = doc.docType === "AVOIR" ? "AVOIR" : doc.docType === "RECTIFICATIVE" ? "FACTURE RECTIFICATIVE" : "FACTURE";
  const sellerIds = [doc.seller.ice && `ICE ${doc.seller.ice}`, doc.seller.identifiantFiscal && `IF ${doc.seller.identifiantFiscal}`, doc.seller.patente && `TP ${doc.seller.patente}`, doc.seller.rc && `RC ${doc.seller.rc}${doc.seller.rcCity ? ` ${doc.seller.rcCity}` : ""}`].filter(Boolean).join(" · ");

  return (
    <div className="w-[600px] max-w-full bg-white px-10 py-9 text-[12px] leading-relaxed text-ink-950 shadow-doc max-md:w-full max-md:px-6">
      <div className="flex justify-between gap-6">
        <div>
          <div className="text-[15px] font-semibold tracking-tight">{doc.seller.legalName || "Vendeur"}</div>
          {doc.seller.tradeName && <div className="text-ink-500">{doc.seller.tradeName}</div>}
          <div className="mt-1 text-ink-500">{doc.seller.address}{doc.seller.city ? `, ${doc.seller.city}` : ""}</div>
          <div className="mt-2 text-[11px] text-ink-500">{sellerIds}</div>
        </div>
        <div className="text-right">
          <div className="text-[24px] font-semibold tracking-tight">{title}</div>
          <div className="mt-0.5 font-medium">{doc.invoiceNumber ?? <em className="font-normal not-italic text-ink-400">Brouillon — sans numéro</em>}</div>
          {doc.linkedNumber && <div className="text-ink-500">{doc.docType === "AVOIR" ? `Avoir sur ${doc.linkedNumber}` : `Annule et remplace ${doc.linkedNumber}`}</div>}
          {doc.correctionReason && <div className="text-ink-500">Motif : {doc.correctionReason}</div>}
          <div className="mt-1 text-ink-500">Émise le {doc.issueDate}{doc.dueDate ? ` · Échéance ${doc.dueDate}` : ""}</div>
          {doc.paymentMode && <div className="text-ink-500">Paiement : {doc.paymentMode}</div>}
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <div className="flex-1 rounded-md border border-ink-200 p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Vendeur</div>
          <div className="font-medium">{doc.seller.legalName}</div>
        </div>
        <div className="flex-1 rounded-md border border-ink-200 p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">Facturé à</div>
          <div className="font-medium">{doc.buyer.companyName || doc.buyer.name || "—"}</div>
          {doc.buyer.address && <div className="text-ink-500">{doc.buyer.address}{doc.buyer.city ? `, ${doc.buyer.city}` : ""}</div>}
          {doc.buyer.ice && <div className="text-ink-500">ICE {doc.buyer.ice}</div>}
        </div>
      </div>

      {doc.poNumber && <div className="mt-3 text-ink-500">Bon de commande : {doc.poNumber}</div>}

      <table className="mt-4 w-full text-[12px]">
        <thead>
          <tr className="bg-ink-950 text-white">
            <th className="px-3 py-2 text-left font-medium">Description</th>
            <th className="px-2 py-2 text-right font-medium">Qté</th>
            <th className="px-2 py-2 text-right font-medium">P.U. HT</th>
            <th className="px-3 py-2 text-right font-medium">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => {
            const gross = Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000);
            const net = gross - Math.floor((gross * l.discountBps + 5000) / 10000);
            return (
              <tr key={i} className="border-b border-ink-100">
                <td className="px-3 py-2">
                  {l.description || <span className="text-ink-400">—</span>}
                  <span className="text-ink-400"> {l.taxExempt ? "(exonéré)" : `[TVA ${l.taxRateBps / 100}%]`}</span>
                </td>
                <td className="num px-2 py-2">{l.quantityMilli / 1000} {l.unit}</td>
                <td className="num px-2 py-2">{fmt(l.unitPriceMinor)}</td>
                <td className="num px-3 py-2 font-medium">{fmt(net)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ml-auto mt-4 w-64">
        <div className="flex justify-between py-0.5"><span className="text-ink-500">Sous-total HT</span><span className="tabular-nums">{fmt(calc.subtotalHT)}</span></div>
        {calc.invDiscountTotal > 0 && <div className="flex justify-between py-0.5"><span className="text-ink-500">Remise</span><span className="tabular-nums">−{fmt(calc.invDiscountTotal)}</span></div>}
        {calc.buckets.map((b, i) => (
          <div key={i} className="flex justify-between py-0.5"><span className="text-ink-500">TVA {b.rateBps / 100}% <span className="text-ink-400">(base {fmt(b.taxable)})</span></span><span className="tabular-nums">{fmt(b.tax)}</span></div>
        ))}
        <div className="mt-1.5 flex justify-between border-t-2 border-ink-950 pt-2 text-[14px] font-semibold">
          <span>{doc.docType === "AVOIR" ? "Net à déduire" : "Total TTC"} <span className="font-normal text-ink-400">{doc.currency}</span></span>
          <span className="tabular-nums">{fmt(calc.totalTTC)}</span>
        </div>
      </div>

      {doc.taxMention && <div className="mt-4 font-semibold">{doc.taxMention}</div>}
      <div className="mt-1 text-[11px] italic text-ink-500">{amountInWords(calc.totalTTC, doc.currency)}</div>
      {doc.notes && <div className="mt-3">Notes : {doc.notes}</div>}

      <div className="mt-6 border-t border-ink-200 pt-2.5 text-[10.5px] text-ink-400">
        {doc.footerText || `${doc.seller.legalName || ""} — ${sellerIds}`} · Conservation 10 ans (art. 211 CGI)
      </div>
    </div>
  );
}
