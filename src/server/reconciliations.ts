"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";

export async function listReconciliations(_userId?: string) {
  const u = await requireUser();
  return prisma.avoirInvoice.findMany({
    where: { ownerId: u.id },
    include: { avoir: true, invoice: { select: { invoiceNumber: true, totalTTC: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function reconcileAvoir(userId: string, raw: unknown) {
  const u = await requireUser();
  const d = z.object({ avoirId: z.string(), invoiceId: z.string(), amountMinor: z.number().int().positive() }).parse(raw);
  const avoir = await prisma.invoice.findFirst({ where: { id: d.avoirId, ownerId: u.id, docType: "AVOIR" } });
  const inv = await prisma.invoice.findFirst({ where: { id: d.invoiceId, ownerId: u.id, status: "ISSUED" } });
  if (!avoir || !inv) throw new Error("Avoir or invoice not found");
  return prisma.avoirInvoice.create({ data: { avoirId: d.avoirId, invoiceId: d.invoiceId, amountMinor: d.amountMinor, ownerId: u.id } as never });
}

export async function removeReconciliation(id: string) {
  const u = await requireUser();
  const r = await prisma.avoirInvoice.findFirst({ where: { id, ownerId: u.id } });
  if (!r) throw new Error("Not found");
  await prisma.avoirInvoice.delete({ where: { id } });
}