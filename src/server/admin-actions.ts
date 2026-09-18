"use server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  requestedSlug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(40, "Slug must be at most 40 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"),
});

export async function registerTenant(raw: unknown): Promise<{ ok?: true; error?: string }> {
  const obj = (typeof raw === "object" && raw ? { ...(raw as Record<string, unknown>) } : {}) as Record<string, unknown>;
  if (typeof obj.requestedSlug === "string") obj.requestedSlug = obj.requestedSlug.toLowerCase().trim();

  const parsed = registerSchema.safeParse(obj);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!rl.ok) return { error: "Too many registration attempts. Please try again later." };

  const slugExists = await prisma.registration.findUnique({ where: { requestedSlug: d.requestedSlug } });
  if (slugExists) return { error: "That slug is already taken. Please choose another." };

  try {
    await prisma.registration.create({ data: { ...d, status: "PENDING" } });
    return { ok: true };
  } catch {
    return { error: "Could not save your registration. Please try again." };
  }
}

export async function listRegistrations() {
  return prisma.registration.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getStats() {
  const [pending, approved, rejected] = await Promise.all([
    prisma.registration.count({ where: { status: "PENDING" } }),
    prisma.registration.count({ where: { status: "APPROVED" } }),
    prisma.registration.count({ where: { status: "REJECTED" } }),
  ]);
  return { pending, approved, rejected };
}

export async function approveRegistration(id: string, adminId: string) {
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw new Error("not found");
  if (reg.status !== "PENDING") throw new Error("already processed");

  const now = new Date();
  await prisma.$transaction([
    prisma.registration.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: now, reviewedById: adminId },
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
      data: { adminId, action: "APPROVE_REGISTRATION", registrationId: id, metadata: JSON.stringify({ slug: reg.requestedSlug }) },
    }),
  ]);

  const tenant = await prisma.tenant.findUnique({ where: { registrationId: id } });
  if (tenant) {
    const { enqueueTenantNotification } = await import("@/server/notifications");
    await enqueueTenantNotification(tenant.id, "APPROVED").catch(() => undefined);
  }
  return { ok: true };
}

export async function rejectRegistration(id: string, adminId: string) {
  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) throw new Error("not found");
  if (reg.status !== "PENDING") throw new Error("already processed");

  await prisma.$transaction([
    prisma.registration.update({
      where: { id },
      data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: adminId },
    }),
    prisma.auditLog.create({
      data: { adminId, action: "REJECT_REGISTRATION", registrationId: id, metadata: JSON.stringify({ slug: reg.requestedSlug }) },
    }),
  ]);
  return { ok: true };
}

// ── Tenants ──

export async function listTenants() {
  return prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getTenant(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: {
      provisioningJobs: { orderBy: { createdAt: "desc" }, take: 10 },
      notifications: { orderBy: { createdAt: "desc" }, take: 10 },
      supportAccesses: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function getPlatformStats() {
  const [pending, approved, rejected, tenants, active, provisioning, failed] = await Promise.all([
    prisma.registration.count({ where: { status: "PENDING" } }),
    prisma.registration.count({ where: { status: "APPROVED" } }),
    prisma.registration.count({ where: { status: "REJECTED" } }),
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { status: "PROVISIONING" } }),
    prisma.tenant.count({ where: { status: "FAILED" } }),
  ]);
  return { pending, approved, rejected, tenants, active, provisioning, failed };
}

export async function setTenantStatus(id: string, adminId: string, status: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new Error("not found");
  await prisma.$transaction([
    prisma.tenant.update({ where: { id }, data: { status, suspendedAt: status === "SUSPENDED" ? new Date() : null } }),
    prisma.auditLog.create({ data: { adminId, action: `TENANT_${status}`, tenantId: id } }),
  ]);
  return { ok: true };
}

// ── Provisioning ──

export async function listProvisioningJobs() {
  return prisma.provisioningJob.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { tenant: true } });
}

// ── Notifications ──

export async function listNotifications() {
  return prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { tenant: true } });
}

// ── Audit ──

export async function listAuditLogs() {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { admin: { select: { email: true } } } });
}