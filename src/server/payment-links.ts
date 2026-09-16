"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";

export async function listPaymentLinks(_userId?: string) {
  const u = await requireUser();
  return prisma.paymentLink.findMany({
    where: { ownerId: u.id },
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
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new Error("Invalid amount");
  return prisma.$transaction(async (tx) => {
    const link = await tx.paymentLink.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!link) throw new Error("Link expired or not found");
    const inv = await tx.invoice.findFirst({
      where: { id: link.invoiceId, status: "ISSUED" },
      include: { payments: true },
    });
    if (!inv) throw new Error("Invoice not found or not payable");
    const paid = inv.payments.reduce((a, p) => a + p.amountMinor, 0);
    if (paid + amountMinor > inv.totalTTC) throw new Error("Amount exceeds remaining balance");
    // Atomic claim: prevents two concurrent redemptions of the same link.
    const claim = await tx.paymentLink.updateMany({ where: { id: link.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claim.count === 0) throw new Error("Link already used");
    await tx.payment.create({
      data: { invoiceId: inv.id, amountMinor, currency: inv.currency, method: "ONLINE", reference: link.token } as never,
    });
    return { ok: true };
  });
}