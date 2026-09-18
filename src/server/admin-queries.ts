/**
 * Read-only admin queries. This module is intentionally NOT a "use server"
 * file: every export of a "use server" module becomes a public HTTP endpoint,
 * so queries must never live there. Server components import these directly.
 */
import { prisma } from "@/lib/prisma";

export async function listRegistrations() {
  return prisma.registration.findMany({ orderBy: { createdAt: "desc" } });
}

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

export async function listProvisioningJobs() {
  return prisma.provisioningJob.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { tenant: true } });
}

export async function listNotifications() {
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tenant: true, registration: true },
  });
}

export async function listAuditLogs() {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { admin: { select: { email: true } } } });
}