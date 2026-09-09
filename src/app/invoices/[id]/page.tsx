import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getInvoiceDetail } from "@/server/invoice-ops";
import InvoiceActions from "@/components/InvoiceActions";
import InvoicePreview from "@/components/InvoicePreview";
import { StatusBadge } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

export default async function DetailPage({ params }: { params: { id: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  let inv;
  try { inv = await getInvoiceDetail(params.id); } catch { redirect("/invoices"); }
  const buckets = (inv.taxBreakdown ? JSON.parse(inv.taxBreakdown) : []) as { rateBps: number; taxable: number; tax: number }[];
  const lines = (inv.linesSnapshot ? JSON.parse(inv.linesSnapshot) : inv.lines.map((l) => ({
    description: l.description, quantityMilli: l.quantityMilli, unit: l.unit,
    unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps, taxRateBps: l.taxRateBps, taxExempt: l.taxExempt,
  })));

  return (
    <div>
      <Link href="/invoices" className="mb-3 inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-950">
        <ChevronLeft size={15} /> Invoices
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="page-title">{inv.invoiceNumber ?? "Draft"}</h1>
        <StatusBadge value={inv.display} />
        <span className="meta">{inv.docType} · {inv.currency}</span>
        <div className="ml-auto"><InvoiceActions inv={{
          id: inv.id, status: inv.status, docType: inv.docType, invoiceNumber: inv.invoiceNumber,
          totalTTC: inv.totalTTC, remaining: inv.remaining, currency: inv.currency, publicToken: inv.publicToken,
          sellerName: (inv.sellerView as { legalName?: string })?.legalName ?? "?",
          buyerName: (inv.buyerView as { companyName?: string; name?: string })?.companyName ?? (inv.buyerView as { name?: string })?.name ?? "?",
          issueDate: inv.issueDate.toISOString().slice(0, 10),
          dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : null,
        }} /></div>
      </div>

      <div className="flex items-start justify-center gap-6 max-xl:flex-col max-xl:items-center">
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
        <div className="grid w-[300px] shrink-0 gap-3 max-xl:w-full max-xl:max-w-[600px]">
          <div className="card p-4">
            <div className="section-title mb-2">Payment</div>
            <div className="text-[20px] font-semibold tabular-nums">{formatMoney(inv.paidAmount, inv.currency)}</div>
            <div className="meta">paid of {formatMoney(inv.totalTTC, inv.currency)} · {formatMoney(inv.remaining, inv.currency)} remaining</div>
            <div className="mt-2 flex flex-col gap-1.5">
              {inv.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-[13px]">
                  <span className="text-ink-500">{new Date(p.paymentDate).toLocaleDateString()} · {p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
                  <span className="font-medium tabular-nums">{formatMoney(p.amountMinor, inv.currency)}</span>
                </div>
              ))}
              {inv.payments.length === 0 && <span className="meta">No payments recorded.</span>}
            </div>
          </div>
          <div className="card p-4">
            <div className="section-title mb-2">Tax breakdown</div>
            {buckets.map((b, i) => (
              <div key={i} className="flex justify-between py-0.5 text-[13px]">
                <span className="text-ink-500">TVA {b.rateBps / 100}% <span className="text-ink-400">(base {formatMoney(b.taxable, inv.currency)})</span></span>
                <span className="tabular-nums">{formatMoney(b.tax, inv.currency)}</span>
              </div>
            ))}
            {inv.taxMention && <div className="mt-1.5 text-[13px] font-semibold">{inv.taxMention}</div>}
          </div>
          <div className="card p-4">
            <div className="section-title mb-2">Activity</div>
            <ol className="relative ml-1.5 flex flex-col gap-2.5 border-l border-ink-200 pl-4">
              {inv.events.map((e) => (
                <li key={e.id} className="relative text-[13px]">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-ink-200 ring-2 ring-white" />
                  <span className="font-medium">{e.type.replace(/_/g, " ")}</span>
                  <span className="meta block">{new Date(e.createdAt).toLocaleString()}{e.metadata ? ` · ${e.metadata}` : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
