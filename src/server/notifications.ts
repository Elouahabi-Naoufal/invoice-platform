/**
 * Notification records for tenant lifecycle events. Each channel has an
 * independent status so a WhatsApp failure never blocks provisioning.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/server/email";
import { whatsappGateway } from "@/server/whatsapp";
import { normalizeWhatsAppRecipient, sanitizeWhatsAppError } from "@/server/whatsapp-message";

const MAX_ATTEMPTS = 5;

function welcomeText(tenant: { companyName: string; slug: string; deploymentUrl: string | null; email: string }) {
  const url = tenant.deploymentUrl || `https://${tenant.slug}.${process.env.TENANT_DOMAIN_SUFFIX || "invoice.naoufalelouahabi.com"}`;
  return `Welcome to Invora!\n\nYour workspace for ${tenant.companyName} is ready.\n\nSign in: ${url}\nEmail: ${tenant.email}\n\nIf you need help, share your support key from Settings → Support.`;
}

export async function enqueueWelcomeNotifications(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");

  const channels: { channel: string; recipient: string }[] = [
    { channel: "EMAIL", recipient: tenant.email },
  ];
  if (tenant.phone) channels.push({ channel: "WHATSAPP", recipient: tenant.phone });

  for (const c of channels) {
    const existing = await prisma.notification.findFirst({
      where: { tenantId, type: "WELCOME", channel: c.channel },
    });
    if (existing) continue;
    await prisma.notification.create({
      data: { tenantId, type: "WELCOME", channel: c.channel, recipient: c.recipient, status: "PENDING" },
    });
  }

  // Best-effort immediate send; failures are captured per-notification.
  await sendPendingNotifications(tenantId);
}

async function deliver(notificationId: string): Promise<void> {
  const n = await prisma.notification.findUnique({ where: { id: notificationId }, include: { tenant: true } });
  if (!n) throw new Error("not found");
  const text = welcomeText(n.tenant);

  try {
    if (n.channel === "EMAIL") {
      if (!emailConfigured()) throw new Error("Email not configured");
      await sendEmail(n.recipient, "Your Invora workspace is ready", text);
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
    await deliver(n.id);
  }
  return { processed: pending.length };
}

export async function retryNotification(id: string) {
  await prisma.notification.update({ where: { id }, data: { status: "PENDING", lastError: null } });
  await deliver(id);
  const n = await prisma.notification.findUnique({ where: { id } });
  return { ok: true, status: n?.status ?? "unknown" };
}