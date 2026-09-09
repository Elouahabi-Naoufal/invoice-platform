import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import InvoicePreview from "@/components/InvoicePreview";

/**
 * Print-optimized rendering of the EXACT preview component.
 * The PDF engine (headless Chromium --print-to-pdf) prints this URL,
 * so the downloaded PDF is pixel-identical to the on-screen preview.
 * Same exposure as the existing public PDF-by-id route.
 */
export default async function PrintPage({ params }: { params: { id: string } }) {
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!inv) notFound();

  const seller = inv.sellerSnapshot ? JSON.parse(inv.sellerSnapshot) : {};
  if (seller.logoData && String(seller.logoData).startsWith("data:")) seller.logoPath = String(seller.logoData);
  const buyer = inv.buyerSnapshot ? JSON.parse(inv.buyerSnapshot) : {};
  const lines = inv.linesSnapshot
    ? JSON.parse(inv.linesSnapshot)
    : inv.lines.map((l) => ({
        description: l.description, quantityMilli: l.quantityMilli, unit: l.unit,
        unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps,
        taxRateBps: l.taxRateBps, taxExempt: l.taxExempt,
      }));
  const linkedNumber = inv.linkedInvoiceId
    ? (await prisma.invoice.findUnique({ where: { id: inv.linkedInvoiceId }, select: { invoiceNumber: true } }))?.invoiceNumber ?? null
    : null;

  return (
    <div className="flex min-h-screen justify-center bg-white py-0 print:block print:py-0">
      <InvoicePreview
        doc={{
          docType: inv.docType,
          invoiceNumber: inv.invoiceNumber,
          linkedNumber,
          correctionReason: inv.correctionReason,
          issueDate: inv.issueDate.toISOString().slice(0, 10),
          dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : null,
          currency: inv.currency,
          locale: inv.invoiceLocale,
          seller,
          buyer,
          lines,
          invDiscountBps: inv.invDiscountBps,
          invDiscountFixedMinor: inv.invDiscountFixedMinor,
          poNumber: inv.poNumber,
          paymentMode: inv.paymentMode,
          paymentTerms: inv.paymentTerms,
          taxMention: inv.taxMention,
          notes: inv.notes,
          footerText: inv.footerText,
        }}
      />
    </div>
  );
}
