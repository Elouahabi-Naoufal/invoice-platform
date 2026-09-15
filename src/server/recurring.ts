"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";

const recSchema = z.object({
  name: z.string().min(2),
  companyId: z.string().optional(),
  clientId: z.string().optional(),
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
  active: z.boolean().default(true),
});

export async function listRecurringTemplates(userId: string) {
  const templates = await prisma.recurringTemplate.findMany({
    where: { ownerId: userId },
    include: { lastGeneratedInvoice: { select: { invoiceNumber: true } }, company: { select: { legalName: true } }, client: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return templates.map((t) => ({ ...t, lines: t.lines ? JSON.parse(t.lines) : [] }));
}

export async function createRecurringTemplate(userId: string, raw: unknown) {
  const u = await requireUser();
  const d = recSchema.parse(raw);
  return prisma.recurringTemplate.create({ data: { ...d, ownerId: u.id } as never });
}

export async function updateRecurringTemplate(id: string, raw: unknown) {
  const u = await requireUser();
  const d = recSchema.partial().parse(raw);
  const t = await prisma.recurringTemplate.findFirst({ where: { id, ownerId: u.id } });
  if (!t) throw new Error("Template not found");
  return prisma.recurringTemplate.update({ where: { id }, data: d as never });
}

export async function toggleRecurringTemplate(id: string) {
  const u = await requireUser();
  const t = await prisma.recurringTemplate.findFirst({ where: { id, ownerId: u.id } });
  if (!t) throw new Error("Template not found");
  return prisma.recurringTemplate.update({ where: { id }, data: { active: !t.active } });
}

export async function generateInvoiceFromTemplate(templateId: string) {
  const u = await requireUser();
  const t = await prisma.recurringTemplate.findFirst({
    where: { id: templateId, ownerId: u.id, active: true },
    include: { client: true, company: true },
  });
  if (!t) throw new Error("Template not found or inactive");
  const lines = t.lines ? JSON.parse(t.lines) : [];
  const today = new Date();
  const dueDate = new Date(today.getTime() + t.periodDays * 86400000);
  const { createDraftInvoice } = await import("@/server/invoices");
  const d = await createDraftInvoice(u.id, {
    companyId: t.companyId!, clientId: t.clientId!, docType: t.docType,
    currency: t.currency, issueDate: today.toISOString().split("T")[0],
    dueDate: dueDate.toISOString().split("T")[0], paymentTerms: t.paymentTerms, lines,
  });
  const { finalizeInvoice } = await import("@/server/invoices");
  const f = await finalizeInvoice(u.id, d.id);
  await prisma.recurringTemplate.update({ where: { id: templateId }, data: { lastGeneratedAt: today, lastGeneratedInvoiceId: f.id } });
  return f;
}