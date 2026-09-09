"use server";
/**
 * Authed façade: every private op verifies session + ownership server-side.
 * UI/middleware visibility is never authorization.
 */
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { deriveDisplayStatus, calcInvoice } from "@/domain/invoice";
import {
  createDraftInvoice as coreCreate,
  finalizeInvoice as coreFinalize,
  recordPayment as corePay,
  cancelInvoice as coreCancel,
  duplicateInvoice as coreDuplicate,
  markSent as coreSent,
} from "@/server/invoices";

export async function createDraft(raw: unknown) {
  const u = await requireUser();
  return coreCreate(u.id, raw);
}

export async function finalize(id: string) {
  const u = await requireUser();
  await assertOwnsInvoice(u.id, id);
  return coreFinalize(u.id, id);
}

export async function pay(id: string, raw: unknown) {
  const u = await requireUser();
  await assertOwnsInvoice(u.id, id);
  return corePay(u.id, id, raw);
}

export async function cancel(id: string, reason: string) {
  const u = await requireUser();
  await assertOwnsInvoice(u.id, id);
  return coreCancel(u.id, id, reason);
}

export async function duplicate(id: string) {
  const u = await requireUser();
  await assertOwnsInvoice(u.id, id);
  return coreDuplicate(u.id, id);
}

export async function markSentOp(id: string, sentTo: string) {
  const u = await requireUser();
  await assertOwnsInvoice(u.id, id);
  return coreSent(u.id, id, sentTo);
}

async function assertOwnsInvoice(ownerId: string, id: string) {
  const inv = await prisma.invoice.findFirst({ where: { id, ownerId }, select: { id: true } });
  if (!inv) throw new Error("not found"); // IDOR-safe: no existence leak across owners
}

/** DRAFT-only edit (lines + details). ISSUED/CANCELLED rejected — immutability. */
export async function updateDraft(id: string, raw: unknown) {
  const u = await requireUser();
  const inv = await prisma.invoice.findFirst({ where: { id, ownerId: u.id } });
  if (!inv) throw new Error("not found");
  if (inv.status !== "DRAFT") throw new Error("immutable: only DRAFT editable");
  const { invoiceCreateSchema, lineSchema } = await import("@/server/validation");
  const patch = invoiceCreateSchema.partial().extend({ lines: lineSchema.array().min(1).optional() }).parse(raw);
  const lines = patch.lines;
  let totals: { subtotalHT: number; totalTVA: number; totalTTC: number; buckets: { rateBps: number; taxable: number; tax: number }[] } | null = null;
  if (lines) {
    const c = calcInvoice({
      lines: lines.map((l) => ({ quantityMilli: l.quantityMilli ?? 1000, unitPriceMinor: l.unitPriceMinor ?? 0, discountBps: l.discountBps ?? 0, taxRateBps: l.taxRateBps ?? 2000, taxExempt: l.taxExempt ?? false })),
      invDiscountBps: patch.invDiscountBps ?? inv.invDiscountBps,
      invDiscountFixedMinor: patch.invDiscountFixedMinor ?? inv.invDiscountFixedMinor,
    });
    totals = { subtotalHT: c.subtotalHT, totalTVA: c.totalTVA, totalTTC: c.totalTTC, buckets: c.buckets };
  }
  return prisma.$transaction(async (tx) => {
    if (lines) {
      await tx.invoiceLine.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceLine.createMany({ data: lines.map((l, i) => ({ invoiceId: id, position: i, description: l.description ?? "", quantityMilli: l.quantityMilli ?? 1000, unit: l.unit ?? "piece", unitPriceMinor: l.unitPriceMinor ?? 0, discountBps: l.discountBps ?? 0, taxRateBps: l.taxRateBps ?? 2000, taxExempt: l.taxExempt ?? false })) });
    }
    const { lines: _omit, ...rest } = patch;
    return tx.invoice.update({
      where: { id },
      data: { ...rest, ...(totals ? { subtotalHT: totals.subtotalHT, totalTVA: totals.totalTVA, totalTTC: totals.totalTTC, taxBreakdown: JSON.stringify(totals.buckets) } : {}) },
    });
  });
}

/** Only DRAFT deletable. Issued/cancelled → cancel, never hard-delete. */
export async function deleteDraft(id: string) {
  const u = await requireUser();
  const inv = await prisma.invoice.findFirst({ where: { id, ownerId: u.id } });
  if (!inv) throw new Error("not found");
  if (inv.status !== "DRAFT") throw new Error("only DRAFT deletable — cancel issued invoices instead");
  await prisma.invoice.delete({ where: { id } });
  return { ok: true };
}

export async function listInvoices(filter?: { status?: string; companyId?: string; q?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
  const u = await requireUser();
  const page = Math.max(1, filter?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filter?.pageSize ?? 25));
  const where = {
    ownerId: u.id,
    ...(filter?.status ? { status: filter.status } : {}),
    ...(filter?.companyId ? { companyId: filter.companyId } : {}),
    ...(filter?.from || filter?.to
      ? { issueDate: { ...(filter.from ? { gte: new Date(filter.from) } : {}), ...(filter.to ? { lte: new Date(filter.to) } : {}) } }
      : {}),
    ...(filter?.q
      ? { OR: [{ invoiceNumber: { contains: filter.q } }, { notes: { contains: filter.q } }, { poNumber: { contains: filter.q } }] }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { payments: true, client: true, company: true },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const items = rows.map((r) => {
    const paid = r.payments.reduce((a, p) => a + p.amountMinor, 0);
    return {
      ...r,
      paidAmount: paid,
      remaining: r.totalTTC - paid,
      display: deriveDisplayStatus({ status: r.status as "DRAFT" | "ISSUED" | "CANCELLED", totalTTC: r.totalTTC, paidAmount: paid, dueDate: r.dueDate, sentAt: r.sentAt }),
    };
  });
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getInvoiceDetail(id: string) {
  const u = await requireUser();
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: u.id },
    include: { lines: { orderBy: { position: "asc" } }, payments: { orderBy: { paymentDate: "asc" } }, events: { orderBy: { createdAt: "asc" } }, client: true, company: true },
  });
  if (!inv) throw new Error("not found");
  const paid = inv.payments.reduce((a, p) => a + p.amountMinor, 0);
  return {
    ...inv,
    paidAmount: paid,
    remaining: inv.totalTTC - paid,
    display: deriveDisplayStatus({ status: inv.status as "DRAFT" | "ISSUED" | "CANCELLED", totalTTC: inv.totalTTC, paidAmount: paid, dueDate: inv.dueDate, sentAt: inv.sentAt }),
    sellerView: inv.sellerSnapshot ? JSON.parse(inv.sellerSnapshot) : inv.company,
    buyerView: inv.buyerSnapshot ? JSON.parse(inv.buyerSnapshot) : inv.client,
  };
}
