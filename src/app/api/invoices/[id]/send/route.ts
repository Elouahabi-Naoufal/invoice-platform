import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { logoDataUri } from "@/server/companies-clients";
import { renderPreviewPdf } from "@/server/pdf";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireUser(); } catch { return new NextResponse("unauthorized", { status: 401 }); }
  const { to, subject, message } = await req.json();
  if (!to || !String(to).includes("@")) return new NextResponse("recipient invalid", { status: 400 });
  const inv = await prisma.invoice.findFirst({ where: { id: params.id, ownerId: user.id }, include: { lines: { orderBy: { position: "asc" } } } });
  if (!inv || inv.status !== "ISSUED") return new NextResponse("only ISSUED sendable", { status: 400 });

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_FROM) return new NextResponse("SMTP not configured — not marked sent", { status: 500 });

  const seller = inv.sellerSnapshot ? JSON.parse(inv.sellerSnapshot) : {};
  const buyer = inv.buyerSnapshot ? JSON.parse(inv.buyerSnapshot) : {};
  const logoUri = seller.logoData && String(seller.logoData).startsWith("data:")
    ? String(seller.logoData)
    : await logoDataUri(seller.logoPath);
  if (logoUri) seller.logoPath = logoUri;
  const lines = inv.linesSnapshot ? JSON.parse(inv.linesSnapshot) : inv.lines;
  const linkedNumber = inv.linkedInvoiceId
    ? (await prisma.invoice.findUnique({ where: { id: inv.linkedInvoiceId }, select: { invoiceNumber: true } }))?.invoiceNumber ?? null
    : null;
  const buf = await renderPreviewPdf(inv.id).catch(async () => {
    // Fallback: react-pdf engine (same calcInvoice() totals).
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { InvoiceDoc } = await import("@/pdf/InvoiceDoc");
    const React = await import("react");
    return renderToBuffer(
      React.createElement(InvoiceDoc, {
        inv: {
          invoiceNumber: inv.invoiceNumber, docType: inv.docType, linkedNumber, correctionReason: inv.correctionReason,
          issueDate: inv.issueDate.toISOString().slice(0, 10),
          dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : null,
          currency: inv.currency, locale: inv.invoiceLocale, seller, buyer, lines,
          invDiscountBps: inv.invDiscountBps, invDiscountFixedMinor: inv.invDiscountFixedMinor,
          poNumber: inv.poNumber, paymentMode: inv.paymentMode, taxMention: inv.taxMention,
          amountInWords: inv.amountInWords, notes: inv.notes, footerText: inv.footerText,
        },
      }) as React.ReactElement
    );
  });

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/i/${inv.publicToken}`;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST, port: Number(SMTP_PORT ?? 587), secure: Number(SMTP_PORT ?? 587) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: String(to),
      subject: subject || `Facture ${inv.invoiceNumber} — ${(seller.legalName as string) ?? ""}`,
      text: message || `Bonjour,\n\nVeuillez trouver ci-joint la facture ${inv.invoiceNumber} (${(inv.totalTTC / 100).toFixed(2)} ${inv.currency}).\nLien public : ${publicUrl}\n\nCordialement.`,
      attachments: [{ filename: `${inv.invoiceNumber ?? inv.id}.pdf`, content: Buffer.from(buf) }],
    });
  } catch (e) {
    // Provider failure → NOT marked sent. Client must surface the error.
    return new NextResponse(`send failed: ${e instanceof Error ? e.message : e}`, { status: 502 });
  }
  await prisma.invoiceEvent.create({ data: { invoiceId: inv.id, actorId: user.id, type: "send_attempt_ok", metadata: String(to) } });
  return NextResponse.json({ ok: true });
}
