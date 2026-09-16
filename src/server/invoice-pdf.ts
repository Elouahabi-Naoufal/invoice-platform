/**
 * Shared PDF renderer for API sends.
 * Renders from frozen snapshots when present (same legal source as the PDF route).
 * Server-only (NOT a "use server" action): callers must enforce auth/lifecycle.
 */
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { logoDataUri } from "@/server/companies-clients";
import { InvoiceDoc } from "@/pdf/InvoiceDoc";

/**
 * Shared PDF renderer for API sends.
 * Renders from frozen snapshots when present (same legal source as the PDF route).
 * Callers enforce auth/lifecycle: pass ownerId for private sends, omit it only
 * for the existing unauthenticated public PDF route behavior.
 */
export async function renderInvoicePdfBuffer(opts: { invoiceId: string; ownerId?: string }): Promise<{
  buffer: Buffer;
  filename: string;
}> {
  const inv = await prisma.invoice.findFirst({
    where: { id: opts.invoiceId, ...(opts.ownerId ? { ownerId: opts.ownerId } : {}) },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!inv) throw new Error("not found");

  const seller = inv.sellerSnapshot ? JSON.parse(inv.sellerSnapshot) : {};
  const buyer = inv.buyerSnapshot ? JSON.parse(inv.buyerSnapshot) : {};
  const lines = inv.linesSnapshot
    ? JSON.parse(inv.linesSnapshot)
    : inv.lines.map((l) => ({
        description: l.description,
        quantityMilli: l.quantityMilli,
        unit: l.unit,
        unitPriceMinor: l.unitPriceMinor,
        discountBps: l.discountBps,
        taxRateBps: l.taxRateBps,
        taxExempt: l.taxExempt,
      }));

  const linkedNumber = inv.linkedInvoiceId
    ? (await prisma.invoice.findUnique({ where: { id: inv.linkedInvoiceId }, select: { invoiceNumber: true } }))?.invoiceNumber ?? null
    : null;

  // Historical logo: frozen bytes in snapshot first; disk fallback only for pre-freeze invoices.
  const logoUri = seller.logoData && String(seller.logoData).startsWith("data:")
    ? String(seller.logoData)
    : await logoDataUri(seller.logoPath);
  if (logoUri) seller.logoPath = logoUri;
  // Same for the signature.
  const sigUri = seller.signatureData && String(seller.signatureData).startsWith("data:")
    ? String(seller.signatureData)
    : await logoDataUri(seller.signaturePath);
  if (sigUri) seller.signatureData = sigUri;

  const buf = await renderToBuffer(
    React.createElement(InvoiceDoc, {
      inv: {
        invoiceNumber: inv.invoiceNumber,
        docType: inv.docType,
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
        validUntil: inv.validUntil ? inv.validUntil.toISOString().slice(0, 10) : null,
        taxMention: inv.taxMention,
        amountInWords: inv.amountInWords,
        notes: inv.notes,
        footerText: inv.footerText,
      },
    }) as React.ReactElement
  );
  return { buffer: Buffer.from(buf), filename: `${inv.invoiceNumber ?? inv.id}.pdf` };
}
