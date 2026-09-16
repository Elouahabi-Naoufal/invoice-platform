import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { renderInvoicePdfBuffer } from "@/server/invoice-pdf";
import { buildTransport, buildGoogleTransport, fromHeader } from "@/server/email-transport";
import { googleConfig } from "@/server/google-oauth";
import { decryptSecret } from "@/lib/crypto";

export interface SendInvoiceEmailOptions {
  to?: string | null;
  subject?: string | null;
  message?: string | null;
}

export interface SendInvoiceEmailResult {
  ok: true;
  to: string;
}

function parseSnapshot(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * Resolve the outbound mail transport for an owner:
 * 1. the owner's connected mailbox (Settings → Email), else
 * 2. environment SMTP (SMTP_HOST/SMTP_FROM) as a fallback.
 */
async function resolveSmtp(ownerId: string): Promise<{ transport: ReturnType<typeof buildTransport>; from: string; replyTo?: string }> {
  const settings = await prisma.emailSettings.findUnique({ where: { ownerId } });
  if (settings && settings.enabled) {
    const from = fromHeader({ fromAddress: settings.fromAddress, fromName: settings.fromName ?? undefined });
    const replyTo = settings.replyTo ?? undefined;
    if (settings.authType === "GOOGLE" && settings.oauthRefreshTokenEnc) {
      const { clientId, clientSecret } = googleConfig();
      const refreshToken = decryptSecret(settings.oauthRefreshTokenEnc);
      if (clientId && clientSecret && refreshToken) {
        return {
          transport: buildGoogleTransport({ user: settings.fromAddress, clientId, clientSecret, refreshToken }),
          from,
          replyTo,
        };
      }
    }
    return {
      transport: buildTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        username: settings.username ?? undefined,
        password: decryptSecret(settings.passwordEnc) ?? undefined,
        fromAddress: settings.fromAddress,
        fromName: settings.fromName ?? undefined,
      }),
      from,
      replyTo,
    };
  }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (SMTP_HOST && SMTP_FROM) {
    return {
      transport: nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 587),
        secure: Number(SMTP_PORT ?? 587) === 465,
        auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      }),
      from: SMTP_FROM,
    };
  }
  throw new Error("Email not configured — connect your email in Settings");
}

/**
 * Send an ISSUED invoice PDF by email and mark it sent server-side.
 * Server-only (not a "use server" action): ownerId must come from an
 * authenticated request or the scheduler. Marks SENT only after SMTP accepts.
 */
export async function sendInvoiceEmail(
  ownerId: string,
  invoiceId: string,
  opts: SendInvoiceEmailOptions = {}
): Promise<SendInvoiceEmailResult> {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, ownerId },
    include: { lines: { orderBy: { position: "asc" } }, client: true },
  });
  if (!inv) throw new Error("not found");
  if (inv.status !== "ISSUED") throw new Error("only ISSUED sendable");

  const buyer = parseSnapshot(inv.buyerSnapshot);
  const to = (opts.to || inv.client?.email || str(buyer.email)).trim();
  if (!to || !to.includes("@")) throw new Error("recipient invalid");

  const { transport, from, replyTo } = await resolveSmtp(ownerId);

  const seller = parseSnapshot(inv.sellerSnapshot);
  const { buffer, filename } = await renderInvoicePdfBuffer({ invoiceId: inv.id, ownerId });
  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/i/${inv.publicToken}`;
  const defaultSubject = `Facture ${inv.invoiceNumber} — ${str(seller.legalName)}`.trim();
  const defaultText = `Bonjour,\n\nVeuillez trouver ci-joint la facture ${inv.invoiceNumber} (${(inv.totalTTC / 100).toFixed(2)} ${inv.currency}).\nLien public : ${publicUrl}\n\nCordialement.`;

  try {
    await transport.sendMail({
      from,
      to,
      replyTo,
      subject: opts.subject || defaultSubject,
      text: opts.message || defaultText,
      attachments: [{ filename, content: buffer }],
    });
  } catch (e) {
    // Provider failure → NOT marked sent.
    throw new Error(`send failed: ${e instanceof Error ? e.message : e}`);
  }

  await prisma.invoice.update({
    where: { id: inv.id },
    data: {
      sentAt: new Date(),
      sentTo: to,
      events: { create: [{ actorId: ownerId, type: "sent", metadata: to }] },
    },
  });
  return { ok: true, to };
}
