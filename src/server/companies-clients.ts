"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { companySchema, clientSchema } from "@/server/validation";

/** All queries scoped to ownerId — IDOR-safe by construction. */
export async function listCompanies() {
  const u = await requireUser();
  return prisma.company.findMany({ where: { ownerId: u.id, archived: false }, orderBy: { createdAt: "asc" } });
}

export async function getCompany(id: string) {
  const u = await requireUser();
  const c = await prisma.company.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return c;
}

export async function createCompany(raw: unknown) {
  const u = await requireUser();
  const d = companySchema.parse(raw);
  return prisma.company.create({ data: { ...d, ownerId: u.id } as never });
}

export async function updateCompany(id: string, raw: unknown) {
  const u = await requireUser();
  const d = companySchema.partial().parse(raw);
  const c = await prisma.company.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return prisma.company.update({ where: { id }, data: d as never });
}

export async function archiveCompany(id: string) {
  const u = await requireUser();
  const c = await prisma.company.findFirst({ where: { id, ownerId: u.id }, include: { invoices: { take: 1 } } });
  if (!c) throw new Error("not found");
  // History-preserving: never hard-delete a company with invoices; archive instead.
  return prisma.company.update({ where: { id }, data: { archived: true } });
}

export async function listClients(q?: string) {
  const u = await requireUser();
  return prisma.client.findMany({
    where: { ownerId: u.id, ...(q ? { OR: [{ name: { contains: q } }, { companyName: { contains: q } }, { email: { contains: q } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getClient(id: string) {
  const u = await requireUser();
  const c = await prisma.client.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return c;
}

export async function createClient(raw: unknown) {
  const u = await requireUser();
  const d = clientSchema.parse(raw);
  return prisma.client.create({ data: { ...d, ownerId: u.id } as never });
}

export async function updateClient(id: string, raw: unknown) {
  const u = await requireUser();
  const d = clientSchema.partial().parse(raw);
  const c = await prisma.client.findFirst({ where: { id, ownerId: u.id } });
  if (!c) throw new Error("not found");
  return prisma.client.update({ where: { id }, data: d as never });
}
