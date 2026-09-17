"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";

export async function createContract(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = z.object({
    clientId: z.string().min(1),
    companyId: z.string().optional().nullable(),
    title: z.string().min(1),
    valueMinor: z.number().int().min(0).default(0),
    currency: z.string().default("MAD"),
    periodDays: z.number().int().positive().default(30),
    taxRateBps: z.number().int().min(0).max(10000).default(2000),
    paymentTerms: z.string().default("D30"),
    startDate: z.coerce.date().default(() => new Date()),
    endDate: z.coerce.date().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).parse(raw);
  const client = await prisma.client.findFirst({ where: { id: d.clientId, ownerId }, select: { id: true } });
  if (!client) throw new Error("client not found");
  return prisma.contract.create({ data: { ...d, ownerId } as never });
}

export async function deleteContract(id: string) {
  const { ownerId } = await requireWrite();
  const c = await prisma.contract.findFirst({ where: { id, ownerId } });
  if (!c) throw new Error("not found");
  await prisma.contract.update({ where: { id }, data: { active: false } });
  return { ok: true };
}

export interface ContractSummary {
  id: string;
  title: string;
  client: string;
  currency: string;
  valueMinor: number;
  invoicedMinor: number;
  percent: number;
}

/** Contract value vs invoices issued to that client during the contract period. */
export async function contractSummaries(): Promise<ContractSummary[]> {
  const { ownerId } = await requireActor();
  const contracts = await prisma.contract.findMany({ where: { ownerId, active: true }, orderBy: { createdAt: "desc" } });
  const clients = await prisma.client.findMany({ where: { ownerId }, select: { id: true, name: true, companyName: true } });
  const clientName = new Map(clients.map((c) => [c.id, c.companyName || c.name]));
  const result: ContractSummary[] = [];
  for (const c of contracts) {
    const agg = await prisma.invoice.aggregate({
      where: {
        ownerId,
        clientId: c.clientId,
        status: "ISSUED",
        issueDate: { gte: c.startDate, ...(c.endDate ? { lte: c.endDate } : {}) },
        ...(c.companyId ? { companyId: c.companyId } : {}),
      },
      _sum: { subtotalHT: true },
    });
    const invoicedMinor = agg._sum.subtotalHT ?? 0;
    result.push({
      id: c.id,
      title: c.title,
      client: clientName.get(c.clientId) ?? "—",
      currency: c.currency,
      valueMinor: c.valueMinor,
      invoicedMinor,
      percent: c.valueMinor > 0 ? Math.min(100, Math.round((invoicedMinor / c.valueMinor) * 100)) : 0,
    });
  }
  return result;
}
