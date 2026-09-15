"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";

export async function listPublicInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { ownerId: userId, status: "ISSUED", portalShared: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function togglePortalShare(invoiceId: string, enabled: boolean) {
  const u = await requireUser();
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, ownerId: u.id } });
  if (!inv) throw new Error("Invoice not found");
  return prisma.invoice.update({ where: { id: invoiceId }, data: { portalShared: enabled } });
}