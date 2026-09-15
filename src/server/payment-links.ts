"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";

export async function listPaymentLinks(userId: string) {
  return prisma.paymentLink.findMany({
    where: { ownerId: userId },
    include: { invoice: { select: { invoiceNumber: true, totalTTC: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createPaymentLink(userId: string, raw: unknown) {
  const u = await requireUser();
  const d = z.object({ invoiceId: z.string(), amountMinor: z.number().int().positive().optional() }).parse(raw);
  const inv = await prisma.invoice.findFirst({ where: { id: d.invoiceId, ownerId: u.id, status: "ISSUED" } });
  if (!inv) throw new Error("Invoice not found or not issued");
  const token = crypto.randomUUID().slice(0, 16);
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  return prisma.paymentLink.create({ data: { invoiceId: d.invoiceId, ownerId: u.id, token, amountMinor: d.amountMinor ?? inv.totalTTC, expiresAt } as never });
}

export async function getPaymentLink(token: string) {
  const link = await prisma.paymentLink.findFirst({ where: { token, usedAt: null, expiresAt: { gt: new Date() } } });
  if (!link) throw new Error("Link expired or not found");
  return link;
}

export async function recordPaymentLinkUse(token: string, amountMinor: number) {
  const link = await prisma.paymentLink.findFirst({ where: { token, usedAt: null } });
  if (!link) throw new Error("Invalid link");
  const inv = await prisma.invoice.findFirst({ where: { id: link.invoiceId } });
  if (!inv) throw new Error("Invoice not found");
  return prisma.$transaction([
    prisma.paymentLink.update({ where: { id: link.id }, data: { usedAt: new Date() } }),
    prisma.payment.create({ data: { invoiceId: link.invoiceId, amountMinor, currency: inv.currency, method: "ONLINE", reference: link.token } as never }),
  ]);
}