import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDoc } from "@/pdf/InvoiceDoc";
import { logoDataUri } from "@/server/companies-clients";
import { renderPreviewPdf } from "@/server/pdf";
import React from "react";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const inv = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Primary engine: exact on-screen preview printed to PDF.
  try {
    const buf = await renderPreviewPdf(inv.id);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${inv.invoiceNumber ?? inv.id}.pdf"`,
      },
    });
  } catch {
    // Fallback: react-pdf engine (same calcInvoice() totals, standalone layout).
  }

  const full = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!full) return NextResponse.json({ error: "not found" }, { status: 404 });

  const seller = full.sellerSnapshot ? JSON.parse(full.sellerSnapshot) : {};
  const buyer = full.buyerSnapshot ? JSON.parse(full.buyerSnapshot) : {};
  const lines = full.linesSnapshot
    ? JSON.parse(full.linesSnapshot)
    : full.lines.map((l) => ({
        description: l.description, quantityMilli: l.quantityMilli, unit: l.unit,
        unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps,
        taxRateBps: l.taxRateBps, taxExempt: l.taxExempt,
      }));

  const linkedNumber = full.linkedInvoiceId
    ? (await prisma.invoice.findUnique({ where: { id: full.linkedInvoiceId }, select: { invoiceNumber: true } }))?.invoiceNumber ?? null
    : null;

  // Historical logo: frozen bytes in snapshot first; disk fallback only for pre-freeze invoices.
  const logoUri = seller.logoData && String(seller.logoData).startsWith("data:")
    ? String(seller.logoData)
    : await logoDataUri(seller.logoPath);
  if (logoUri) seller.logoPath = logoUri;

  const buf = await renderToBuffer(
    React.createElement(InvoiceDoc, {
      inv: {
        invoiceNumber: full.invoiceNumber,
        docType: full.docType,
        linkedNumber,
        correctionReason: full.correctionReason,
        issueDate: full.issueDate.toISOString().slice(0, 10),
        dueDate: full.dueDate ? full.dueDate.toISOString().slice(0, 10) : null,
        currency: full.currency,
        locale: full.invoiceLocale,
        seller, buyer, lines,
        invDiscountBps: full.invDiscountBps,
        invDiscountFixedMinor: full.invDiscountFixedMinor,
        poNumber: full.poNumber, paymentMode: full.paymentMode,
        taxMention: full.taxMention, amountInWords: full.amountInWords,
        notes: full.notes, footerText: full.footerText,
      },
    }) as React.ReactElement
  );
  const body = new Uint8Array(buf);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${full.invoiceNumber ?? full.id}.pdf"`,
    },
  });
}
