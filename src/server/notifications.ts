/**
 * Notification records for tenant lifecycle events. Each channel has an
 * independent status so a WhatsApp failure never blocks provisioning.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/server/email";
import { whatsappGateway } from "@/server/whatsapp";
import { normalizeWhatsAppRecipient, sanitizeWhatsAppError } from "@/server/whatsapp-message";

const MAX_ATTEMPTS = 5;
const DELIVER_TIMEOUT_MS = 20_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("delivery timed out")), ms)),
  ]);
}

export type NotificationType = "APPROVED" | "WELCOME" | "SUSPENDED";

function tenantUrl(tenant: { slug: string; deploymentUrl: string | null }): string {
  return tenant.deploymentUrl || `https://${tenant.slug}.${process.env.TENANT_DOMAIN_SUFFIX || "invoice.naoufalelouahabi.com"}`;
}

function messageFor(type: NotificationType, tenant: { companyName: string; slug: string; deploymentUrl: string | null; email: string }): { subject: string; text: string } {
  switch (type) {
    case "APPROVED":
      return {
        subject: "Your Invora registration was approved",
        text: `Good news!\n\nYour registration for ${tenant.companyName} has been approved. We are setting up your Invora workspace now and will send your access link as soon as it is ready.\n\n— Invora`,
      };
    case "WELCOME":
      return {
        subject: "Your Invora workspace is ready",
        text: `Welcome to Invora!\n\nYour workspace for ${tenant.companyName} is ready.\n\nSign in: ${tenantUrl(tenant)}\nEmail: ${tenant.email}\n\nIf you need help, share your support key from Settings → Support.\n\n— Invora`,
      };
    case "SUSPENDED":
      return {
        subject: "Your Invora account has been suspended",
        text: `Your Invora workspace for ${tenant.companyName} has been suspended. Please contact support for assistance.\n\n— Invora`,
      };
  }
}

export async function enqueueTenantNotification(tenantId: string, type: NotificationType) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");

  const channels: { channel: string; recipient: string }[] = [{ channel: "EMAIL", recipient: tenant.email }];
  if (tenant.phone) channels.push({ channel: "WHATSAPP", recipient: tenant.phone });

  for (const c of channels) {
    const existing = await prisma.notification.findFirst({ where: { tenantId, type, channel: c.channel } });
    if (existing) continue;
    await prisma.notification.create({
      data: { tenantId, type, channel: c.channel, recipient: c.recipient, status: "PENDING" },
    });
  }

  await sendPendingNotifications(tenantId);
}

async function deliver(notificationId: string): Promise<void> {
  const n = await prisma.notification.findUnique({ where: { id: notificationId }, include: { tenant: true } });
  if (!n) throw new Error("not found");
  const { subject, text } = messageFor(n.type as NotificationType, n.tenant);

  try {
    if (n.channel === "EMAIL") {
      if (!emailConfigured()) throw new Error("Email not configured");
      await sendEmail(n.recipient, subject, text);
    } else if (n.channel === "WHATSAPP") {
      const normalized = normalizeWhatsAppRecipient(n.recipient);
      await whatsappGateway.ensureReady();
      const chatId = await whatsappGateway.resolveChatId(normalized);
      if (!chatId) throw new Error("number is not registered on WhatsApp");
      await whatsappGateway.sendText(chatId, text);
    } else {
      throw new Error(`unknown channel ${n.channel}`);
    }

    await prisma.notification.update({
      where: { id: n.id },
      data: { status: "SENT", sentAt: new Date(), lastError: null, attempts: { increment: 1 } },
    });
  } catch (e) {
    const message = sanitizeWhatsAppError(e);
    await prisma.notification.update({
      where: { id: n.id },
      data: { status: "FAILED", lastError: message, attempts: { increment: 1 } },
    });
  }
}

export async function sendPendingNotifications(tenantId?: string) {
  const pending = await prisma.notification.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: MAX_ATTEMPTS }, ...(tenantId ? { tenantId } : {}) },
    orderBy: { createdAt: "asc" },
    take: 25,
  });
  for (const n of pending) {
    await withTimeout(deliver(n.id), DELIVER_TIMEOUT_MS).catch(async (e) => {
      await prisma.notification
        .update({ where: { id: n.id }, data: { status: "FAILED", lastError: e instanceof Error ? e.message : "timed out", attempts: { increment: 1 } } })
        .catch(() => undefined);
    });
  }
  return { processed: pending.length };
}

export async function retryNotification(id: string) {
  await prisma.notification.update({ where: { id }, data: { status: "PENDING", lastError: null } });
  await deliver(id);
  const n = await prisma.notification.findUnique({ where: { id } });
  return { ok: true, status: n?.status ?? "unknown" };
}