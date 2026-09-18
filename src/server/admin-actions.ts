"use server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function registerTenant(raw: unknown) {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    companyName: z.string().min(1),
    requestedSlug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  });
  const d = schema.parse(raw);

  const ip = clientIp(new Request("http://local", { headers: await headers() }));
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!rl.ok) throw new Error("Too many registration attempts. Please try again later.");

  const slugExists = await prisma.registration.findUnique({ where: { requestedSlug: d.requestedSlug } });
  if (slugExists) throw new Error("Slug already taken.");

  await prisma.registration.create({ data: { ...d, status: "PENDING" } });
  return { ok: true };
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