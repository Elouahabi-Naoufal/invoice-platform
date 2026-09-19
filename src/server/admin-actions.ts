"use server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/server/admin-session";
import { createRegistration } from "@/server/hub-api";

/** Public: a business requests an account. Rate-limited, no auth. */
export async function registerTenant(raw: unknown): Promise<{ ok?: true; error?: string }> {
  // Router deployments have no local hub DB; forward to the admin's hub API.
  if (process.env.APP_ROLE === "router") {
    const base = process.env.HUB_API_URL?.replace(/\/$/, "");
    const secret = process.env.HUB_API_SECRET;
    if (!base || !secret) return { error: "Registration is not configured on this gateway." };
    try {
      const res = await fetch(`${base}/api/hub/register`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-hub-secret": secret },
        body: JSON.stringify(raw),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      return data.ok ? { ok: true } : { error: data.error ?? "Registration failed." };
    } catch {
      return { error: "The registration service is unavailable. Please try again." };
    }
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!rl.ok) return { error: "Too many registration attempts. Please try again later." };
  const res = await createRegistration(raw);
  return res.ok ? { ok: true } : { error: res.error };
}

/** Router/hub: find the workspace (domain) an email belongs to. */
export async function lookupWorkspace(email: string): Promise<{ found: boolean; url?: string; companyName?: string; error?: string }> {
  // Combined hub / legacy full deployments resolve locally.
  if (process.env.APP_ROLE !== "router") {
    const { resolveTenantByEmail } = await import("@/server/hub-api");
    const res = await resolveTenantByEmail(email);
    return { found: res.found, url: res.url, companyName: res.companyName };
  }

  const base = process.env.HUB_API_URL?.replace(/\/$/, "");
  const secret = process.env.HUB_API_SECRET;
  if (!base || !secret) return { found: false, error: "Lookup is not configured on this gateway." };
  try {
    const res = await fetch(`${base}/api/hub/resolve?email=${encodeURIComponent(email)}`, {
      headers: { "x-hub-secret": secret },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { found?: boolean; url?: string; companyName?: string };
    return { found: !!data.found, url: data.url, companyName: data.companyName };
  } catch {
    return { found: false, error: "The lookup service is unavailable." };
  }
}

/** Admin: approve a registration → create the tenant, log, notify. */
export async function approveRegistration(id: string) {
  const admin = await requireAdmin();
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw new Error("not found");
  if (reg.status !== "PENDING") throw new Error("already processed");

  const now = new Date();
  await prisma.$transaction([
    prisma.registration.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: now, reviewedById: admin.id },
    }),
    prisma.tenant.create({
      data: {
        registrationId: id,
        companyName: reg.companyName,
        ownerName: reg.name,
        email: reg.email,
        phone: reg.phone,
        slug: reg.requestedSlug,
        status: "APPROVED",
        approvedAt: now,
      },
    }),
    prisma.auditLog.create({
      data: { adminId: admin.id, action: "APPROVE_REGISTRATION", registrationId: id, metadata: JSON.stringify({ slug: reg.requestedSlug }) },
    }),
  ]);

  const tenant = await prisma.tenant.findUnique({ where: { registrationId: id } });
  if (tenant) {
    const { enqueueTenantNotification } = await import("@/server/notifications");
    await enqueueTenantNotification(tenant.id, "APPROVED").catch(() => undefined);
  }
  return { ok: true };
}

/** Admin: reject a registration. */
export async function rejectRegistration(id: string) {
  const admin = await requireAdmin();
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw new Error("not found");
  if (reg.status !== "PENDING") throw new Error("already processed");

  await prisma.$transaction([
    prisma.registration.update({
      where: { id },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: admin.id },
    }),
    prisma.auditLog.create({
      data: { adminId: admin.id, action: "REJECT_REGISTRATION", registrationId: id, metadata: JSON.stringify({ slug: reg.requestedSlug }) },
    }),
  ]);
  return { ok: true };
}

const ALLOWED_STATUSES = ["SUSPENDED", "ACTIVE"] as const;

/** Admin: change a tenant's status (suspend/resume). */
export async function setTenantStatus(id: string, status: string) {
  const admin = await requireAdmin();
  if (!ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
    throw new Error("invalid status");
  }
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new Error("not found");
  await prisma.$transaction([
    prisma.tenant.update({ where: { id }, data: { status, suspendedAt: status === "SUSPENDED" ? new Date() : null } }),
    prisma.auditLog.create({ data: { adminId: admin.id, action: `TENANT_${status}`, tenantId: id } }),
  ]);
  return { ok: true };
}

/** Admin: permanently remove a registration and any tenant it created. */
export async function deleteRegistration(id: string) {
  const admin = await requireAdmin();
  const reg = await prisma.registration.findUnique({ where: { id }, include: { tenant: true } });
  if (!reg) throw new Error("not found");
  if (reg.tenant?.dokployApplicationId) {
    const { deleteApplication } = await import("@/server/dokploy");
    await deleteApplication(reg.tenant.dokployApplicationId).catch((e) => {
      console.error("[deleteRegistration] dokploy delete failed:", e instanceof Error ? e.message : e);
    });
  }
  await prisma.auditLog.create({
    data: { adminId: admin.id, action: "DELETE_REGISTRATION", registrationId: id, metadata: JSON.stringify({ slug: reg.requestedSlug }) },
  });
  await prisma.tenant.deleteMany({ where: { registrationId: id } });
  await prisma.registration.delete({ where: { id } });
  return { ok: true };
}