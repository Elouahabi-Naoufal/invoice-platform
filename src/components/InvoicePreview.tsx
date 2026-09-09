import { calcInvoice, formatMoney } from "@/domain/invoice";

export interface PreviewLine {
  description: string; quantityMilli: number; unit: string;
  unitPriceMinor: number; discountBps: number; taxRateBps: number; taxExempt: boolean;
}

export interface PreviewDoc {
  docType: string; invoiceNumber: string | null; linkedNumber?: string | null; correctionReason?: string | null;
  issueDate: string; dueDate?: string | null; currency: string; locale: string;
  seller: Record<string, string | number | null | undefined>; buyer: Record<string, string | null | undefined>;
  lines: PreviewLine[]; invDiscountBps: number; invDiscountFixedMinor: number;
  poNumber?: string | null; clientRef?: string | null; paymentMode?: string | null; paymentTerms?: string | null;
  taxMention?: string | null; notes?: string | null; footerText?: string | null;
}

function accentOf(seller: PreviewDoc["seller"]): string {
  const a = String(seller.accentColor ?? "#2563EB");
  return /^#[0-9A-Fa-f]{6}$/.test(a) ? a : "#2563EB";
}

const ddmmyyyy = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

/** Light premium preview — same calcInvoice() engine and same composition as the PDF. */
export default function InvoicePreview({ doc }: { doc: PreviewDoc }) {
  const calc = calcInvoice({ lines: doc.lines, invDiscountBps: doc.invDiscountBps, invDiscountFixedMinor: doc.invDiscountFixedMinor });
  const accent = accentOf(doc.seller);
  const fmt = (m: number) => formatMoney(m, doc.currency, doc.locale.startsWith("en") ? "en-GB" : "fr-MA");
  const title = doc.docType === "AVOIR" ? "Avoir" : doc.docType === "RECTIFICATIVE" ? "Facture rectificative" : "Facture";
  const sellerIds = [doc.seller.ice && `ICE : ${doc.seller.ice}`, doc.seller.identifiantFiscal && `IF : ${doc.seller.identifiantFiscal}`, doc.seller.rc && `RC : ${doc.seller.rc}${doc.seller.rcCity ? ` ${doc.seller.rcCity}` : ""}`, doc.seller.patente && `TP : ${doc.seller.patente}`].filter(Boolean);
  const buyerIds = [doc.buyer.ice && `ICE : ${doc.buyer.ice}`, doc.buyer.clientIF && `IF : ${doc.buyer.clientIF}`, doc.buyer.clientRC && `RC : ${doc.buyer.clientRC}`].filter(Boolean);

  return (
    <div className="w-[600px] max-w-full bg-white px-[50px] py-10 text-[14px] leading-relaxed text-[#333] shadow-doc max-md:w-full max-md:px-6">
      <div className="mb-10 flex items-start justify-between gap-6">
        <div>
          {doc.seller.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(doc.seller.logoPath)} alt="" className="mb-2 h-14 object-contain object-left" />
          ) : null}
          <div className="text-[15px] font-bold text-[#1a1a1a]">{doc.seller.legalName || "Vendeur"}</div>
          <div className="mt-2.5 text-[14px] text-[#71717a]">
            <div>{doc.seller.address}{doc.seller.city ? `, ${doc.seller.city}` : ""}</div>
            {[doc.seller.phone, doc.seller.email].filter(Boolean).map((x) => <div key={String(x)}>{x}</div>)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[32px] font-light uppercase tracking-wide text-[#1a1a1a]">{title}</div>
          <div className="mt-2.5 text-[14px] text-[#71717a]">
            <div><strong className="text-[#333]">{doc.invoiceNumber ?? "Brouillon — sans numéro"}</strong></div>
            {doc.linkedNumber && <div>{doc.docType === "AVOIR" ? `Avoir sur ${doc.linkedNumber}` : `Annule et remplace ${doc.linkedNumber}`}{doc.correctionReason ? ` — ${doc.correctionReason}` : ""}</div>}
            <div><strong className="text-[#333]">Date : </strong>{ddmmyyyy(doc.issueDate)}</div>
            {doc.dueDate && <div><strong className="text-[#333]">Échéance : </strong>{ddmmyyyy(doc.dueDate)}</div>}
            <div><strong className="text-[#333]">Devise : </strong>{doc.currency}</div>
            {doc.poNumber && <div><strong className="text-[#333]">Cde client : </strong>{doc.poNumber}</div>}
          </div>
        </div>
      </div>

      <div className="mb-10 border-t border-[#e2e8f0] pt-7">
        <div className="mb-2 text-[12px] uppercase tracking-wide text-[#71717a]">Facturé à</div>
        <div className="text-[14px] font-bold text-[#333]">{doc.buyer.companyName || doc.buyer.name || "—"}</div>
        {doc.buyer.address && <div className="text-[14px] text-[#71717a]">{doc.buyer.address}{doc.buyer.city ? `, ${doc.buyer.city}` : ""}</div>}
        {buyerIds.map((t, i) => <div key={i} className="text-[14px] text-[#71717a]">{t}</div>)}
      </div>

      <table className="mb-7 w-full border-collapse">
        <thead>
          <tr className="bg-[#f8fafc]">
            {["Désignation", "Qté", "P.U. HT", "Remise", "TVA", "Montant"].map((h, i) => (
              <th key={h} className={`px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#71717a] ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => {
            const gross = Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000);
            const net = gross - Math.floor((gross * l.discountBps + 5000) / 10000);
            return (
              <tr key={i} className="border-b border-[#e2e8f0] align-top">
                <td className="px-4 py-4">
                  <div className="font-bold">{l.description || "—"}</div>
                </td>
                <td className="px-4 py-4 text-right tabular-nums">{l.quantityMilli / 1000}</td>
                <td className="px-4 py-4 text-right tabular-nums">{fmt(l.unitPriceMinor)}</td>
                <td className="px-4 py-4 text-right tabular-nums">{l.discountBps > 0 ? `${l.discountBps / 100} %` : "—"}</td>
                <td className="px-4 py-4 text-right tabular-nums">{l.taxExempt ? "Exo." : `${l.taxRateBps / 100} %`}</td>
                <td className="px-4 py-4 text-right font-bold tabular-nums">{fmt(net)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mb-10 flex justify-end">
        <div className="w-[300px]">
          <div className="flex justify-between px-4 py-2"><span>Total HT</span><strong className="tabular-nums">{fmt(calc.subtotalHT)}</strong></div>
          {calc.invDiscountTotal > 0 && <div className="flex justify-between px-4 py-2"><span>Remise globale</span><strong className="tabular-nums">−{fmt(calc.invDiscountTotal)}</strong></div>}
          {calc.buckets.map((b, i) => (
            <div key={i} className="flex justify-between px-4 py-2"><span>TVA {b.rateBps / 100} % (base {fmt(b.taxable)})</span><strong className="tabular-nums">{fmt(b.tax)}</strong></div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t-2 border-[#1a1a1a] px-4 pt-3">
            <span className="text-[14px] font-bold">{doc.docType === "AVOIR" ? "NET À DÉDUIRE" : "TOTAL TTC"}</span>
            <span className="text-[18px] font-bold tabular-nums" style={{ color: accent }}>{fmt(calc.totalTTC)}</span>
          </div>
        </div>
      </div>
      {doc.taxMention && <div className="mb-3 text-right text-[13px] font-bold">{doc.taxMention}</div>}

      <div className="mb-2 flex gap-6">
        <div className="flex-1">
          <div className="mb-1 text-[12px] uppercase tracking-wide text-[#71717a]">Paiement</div>
          {doc.paymentMode && <div className="text-[13px]">Mode : {doc.paymentMode}</div>}
          {doc.dueDate && <div className="text-[13px]">Échéance : {ddmmyyyy(doc.dueDate)}</div>}
          {doc.seller.bankName && <div className="text-[13px]">{doc.seller.bankName}</div>}
          {doc.seller.rib && <div className="text-[13px]">RIB : {doc.seller.rib}</div>}
          {doc.seller.iban && <div className="text-[13px]">IBAN : {doc.seller.iban}</div>}
          {doc.seller.swift && <div className="text-[13px]">SWIFT : {doc.seller.swift}</div>}
        </div>
        <div className="flex-1">
          <div className="mb-1 text-[12px] uppercase tracking-wide text-[#71717a]">Mentions légales</div>
          {sellerIds.map((t, i) => <div key={i} className="text-[13px]">{t}</div>)}
          {doc.seller.cnss && <div className="text-[13px]">CNSS : {doc.seller.cnss}</div>}
        </div>
      </div>
      {doc.notes && <div className="mt-3"><div className="mb-1 text-[12px] uppercase tracking-wide text-[#71717a]">Notes</div><div className="text-[13px]">{doc.notes}</div></div>}

      <div className="mt-5 border-t border-[#e2e8f0] pt-5 text-center text-[12px] text-[#71717a]">
        <div>{doc.footerText || `Merci de votre confiance — paiement ${doc.paymentMode ? String(doc.paymentMode).toLowerCase() : "sous 30 jours"}`}</div>
        <div className="mt-1 text-[11px]">{`${doc.seller.legalName || ""}${doc.seller.city ? `, ${doc.seller.city}` : ""} · ${sellerIds.join(" · ")} · Conservation 10 ans (art. 211 CGI)`}</div>
      </div>
    </div>
  );
}
