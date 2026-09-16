import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderInvoicePdfBuffer } from "@/server/invoice-pdf";

/**
 * Public PDF download scoped to the high-entropy publicToken.
 * Only ISSUED invoices are downloadable — never drafts/cancelled.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const inv = await prisma.invoice.findFirst({
    where: { publicToken: params.token, status: "ISSUED" },
    select: { id: true, ownerId: true },
  });
  if (!inv) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const pdf = await renderInvoicePdfBuffer({ invoiceId: inv.id, ownerId: inv.ownerId });
    const body = new Uint8Array(pdf.buffer);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf.filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
