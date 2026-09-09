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
  const a = String(seller.accentColor ?? "#1D4ED8");
  return /^#[0-9A-Fa-f]{6}$/.test(a) ? a : "#1D4ED8";
}

const ddmmyyyy = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

/** A4 stationery preview — same calcInvoice() engine and same composition as the PDF. */
export default function InvoicePreview({ doc }: { doc: PreviewDoc }) {
  const calc = calcInvoice({ lines: doc.lines, invDiscountBps: doc.invDiscountBps, invDiscountFixedMinor: doc.invDiscountFixedMinor });
  const accent = accentOf(doc.seller);
  const fmt = (m: number) => formatMoney(m, doc.currency, doc.locale.startsWith("en") ? "en-GB" : "fr-MA");
  const title = doc.docType === "AVOIR" ? "AVOIR" : doc.docType === "RECTIFICATIVE" ? "FACTURE RECTIFICATIVE" : "FACTURE";
  const sellerIds = [doc.seller.ice && `ICE : ${doc.seller.ice}`, doc.seller.identifiantFiscal && `IF : ${doc.seller.identifiantFiscal}`, doc.seller.rc && `RC : ${doc.seller.rc}${doc.seller.rcCity ? ` ${doc.seller.rcCity}` : ""}`, doc.seller.patente && `TP : ${doc.seller.patente}`].filter(Boolean);

  return (
    <div className="a4doc w-[600px] max-w-full bg-white text-[13px] leading-relaxed text-ink-950 shadow-doc max-md:w-full print:mx-auto print:w-[600px] print:max-w-[600px] print:shadow-none">
      <div className="h-[5px]" style={{ backgroundColor: accent }} />
      <div className="px-10 py-6 max-md:px-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            {doc.seller.logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={String(doc.seller.logoPath)} alt="" className="mb-2 h-14 object-contain object-left" />
            ) : null}
            <div className="text-[15px] font-semibold tracking-tight">{doc.seller.legalName || "Vendeur"}</div>
            {doc.seller.tradeName && <div className="text-ink-500">{doc.seller.tradeName}</div>}
            {doc.seller.legalForm && <div className="text-ink-500">{doc.seller.legalForm}</div>}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-left">
            <div className="text-[30px] font-semibold leading-none tracking-tight">{title}</div>
            <div className="mt-1 text-[13px] font-bold">{doc.invoiceNumber ?? <em className="font-normal not-italic text-ink-400">Brouillon — sans numéro</em>}</div>
            {doc.linkedNumber && <div className="text-ink-500">{doc.docType === "AVOIR" ? `Avoir sur ${doc.linkedNumber}` : `Annule et remplace ${doc.linkedNumber}`}{doc.correctionReason ? ` — Motif : ${doc.correctionReason}` : ""}</div>}
            <div className="mt-1.5 text-ink-500">
              <div>Date : {ddmmyyyy(doc.issueDate)}</div>
              {doc.dueDate && <div>Échéance : {ddmmyyyy(doc.dueDate)}</div>}
              <div>Devise : {doc.currency}</div>
              {doc.poNumber && <div>Cde client : {doc.poNumber}</div>}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded bg-ink-50 px-3 py-2 text-[13px] dark:bg-white/5">
          Client : <strong>{doc.buyer.companyName || doc.buyer.name || "—"}</strong>
          {doc.buyer.address ? ` · ${doc.buyer.address}${doc.buyer.city ? `, ${doc.buyer.city}` : ""}` : ""}
          {doc.buyer.ice ? ` · ICE : ${doc.buyer.ice}` : ""}
          {doc.buyer.clientIF ? ` · IF : ${doc.buyer.clientIF}` : ""}
          {doc.buyer.clientRC ? ` · RC : ${doc.buyer.clientRC}` : ""}
        </div>

        <div className="-mx-[50px] mt-4 px-[50px] py-3.5 text-white max-md:-mx-6 max-md:px-6" style={{ backgroundColor: accent }}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 48px 84px 56px 56px 88px" }}>
            <span className="px-2 text-left font-medium">Désignation</span>
            <span className="px-2 text-right font-medium">Qté</span>
            <span className="px-2 text-right font-medium">P.U. HT</span>
            <span className="px-2 text-right font-medium">Remise</span>
            <span className="px-2 text-right font-medium">TVA</span>
            <span className="px-2 text-right font-medium">Total HT</span>
          </div>
        </div>
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col />
            <col style={{ width: 48 }} />
            <col style={{ width: 84 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: 88 }} />
          </colgroup>
          <tbody>
            {doc.lines.map((l, i) => {
              const gross = Math.floor((l.quantityMilli * l.unitPriceMinor + 500) / 1000);
              const net = gross - Math.floor((gross * l.discountBps + 5000) / 10000);
              return (
                <tr key={i} className="border-b border-ink-100 align-top">
                  <td className="px-2 py-2">
                    {l.description || <span className="text-ink-400">—</span>}
                    <div className="text-[11px] text-ink-400">{l.quantityMilli / 1000} {l.unit}{l.discountBps > 0 ? ` · remise ${l.discountBps / 100} %` : ""}</div>
                  </td>
                  <td className="num px-2 py-2">{l.quantityMilli / 1000}</td>
                  <td className="num px-2 py-2">{fmt(l.unitPriceMinor)}</td>
                  <td className="num px-2 py-2">{l.discountBps > 0 ? `${l.discountBps / 100} %` : "—"}</td>
                  <td className="num px-2 py-2">{l.taxExempt ? "Exo." : `${l.taxRateBps / 100} %`}</td>
                  <td className="num px-2 py-2 font-semibold">{fmt(net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="ml-auto mt-4 w-72">
          <div className="flex justify-between py-0.5"><span className="text-ink-500">Total HT</span><strong className="tabular-nums">{fmt(calc.subtotalHT)}</strong></div>
          {calc.invDiscountTotal > 0 && <div className="flex justify-between py-0.5"><span className="text-ink-500">Remise globale</span><strong className="tabular-nums">−{fmt(calc.invDiscountTotal)}</strong></div>}
          {calc.buckets.map((b, i) => (
            <div key={i} className="flex justify-between py-0.5"><span className="text-ink-500">TVA {b.rateBps / 100} % <span className="text-ink-400">(base {fmt(b.taxable)})</span></span><strong className="tabular-nums">{fmt(b.tax)}</strong></div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t-2 pt-2" style={{ borderColor: accent }}>
            <span className="text-[14px] font-bold">{doc.docType === "AVOIR" ? "NET À DÉDUIRE" : "TOTAL TTC"}</span>
            <span className="text-[20px] font-bold tabular-nums" style={{ color: accent }}>{fmt(calc.totalTTC)}</span>
          </div>
        </div>

        {doc.taxMention && <div className="mt-2 font-semibold">{doc.taxMention}</div>}

        <div className="mt-4 flex gap-3">
          <div className="flex-1 rounded bg-ink-50 p-3 dark:bg-white/5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Mentions légales</div>
            {sellerIds.map((t, i) => <div key={i}>{t}</div>)}
            {doc.seller.cnss && <div>CNSS : {doc.seller.cnss}</div>}
          </div>
          <div className="flex-1">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Paiement</div>
            {doc.paymentMode && <div>Mode : {doc.paymentMode}</div>}
            {doc.dueDate && <div>Échéance : {ddmmyyyy(doc.dueDate)}</div>}
            {doc.seller.bankName && <div>{doc.seller.bankName}</div>}
            {doc.seller.rib && <div>RIB : {doc.seller.rib}</div>}
            {doc.seller.iban && <div>IBAN : {doc.seller.iban}</div>}
            {doc.seller.swift && <div>SWIFT : {doc.seller.swift}</div>}
          </div>
        </div>
        {doc.notes && <div className="mt-3"><div className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>Notes</div><div>{doc.notes}</div></div>}
      </div>
      <div>
        <div className="h-[3px]" style={{ backgroundColor: accent }} />
        <div className="flex items-center justify-between gap-4 px-10 py-2.5 text-[10.5px] text-ink-400 max-md:px-6">
          <span>{doc.footerText || `${doc.seller.legalName || ""} · ${doc.seller.city || ""} · ${[doc.seller.phone, doc.seller.email].filter(Boolean).join(" · ")} · ICE ${doc.seller.ice || "—"}`} · Conservation 10 ans (art. 211 CGI)</span>
        </div>
      </div>
    </div>
  );
}
