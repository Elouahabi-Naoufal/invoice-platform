"use server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/server/admin-session";

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

/** Public: a business requests an account. Rate-limited, no auth. */
export async function registerTenant(raw: unknown): Promise<{ ok?: true; error?: string }> {
  const obj = (typeof raw === "object" && raw ? { ...(raw as Record<string, unknown>) } : {}) as Record<string, unknown>;
  if (typeof obj.requestedSlug === "string") obj.requestedSlug = obj.requestedSlug.toLowerCase().trim();

  const parsed = registerSchema.safeParse(obj);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60_000);
  if (!rl.ok) return { error: "Too many registration attempts. Please try again later." };

  const existing = await prisma.registration.findUnique({ where: { requestedSlug: d.requestedSlug } });
  if (existing) {
    if (existing.status === "REJECTED") {
      // A rejected slug may be claimed again: replace the old record.
      await prisma.registration.delete({ where: { id: existing.id } }).catch(() => undefined);
    } else {
      return { error: "That slug is already taken. Please choose another." };
    }
  }

  try {
    const reg = await prisma.registration.create({ data: { ...d, status: "PENDING" } });
    const { enqueueRegistrationNotification } = await import("@/server/notifications");
    await enqueueRegistrationNotification(reg.id, "REGISTRATION_RECEIVED").catch(() => undefined);
    return { ok: true };
  } catch {
    return { error: "Could not save your registration. Please try again." };
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