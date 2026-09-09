import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDoc } from "@/pdf/InvoiceDoc";
import { logoDataUri } from "@/server/companies-clients";
import React from "react";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const inv = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });

  const seller = inv.sellerSnapshot ? JSON.parse(inv.sellerSnapshot) : {};
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

  // Historical logo: frozen bytes in snapshot first; disk fallback only for pre-freeze invoices.
  const logoUri = seller.logoData && String(seller.logoData).startsWith("data:")
    ? String(seller.logoData)
    : await logoDataUri(seller.logoPath);
  if (logoUri) seller.logoPath = logoUri;

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
        seller, buyer, lines,
        invDiscountBps: inv.invDiscountBps,
        invDiscountFixedMinor: inv.invDiscountFixedMinor,
        poNumber: inv.poNumber, paymentMode: inv.paymentMode,
        taxMention: inv.taxMention, amountInWords: inv.amountInWords,
        notes: inv.notes, footerText: inv.footerText,
      },
    }) as React.ReactElement
  );
  const body = new Uint8Array(buf);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.invoiceNumber ?? inv.id}.pdf"`,
    },
  });
}
