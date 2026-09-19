"use server";
import { requireAdmin } from "@/server/admin-session";
import { prisma } from "@/lib/prisma";
import { startProvisioning, retryProvisioning } from "@/server/provisioning";
import { generateSupportAccess, revokeSupportAccess } from "@/server/support";
import { retryNotification, sendPendingNotifications } from "@/server/notifications";
import { setTenantStatus } from "@/server/admin-actions";
import { stopApplication, startApplication, deleteApplication } from "@/server/dokploy";

export async function provisionTenant(tenantId: string) {
  const admin = await requireAdmin();
  return startProvisioning(tenantId, admin.id);
}

export async function retryTenantProvisioning(tenantId: string) {
  const admin = await requireAdmin();
  return retryProvisioning(tenantId, admin.id);
}

/** Suspend: stop the container, then mark the tenant suspended. */
export async function suspendTenant(tenantId: string) {
  const admin = await requireAdmin();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  if (tenant.dokployApplicationId) {
    await stopApplication(tenant.dokployApplicationId).catch((e) => {
      console.error("[suspend] dokploy stop failed:", e instanceof Error ? e.message : e);
    });
  }
  await setTenantStatus(tenantId, "SUSPENDED");
  await prisma.auditLog.create({ data: { adminId: admin.id, action: "TENANT_SUSPENDED", tenantId } });
  return { ok: true };
}

/** Resume: start the container, then mark the tenant active. */
export async function resumeTenant(tenantId: string) {
  const admin = await requireAdmin();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  if (tenant.dokployApplicationId) {
    await startApplication(tenant.dokployApplicationId).catch((e) => {
      console.error("[resume] dokploy start failed:", e instanceof Error ? e.message : e);
    });
  }
  await setTenantStatus(tenantId, "ACTIVE");
  await prisma.auditLog.create({ data: { adminId: admin.id, action: "TENANT_RESUMED", tenantId } });
  return { ok: true };
}

/** Permanently delete a tenant and its Dokploy application. */
export async function deleteTenant(tenantId: string) {
  const admin = await requireAdmin();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  if (tenant.dokployApplicationId) {
    await deleteApplication(tenant.dokployApplicationId).catch((e) => {
      console.error("[delete] dokploy delete failed:", e instanceof Error ? e.message : e);
    });
  }
  await prisma.auditLog.create({
    data: { adminId: admin.id, action: "TENANT_DELETED", tenantId, metadata: JSON.stringify({ slug: tenant.slug, companyName: tenant.companyName }) },
  });
  await prisma.tenant.delete({ where: { id: tenantId } });
  return { ok: true };
}

export async function requestSupportAccess(tenantId: string, providedKey: string) {
  const admin = await requireAdmin();
  const res = await generateSupportAccess(tenantId, admin.id, providedKey);
  return { url: res.url, expiresAt: res.expiresAt.toISOString() };
}

export async function revokeTenantSupport(tenantId: string) {
  const admin = await requireAdmin();
  return revokeSupportAccess(tenantId, admin.id);
}

export async function resendNotification(id: string) {
  await requireAdmin();
  return retryNotification(id);
}

export async function processNotifications() {
  await requireAdmin();
  return sendPendingNotifications();
}

export async function sendTenantNotification(tenantId: string, type: "APPROVED" | "WELCOME") {
  await requireAdmin();
  const { enqueueTenantNotification, sendPendingNotifications } = await import("@/server/notifications");
  // Ensure the records exist, then force a fresh attempt even if one already
  // exists (so the manual button always actually sends).
  await enqueueTenantNotification(tenantId, type);
  await prisma.notification.updateMany({
    where: { tenantId, type },
    data: { status: "PENDING", lastError: null, attempts: 0 },
  });
  const res = await sendPendingNotifications(tenantId);
  return { ok: true, processed: res.processed };
}

export async function saveNotificationTemplate(type: string, data: { subject: string; body: string; enabled: boolean }) {
  await requireAdmin();
  const { upsertTemplate, TEMPLATE_TYPES } = await import("@/server/notification-templates");
  if (!TEMPLATE_TYPES.includes(type as (typeof TEMPLATE_TYPES)[number])) throw new Error("invalid template type");
  await upsertTemplate(type as (typeof TEMPLATE_TYPES)[number], data);
  return { ok: true };
}

export async function resetNotificationTemplate(type: string) {
  await requireAdmin();
  const { resetTemplate, TEMPLATE_TYPES } = await import("@/server/notification-templates");
  if (!TEMPLATE_TYPES.includes(type as (typeof TEMPLATE_TYPES)[number])) throw new Error("invalid template type");
  await resetTemplate(type as (typeof TEMPLATE_TYPES)[number]);
  return { ok: true };
}