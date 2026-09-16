import { NextResponse } from "next/server";
import { requireActor } from "@/server/auth";
import { renderInvoicePdfBuffer } from "@/server/invoice-pdf";

/**
 * Authenticated owner-only PDF download.
 * Public downloads use /api/i/[token]/pdf (token-scoped, ISSUED only).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let ownerId: string;
  try {
    ownerId = (await requireActor()).ownerId;
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  let pdf;
  try {
    pdf = await renderInvoicePdfBuffer({ invoiceId: params.id, ownerId });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = new Uint8Array(pdf.buffer);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
    },
  });
}
