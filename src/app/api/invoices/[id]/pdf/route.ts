import { NextResponse } from "next/server";
import { renderInvoicePdfBuffer } from "@/server/invoice-pdf";

/**
 * Primary engine: @react-pdf/renderer (v3, pinned for React 18).
 * Full-bleed A4 stationery, fully controlled layout — no browser involved.
 * Totals come from calcInvoice(), the same engine as the web preview.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let pdf;
  try {
    pdf = await renderInvoicePdfBuffer({ invoiceId: params.id });
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
