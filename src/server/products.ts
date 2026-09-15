"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { productSchema } from "@/server/validation";

export async function listProducts(companyId?: string) {
  const u = await requireUser();
  return prisma.product.findMany({
    where: { ownerId: u.id, archived: false, ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}) },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export async function createProduct(raw: unknown) {
  const u = await requireUser();
  const d = productSchema.parse(raw);
  if (d.companyId) {
    const c = await prisma.company.findFirst({ where: { id: d.companyId, ownerId: u.id } });
    if (!c) throw new Error("not found");
  }
  return prisma.product.create({ data: { ...d, ownerId: u.id } as never });
}

export async function updateProduct(id: string, raw: unknown) {
  const u = await requireUser();
  const d = productSchema.partial().parse(raw);
  const p = await prisma.product.findFirst({ where: { id, ownerId: u.id } });
  if (!p) throw new Error("not found");
  return prisma.product.update({ where: { id }, data: d as never });
}

export async function archiveProduct(id: string) {
  const u = await requireUser();
  const p = await prisma.product.findFirst({ where: { id, ownerId: u.id } });
  if (!p) throw new Error("not found");
  return prisma.product.update({ where: { id }, data: { archived: true } });
}
