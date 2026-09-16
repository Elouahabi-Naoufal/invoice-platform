"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { productSchema } from "@/server/validation";

export async function listProducts(companyId?: string) {
  const { ownerId } = await requireActor();
  return prisma.product.findMany({
    where: { ownerId, archived: false, ...(companyId ? { OR: [{ companyId }, { companyId: null }] } : {}) },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export async function createProduct(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = productSchema.parse(raw);
  if (d.companyId) {
    const c = await prisma.company.findFirst({ where: { id: d.companyId, ownerId } });
    if (!c) throw new Error("not found");
  }
  return prisma.product.create({ data: { ...d, ownerId } as never });
}

export async function updateProduct(id: string, raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = productSchema.partial().parse(raw);
  const p = await prisma.product.findFirst({ where: { id, ownerId } });
  if (!p) throw new Error("not found");
  return prisma.product.update({ where: { id }, data: d as never });
}

export async function archiveProduct(id: string) {
  const { ownerId } = await requireWrite();
  const p = await prisma.product.findFirst({ where: { id, ownerId } });
  if (!p) throw new Error("not found");
  return prisma.product.update({ where: { id }, data: { archived: true } });
}
