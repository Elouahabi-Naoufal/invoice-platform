"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";

export async function createAccount(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = z.object({
    name: z.string().min(1),
    kind: z.enum(["BANK", "CASH"]).default("BANK"),
    currency: z.string().default("MAD"),
    openingBalanceMinor: z.number().int().default(0),
  }).parse(raw);
  return prisma.account.create({ data: { ...d, ownerId } as never });
}

export async function deleteAccount(id: string) {
  const { ownerId } = await requireWrite();
  const a = await prisma.account.findFirst({ where: { id, ownerId } });
  if (!a) throw new Error("not found");
  await prisma.account.update({ where: { id }, data: { active: false } });
  return { ok: true };
}

export async function listEntries(accountId?: string) {
  const { ownerId } = await requireActor();
  return prisma.ledgerEntry.findMany({
    where: { ownerId, ...(accountId ? { accountId } : {}) },
    include: { account: { select: { name: true, currency: true } } },
    orderBy: { date: "desc" },
    take: 300,
  });
}

export async function createEntry(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = z.object({
    accountId: z.string(),
    direction: z.enum(["IN", "OUT"]),
    amountMinor: z.number().int().positive(),
    label: z.string().min(1),
    category: z.string().optional().nullable(),
    date: z.coerce.date().default(() => new Date()),
  }).parse(raw);
  const acc = await prisma.account.findFirst({ where: { id: d.accountId, ownerId } });
  if (!acc) throw new Error("account not found");
  return prisma.ledgerEntry.create({
    data: {
      ownerId,
      accountId: d.accountId,
      direction: d.direction,
      amountMinor: d.amountMinor,
      currency: acc.currency,
      label: d.label,
      category: d.category || null,
      date: d.date,
    } as never,
  });
}

export async function deleteEntry(id: string) {
  const { ownerId } = await requireWrite();
  const e = await prisma.ledgerEntry.findFirst({ where: { id, ownerId } });
  if (!e) throw new Error("not found");
  await prisma.ledgerEntry.delete({ where: { id } });
  return { ok: true };
}

export interface AccountBalance {
  id: string;
  name: string;
  kind: string;
  currency: string;
  balanceMinor: number;
}

/** Opening balance + money in − money out, per active account. */
export async function accountBalances(): Promise<AccountBalance[]> {
  const { ownerId } = await requireActor();
  const accounts = await prisma.account.findMany({ where: { ownerId, active: true }, orderBy: { createdAt: "asc" } });
  const entries = await prisma.ledgerEntry.findMany({ where: { ownerId }, select: { accountId: true, direction: true, amountMinor: true } });
  const byAccount = new Map<string, number>();
  for (const e of entries) {
    const delta = (e.direction === "IN" ? 1 : -1) * e.amountMinor;
    byAccount.set(e.accountId, (byAccount.get(e.accountId) ?? 0) + delta);
  }
  return accounts.map((a) => ({
    id: a.id, name: a.name, kind: a.kind, currency: a.currency,
    balanceMinor: a.openingBalanceMinor + (byAccount.get(a.id) ?? 0),
  }));
}
