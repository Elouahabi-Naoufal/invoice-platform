"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";
import { computeNextRun, generateFromTemplate } from "@/server/automation";
import { parseJsonArray } from "@/lib/safe";

const recSchema = z.object({
  name: z.string().min(2),
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  docType: z.enum(["FACTURE", "DEVIS"]).default("FACTURE"),
  currency: z.string().default("MAD"),
  paymentTerms: z.string().default("D30"),
  periodDays: z.number().int().positive().default(30),
  startDate: z.string().datetime(),
  lines: z.array(z.object({
    description: z.string(),
    quantityMilli: z.number().int().positive(),
    unit: z.string().default("piece"),
    unitPriceMinor: z.number().int().nonnegative(),
    discountBps: z.number().int().min(0).default(0),
    taxRateBps: z.number().int().min(0).max(10000).default(2000),
    taxExempt: z.boolean().default(false),
  })).min(1),
  autoSend: z.boolean().default(false),
  sendChannel: z.enum(["NONE", "WHATSAPP"]).default("NONE"),
  active: z.boolean().default(true),
});

export async function listRecurringTemplates(_userId?: string) {
  const { ownerId } = await requireActor();
  const templates = await prisma.recurringTemplate.findMany({
    where: { ownerId },
    include: { lastGeneratedInvoice: { select: { invoiceNumber: true } }, company: { select: { legalName: true } }, client: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return templates.map((t) => ({ ...t, lines: parseJsonArray(t.lines) }));
}

async function assertRelations(ownerId: string, companyId: string, clientId: string) {
  const [company, client] = await Promise.all([
    prisma.company.findFirst({ where: { id: companyId, ownerId }, select: { id: true } }),
    prisma.client.findFirst({ where: { id: clientId, ownerId }, select: { id: true } }),
  ]);
  if (!company) throw new Error("seller company not found");
  if (!client) throw new Error("client not found");
}

export async function createRecurringTemplate(_userId: string, raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = recSchema.parse(raw);
  await assertRelations(ownerId, d.companyId, d.clientId);
  const { lines, ...rest } = d as { lines: unknown[] } & Record<string, unknown>;
  const startDate = new Date(d.startDate);
  return prisma.recurringTemplate.create({
    data: {
      ...rest,
      startDate,
      nextRunAt: startDate,
      lines: JSON.stringify(lines),
      ownerId,
    } as never,
  });
}

export async function toggleRecurringTemplate(id: string) {
  const { ownerId } = await requireWrite();
  const t = await prisma.recurringTemplate.findFirst({ where: { id, ownerId } });
  if (!t) throw new Error("Template not found");
  return prisma.recurringTemplate.update({ where: { id }, data: { active: !t.active } });
}

/** Manual "Generate now": creates + finalizes one invoice and advances the schedule. */
export async function generateInvoiceFromTemplate(templateId: string) {
  const { ownerId } = await requireWrite();
  const t = await prisma.recurringTemplate.findFirst({ where: { id: templateId, ownerId, active: true } });
  if (!t) throw new Error("Template not found or inactive");
  if (!t.companyId || !t.clientId) throw new Error("Template needs a seller company and a client");
  const invoice = await generateFromTemplate(ownerId, t);
  const now = new Date();
  await prisma.recurringTemplate.update({
    where: { id: templateId },
    data: {
      lastGeneratedAt: now,
      lastGeneratedInvoiceId: invoice.id,
      nextRunAt: computeNextRun(t.nextRunAt ?? t.startDate, t.periodDays, now),
      lastError: null,
    },
  });
  return invoice;
}
