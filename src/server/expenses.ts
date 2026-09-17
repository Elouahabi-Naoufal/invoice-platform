"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";
import { computeCharges, expenseVat, type RateLike } from "@/domain/charges";

const schema = z.object({
  companyId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  description: z.string().min(1),
  date: z.coerce.date().default(() => new Date()),
  amountHTMinor: z.number().int().min(0),
  taxRateBps: z.number().int().min(0).max(10000).default(2000),
  taxExempt: z.boolean().default(false),
  rateIds: z.array(z.string()).default([]),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CARD", "CHECK", "OTHER"]).default("BANK_TRANSFER"),
  reference: z.string().optional().nullable(),
  billable: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

function toRateLike(r: { id: string; name: string; kind: string; percentBps: number; fixedMinor: number; capMinor: number | null }): RateLike {
  return { id: r.id, name: r.name, kind: r.kind, percentBps: r.percentBps, fixedMinor: r.fixedMinor, capMinor: r.capMinor };
}

export async function listExpenses(q?: string) {
  const { ownerId } = await requireActor();
  return prisma.expense.findMany({
    where: {
      ownerId,
      ...(q ? { OR: [{ description: { contains: q } }, { supplier: { contains: q } }, { category: { contains: q } }] } : {}),
    },
    orderBy: { date: "desc" },
    take: 200,
  });
}

export async function createExpense(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = schema.parse(raw);
  const rates = d.rateIds.length
    ? await prisma.rate.findMany({ where: { id: { in: d.rateIds }, ownerId, active: true } })
    : [];
  const { lines, total: chargesTotal } = computeCharges(rates.map(toRateLike), d.amountHTMinor);
  const vat = expenseVat(d.amountHTMinor, d.taxRateBps, d.taxExempt);
  const totalMinor = d.amountHTMinor + vat + chargesTotal;
  return prisma.expense.create({
    data: {
      ownerId,
      companyId: d.companyId || null,
      clientId: d.clientId || null,
      supplier: d.supplier || null,
      category: d.category || null,
      description: d.description,
      date: d.date,
      amountHTMinor: d.amountHTMinor,
      taxRateBps: d.taxRateBps,
      taxExempt: d.taxExempt,
      charges: JSON.stringify(lines),
      totalMinor,
      paymentMethod: d.paymentMethod,
      reference: d.reference || null,
      billable: d.billable,
      notes: d.notes || null,
    } as never,
  });
}

export async function deleteExpense(id: string) {
  const { ownerId } = await requireWrite();
  const e = await prisma.expense.findFirst({ where: { id, ownerId } });
  if (!e) throw new Error("not found");
  await prisma.expense.delete({ where: { id } });
  return { ok: true };
}
