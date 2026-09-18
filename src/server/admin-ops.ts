"use server";
import { requireAdmin } from "@/server/admin-auth";
import { startProvisioning, retryProvisioning } from "@/server/provisioning";
import { generateSupportAccess, revokeSupportAccess } from "@/server/support";
import { retryNotification, sendPendingNotifications } from "@/server/notifications";
import { setTenantStatus } from "@/server/admin-actions";

export async function provisionTenant(tenantId: string) {
  const admin = await requireAdmin();
  return startProvisioning(tenantId, admin.id);
}

export async function retryTenantProvisioning(tenantId: string) {
  const admin = await requireAdmin();
  return retryProvisioning(tenantId, admin.id);
}

export async function suspendTenant(tenantId: string) {
  const admin = await requireAdmin();
  return setTenantStatus(tenantId, admin.id, "SUSPENDED");
}

export async function resumeTenant(tenantId: string) {
  const admin = await requireAdmin();
  return setTenantStatus(tenantId, admin.id, "ACTIVE");
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
  const { enqueueTenantNotification } = await import("@/server/notifications");
  await enqueueTenantNotification(tenantId, type);
  return { ok: true };
}