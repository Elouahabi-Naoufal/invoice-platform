/**
 * Notification records for registration/tenant lifecycle events. Each channel
 * has an independent status so a WhatsApp failure never blocks provisioning.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail, emailConfigured } from "@/server/email";
import { whatsappGateway } from "@/server/whatsapp";
import { normalizeWhatsAppRecipient, sanitizeWhatsAppError } from "@/server/whatsapp-message";

const MAX_ATTEMPTS = 5;
const DELIVER_TIMEOUT_MS = 20_000;

export type NotificationType = "REGISTRATION_RECEIVED" | "APPROVED" | "WELCOME" | "SUSPENDED";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("delivery timed out")), ms)),
  ]);
}

interface TenantLike {
  companyName: string;
  slug: string;
  deploymentUrl: string | null;
  email: string;
  ownerPassword: string | null;
}

interface RegistrationLike {
  companyName: string;
  name: string;
  requestedSlug: string;
  email: string;
}

function tenantUrl(tenant: { slug: string; deploymentUrl: string | null }): string {
  return tenant.deploymentUrl || `https://${tenant.slug}.${process.env.TENANT_DOMAIN_SUFFIX || "invoice.naoufalelouahabi.com"}`;
}

function messageFor(n: { type: string; tenant: TenantLike | null; registration: RegistrationLike | null }): { subject: string; text: string } {
  switch (n.type) {
    case "REGISTRATION_RECEIVED": {
      const r = n.registration;
      const company = r?.companyName ?? "your business";
      const slug = r?.requestedSlug ?? "";
      return {
        subject: "We received your Invora registration",
        text: `Thanks for registering ${company}!\n\nWe received your request for the workspace name "${slug}". Our team will review it and contact you as soon as it is approved.\n\n— Invora`,
      };
    }
    case "APPROVED": {
      const t = n.tenant!;
      const eta = process.env.TENANT_ACTIVATION_ETA || "30 minutes";
      return {
        subject: "Your Invora account was approved",
        text: `Good news, ${t.companyName}!\n\nYour registration has been approved.\n\nYour platform: ${tenantUrl(t)}\n\nWe are preparing your workspace now. It will be fully activated in about ${eta}. You will receive another message with your login details as soon as it is ready.\n\n— Invora`,
      };
    }
    case "WELCOME": {
      const t = n.tenant!;
      const creds = t.ownerPassword ? `\nEmail: ${t.email}\nPassword: ${t.ownerPassword}\n` : `\nEmail: ${t.email}\n`;
      return {
        subject: "Your Invora workspace is ready",
        text: `Welcome to Invora!\n\nYour workspace for ${t.companyName} is ready to use.\n\nSign in: ${tenantUrl(t)}\n${creds}\nPlease change your password after your first sign-in (Settings → Security).\n\nIf you need help, share your support key from Settings → Support.\n\n— Invora`,
      };
    }
    case "SUSPENDED": {
      const t = n.tenant!;
      return {
        subject: "Your Invora account has been suspended",
        text: `Your Invora workspace for ${t.companyName} has been suspended. Please contact support for assistance.\n\n— Invora`,
      };
    }
    default:
      return { subject: "Invora notification", text: "You have a new notification from Invora." };
  }
}

function channelsFor(recipient: { email: string; phone: string | null }) {
  const out: { channel: string; recipient: string }[] = [{ channel: "EMAIL", recipient: recipient.email }];
  if (recipient.phone) out.push({ channel: "WHATSAPP", recipient: recipient.phone });
  return out;
}

/** Create + attempt delivery for a registration (pre-tenant) event. */
export async function enqueueRegistrationNotification(registrationId: string, type: NotificationType) {
  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg) throw new Error("not found");
  for (const c of channelsFor({ email: reg.email, phone: reg.phone })) {
    const existing = await prisma.notification.findFirst({ where: { registrationId, type, channel: c.channel } });
    if (existing) continue;
    await prisma.notification.create({ data: { registrationId, type, channel: c.channel, recipient: c.recipient, status: "PENDING" } });
  }
  // Deliver in the background; the cron worker also sweeps pending records.
  void sendPendingNotifications().catch(() => undefined);
}

/** Create + attempt delivery for a tenant event. */
export async function enqueueTenantNotification(tenantId: string, type: NotificationType) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  for (const c of channelsFor({ email: tenant.email, phone: tenant.phone })) {
    const existing = await prisma.notification.findFirst({ where: { tenantId, type, channel: c.channel } });
    if (existing) continue;
    await prisma.notification.create({ data: { tenantId, type, channel: c.channel, recipient: c.recipient, status: "PENDING" } });
  }
  void sendPendingNotifications(tenantId).catch(() => undefined);
}

async function deliver(notificationId: string): Promise<void> {
  const n = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { tenant: true, registration: true },
  });
  if (!n) throw new Error("not found");
  const { subject, text } = messageFor({ type: n.type, tenant: n.tenant, registration: n.registration });

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