"use server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function registerTenant(raw: unknown) {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    companyName: z.string().min(1),
    requestedSlug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
  });
  const d = schema.parse(raw);

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

  await prisma.$transaction([
    prisma.registration.update({
      where: { id },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: adminId },
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