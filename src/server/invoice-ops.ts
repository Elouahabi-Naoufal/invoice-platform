"use server";
/**
 * Authed façade: every private op verifies session + ownership server-side.
 * UI/middleware visibility is never authorization.
 */
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { deriveDisplayStatus, calcInvoice } from "@/domain/invoice";
import { publicUploadUrl } from "@/lib/uploads";
import { safeJsonParse } from "@/lib/safe";
import {
  createDraftInvoice as coreCreate,
  finalizeInvoice as coreFinalize,
  recordPayment as corePay,
  cancelInvoice as coreCancel,
  duplicateInvoice as coreDuplicate,
  setQuoteStatus as coreQuote,
  convertDevisToInvoice as coreConvert,
} from "@/server/invoices";

export async function createDraft(raw: unknown) {
  const { ownerId } = await requireWrite();
  return coreCreate(ownerId, raw);
}

export async function finalize(id: string) {
  const { ownerId } = await requireWrite();
  await assertOwnsInvoice(ownerId, id);
  return coreFinalize(ownerId, id);
}

export async function pay(id: string, raw: unknown) {
  const { ownerId } = await requireWrite();
  await assertOwnsInvoice(ownerId, id);
  return corePay(ownerId, id, raw);
}

export async function cancel(id: string, reason: string) {
  const { ownerId } = await requireWrite();
  await assertOwnsInvoice(ownerId, id);
  return coreCancel(ownerId, id, reason);
}

export async function duplicate(id: string) {
  const { ownerId } = await requireWrite();
  await assertOwnsInvoice(ownerId, id);
  return coreDuplicate(ownerId, id);
}

export async function decideQuote(id: string, status: "ACCEPTED" | "REFUSED") {
  const { ownerId } = await requireWrite();
  await assertOwnsInvoice(ownerId, id);
  return coreQuote(ownerId, id, status);
}

export async function convertDevis(id: string) {
  const { ownerId } = await requireWrite();
  await assertOwnsInvoice(ownerId, id);
  return coreConvert(ownerId, id);
}

/** Revoke the public share link (sets token to null; the old URL stops working). */
export async function revokePublicLink(id: string) {
  const { ownerId } = await requireWrite();
  const inv = await prisma.invoice.findFirst({ where: { id, ownerId } });
  if (!inv) throw new Error("not found");
  return prisma.invoice.update({ where: { id }, data: { publicToken: null, publicTokenExpiresAt: null } });
}

async function assertOwnsInvoice(ownerId: string, id: string) {
  const inv = await prisma.invoice.findFirst({ where: { id, ownerId }, select: { id: true } });
  if (!inv) throw new Error("not found"); // IDOR-safe: no existence leak across owners
}

/** DRAFT-only edit (lines + details). ISSUED/CANCELLED rejected — immutability. */
export async function updateDraft(id: string, raw: unknown) {
  const { ownerId } = await requireWrite();
  const inv = await prisma.invoice.findFirst({ where: { id, ownerId } });
  if (!inv) throw new Error("not found");
  if (inv.status !== "DRAFT") throw new Error("immutable: only DRAFT editable");
  const { invoiceCreateSchema, lineSchema } = await import("@/server/validation");
  const patch = invoiceCreateSchema.partial().extend({ lines: lineSchema.array().min(1).optional() }).parse(raw);
  // IDOR guard: patched relations must belong to the same owner.
  if (patch.companyId) {
    const c = await prisma.company.findFirst({ where: { id: patch.companyId, ownerId }, select: { id: true } });
    if (!c) throw new Error("seller company not found");
  }
  if (patch.clientId) {
    const c = await prisma.client.findFirst({ where: { id: patch.clientId, ownerId }, select: { id: true } });
    if (!c) throw new Error("buyer client not found");
  }
  if (patch.linkedInvoiceId) {
    const l = await prisma.invoice.findFirst({ where: { id: patch.linkedInvoiceId, ownerId }, select: { id: true } });
    if (!l) throw new Error("linked invoice not found");
  }
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
  const { ownerId } = await requireWrite();
  const inv = await prisma.invoice.findFirst({ where: { id, ownerId } });
  if (!inv) throw new Error("not found");
  if (inv.status !== "DRAFT") throw new Error("only DRAFT deletable — cancel issued invoices instead");
  await prisma.invoice.delete({ where: { id } });
  return { ok: true };
}

export async function listInvoices(filter?: { status?: string; companyId?: string; docType?: string; q?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
  const { ownerId } = await requireActor();
  const page = Math.max(1, filter?.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filter?.pageSize ?? 25));
  const dateOrUndefined = (v?: string) => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const status = ["DRAFT", "ISSUED", "CANCELLED"].includes(filter?.status ?? "") ? filter!.status : undefined;
  const docType = ["FACTURE", "DEVIS", "AVOIR", "RECTIFICATIVE"].includes(filter?.docType ?? "") ? filter!.docType : undefined;
  const from = dateOrUndefined(filter?.from);
  const to = dateOrUndefined(filter?.to);
  const where = {
    ownerId,
    ...(status ? { status } : {}),
    ...(filter?.companyId ? { companyId: filter.companyId } : {}),
    ...(docType ? { docType } : {}),
    ...(from || to ? { issueDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
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
  const { ownerId } = await requireActor();
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId },
    include: { lines: { orderBy: { position: "asc" } }, payments: { orderBy: { paymentDate: "asc" } }, events: { orderBy: { createdAt: "asc" } }, client: true, company: true },
  });
  if (!inv) throw new Error("not found");
  const paid = inv.payments.reduce((a, p) => a + p.amountMinor, 0);
  const sellerViewRaw = safeJsonParse(inv.sellerSnapshot, inv.company) as Record<string, unknown> | null;
  const sellerView = sellerViewRaw && typeof sellerViewRaw === "object"
    ? { ...sellerViewRaw, logoPath: publicUploadUrl(sellerViewRaw.logoPath as string | null | undefined), signaturePath: publicUploadUrl(sellerViewRaw.signaturePath as string | null | undefined) }
    : sellerViewRaw;
  return {
    ...inv,
    paidAmount: paid,
    remaining: inv.totalTTC - paid,
    display: deriveDisplayStatus({ status: inv.status as "DRAFT" | "ISSUED" | "CANCELLED", totalTTC: inv.totalTTC, paidAmount: paid, dueDate: inv.dueDate, sentAt: inv.sentAt }),
    sellerView,
    buyerView: safeJsonParse(inv.buyerSnapshot, inv.client),
  };
}
