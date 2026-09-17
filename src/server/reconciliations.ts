"use server";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/server/auth";
import { z } from "zod";

export async function reconcileAvoir(_userId: string, raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = z.object({ avoirId: z.string(), invoiceId: z.string(), amountMinor: z.number().int().positive() }).parse(raw);
  const avoir = await prisma.invoice.findFirst({ where: { id: d.avoirId, ownerId, docType: "AVOIR", status: "ISSUED" } });
  const inv = await prisma.invoice.findFirst({ where: { id: d.invoiceId, ownerId, status: "ISSUED" } });
  if (!avoir || !inv) throw new Error("Avoir or invoice not found");
  if (avoir.totalTTC > 0 && d.amountMinor > avoir.totalTTC) throw new Error("Amount exceeds the credit note total");
  return prisma.avoirInvoice.create({ data: { avoirId: d.avoirId, invoiceId: d.invoiceId, amountMinor: d.amountMinor, ownerId } as never });
}

export async function removeReconciliation(id: string) {
  const { ownerId } = await requireWrite();
  const r = await prisma.avoirInvoice.findFirst({ where: { id, ownerId } });
  if (!r) throw new Error("Not found");
  await prisma.avoirInvoice.delete({ where: { id } });
}