"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";

export async function listPublicInvoices(_userId?: string) {
  const { ownerId } = await requireActor();
  return prisma.invoice.findMany({
    where: { ownerId, status: "ISSUED", portalShared: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function togglePortalShare(invoiceId: string, enabled: boolean) {
  const { ownerId } = await requireWrite();
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, ownerId } });
  if (!inv) throw new Error("Invoice not found");
  return prisma.invoice.update({ where: { id: invoiceId }, data: { portalShared: enabled } });
}
