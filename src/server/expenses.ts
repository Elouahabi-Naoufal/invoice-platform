"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";
import { computeCharges, expenseVat, type RateLike } from "@/domain/charges";
import { createDraftInvoice } from "@/server/invoices";

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
  currency: z.string().default("MAD"),
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
  const expense = await prisma.expense.create({
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
      currency: d.currency,
      paymentMethod: d.paymentMethod,
      reference: d.reference || null,
      billable: d.billable,
      notes: d.notes || null,
    } as never,
  });

  // Auto-post the outflow to the money ledger.
  const account = await prisma.account.findFirst({ where: { ownerId, currency: d.currency, active: true }, orderBy: { createdAt: "asc" } });
  if (account) {
    await prisma.ledgerEntry.create({
      data: {
        ownerId,
        accountId: account.id,
        direction: "OUT",
        amountMinor: totalMinor,
        currency: d.currency,
        label: d.description,
        category: d.category || "Expense",
        expenseId: expense.id,
        date: d.date,
      },
    });
  }
  return expense;
}

export async function deleteExpense(id: string) {
  const { ownerId } = await requireWrite();
  const e = await prisma.expense.findFirst({ where: { id, ownerId } });
  if (!e) throw new Error("not found");
  await prisma.expense.delete({ where: { id } });
  return { ok: true };
}

/** Create draft invoices from billable expenses (grouped by company + client). */
export async function invoiceFromBillableExpenses(ids?: string[]) {
  const { ownerId } = await requireWrite();
  const expenses = await prisma.expense.findMany({
    where: { ownerId, billable: true, clientId: { not: null }, invoiceId: null, ...(ids && ids.length ? { id: { in: ids } } : {}) },
  });
  if (expenses.length === 0) throw new Error("No billable expenses with a client selected");

  const groups = new Map<string, typeof expenses>();
  for (const e of expenses) {
    const key = `${e.companyId ?? ""}:${e.clientId ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const created: string[] = [];
  for (const list of groups.values()) {
    const first = list[0];
    if (!first.companyId || !first.clientId) continue;
    const inv = await createDraftInvoice(ownerId, {
      companyId: first.companyId,
      clientId: first.clientId,
      currency: "MAD",
      issueDate: new Date().toISOString().slice(0, 10),
      paymentTerms: "D30",
      lines: list.map((e) => ({
        description: `${e.description}${e.supplier ? ` — ${e.supplier}` : ""}`,
        quantityMilli: 1000,
        unit: "service",
        unitPriceMinor: e.amountHTMinor,
        discountBps: 0,
        taxRateBps: e.taxRateBps,
        taxExempt: e.taxExempt,
      })),
    });
    await prisma.expense.updateMany({ where: { id: { in: list.map((e) => e.id) } }, data: { invoiceId: inv.id } });
    created.push(inv.id);
  }
  return { count: created.length, invoiceIds: created };
}
