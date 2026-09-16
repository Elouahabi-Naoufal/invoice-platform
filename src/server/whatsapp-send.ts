/**
 * WhatsApp invoice sending. Server-only (NOT a "use server" action):
 * ownerId must come from the authenticated API route.
 */
import { prisma } from "@/lib/prisma";
import { renderInvoicePdfBuffer } from "@/server/invoice-pdf";
import { whatsappGateway, type WhatsAppGateway } from "@/server/whatsapp";
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  WHATSAPP_SEND_LOCK_TTL_MS,
  normalizeWhatsAppRecipient,
  renderWhatsAppTemplate,
  sanitizeWhatsAppError,
} from "@/server/whatsapp-message";

export interface WhatsAppSendOptions {
  to?: unknown;
  gateway?: WhatsAppGateway;
}

export interface WhatsAppSendResult {
  alreadySent: boolean;
  status: string;
  messageId: string | null;
  to: string;
}

function parseSnapshot(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Send an ISSUED invoice PDF through WhatsApp.
 * The SENDING/SENT/FAILED transition happens server-side only after provider
 * confirmation. SENT invoices are idempotent: repeats return alreadySent.
 */
export async function sendInvoiceViaWhatsApp(
  ownerId: string,
  invoiceId: string,
  options: WhatsAppSendOptions = {}
): Promise<WhatsAppSendResult> {
  const gateway = options.gateway ?? whatsappGateway;
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, ownerId },
    include: { company: true, client: true },
  });
  if (!inv) throw new Error("not found");
  if (inv.status !== "ISSUED") throw new Error("only ISSUED sendable");
  if (!inv.company || !inv.company.whatsappEnabled) {
    throw new Error("WhatsApp sending is disabled for this company");
  }
  if (inv.whatsappStatus === "SENT") {
    return {
      alreadySent: true,
      status: inv.whatsappStatus,
      messageId: inv.whatsappMessageId,
      to: inv.whatsappSentTo ?? "",
    };
  }

  const buyer = parseSnapshot(inv.buyerSnapshot);
  const seller = parseSnapshot(inv.sellerSnapshot);
  const to = normalizeWhatsAppRecipient(options.to ?? inv.client?.phone ?? buyer.phone);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!inv.publicToken || !appUrl) throw new Error("public link unavailable");

  const caption = renderWhatsAppTemplate(inv.company.whatsappTemplate ?? DEFAULT_WHATSAPP_TEMPLATE, {
    docType: inv.docType,
    number: inv.invoiceNumber,
    amountMinor: inv.totalTTC,
    currency: inv.currency,
    seller: text(seller.tradeName) || text(seller.legalName) || "votre fournisseur",
    buyer: text(buyer.companyName) || text(buyer.name) || "cher client",
    url: `${appUrl}/i/${inv.publicToken}`,
    dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : null,
  });

  const now = new Date();
  const staleBefore = new Date(now.getTime() - WHATSAPP_SEND_LOCK_TTL_MS);
  // Atomic claim: only one concurrent request can move the row into SENDING.
  const claim = await prisma.invoice.updateMany({
    where: {
      id: inv.id,
      ownerId,
      status: "ISSUED",
      OR: [
        { whatsappStatus: { in: ["NOT_SENT", "FAILED"] } },
        { whatsappStatus: "SENDING", whatsappLastAttemptAt: { lt: staleBefore } },
      ],
    },
    data: { whatsappStatus: "SENDING", whatsappLastAttemptAt: now, whatsappError: null },
  });
  if (claim.count === 0) throw new Error("WhatsApp send already in progress");
  console.info(`[whatsapp] attempt invoice=${inv.id} to=${to}`);

  try {
    const { buffer, filename } = await renderInvoicePdfBuffer({ invoiceId: inv.id, ownerId });
    if (buffer.length === 0) throw new Error("empty PDF");
    await gateway.ensureReady();
    const chatId = await gateway.resolveChatId(to);
    if (!chatId) throw new Error("number is not registered on WhatsApp");
    const { messageId } = await gateway.sendDocument({ chatId, caption, pdf: buffer, filename });
    const sentAt = new Date();
    const [updated] = await prisma.$transaction([
      prisma.invoice.update({
        where: { id: inv.id },
        data: {
          whatsappStatus: "SENT",
          whatsappSentAt: sentAt,
          whatsappSentTo: to,
          whatsappMessageId: messageId,
          whatsappError: null,
        },
      }),
      prisma.invoiceEvent.create({
        data: {
          invoiceId: inv.id,
          actorId: ownerId,
          type: "whatsapp_sent",
          metadata: JSON.stringify({ to, messageId }),
        },
      }),
    ]);
    console.info(`[whatsapp] sent invoice=${inv.id} message=${messageId}`);
    return { alreadySent: false, status: updated.whatsappStatus, messageId, to };
  } catch (error) {
    const message = sanitizeWhatsAppError(error);
    try {
      await prisma.$transaction([
        prisma.invoice.update({
          where: { id: inv.id },
          data: { whatsappStatus: "FAILED", whatsappError: message, whatsappLastAttemptAt: new Date() },
        }),
        prisma.invoiceEvent.create({
          data: {
            invoiceId: inv.id,
            actorId: ownerId,
            type: "whatsapp_failed",
            metadata: JSON.stringify({ to, error: message }),
          },
        }),
      ]);
    } catch (dbError) {
      console.error(`[whatsapp] status update failed invoice=${inv.id} error=${sanitizeWhatsAppError(dbError)}`);
    }
    console.error(`[whatsapp] failed invoice=${inv.id} error=${message}`);
    throw new Error(message);
  }
}
