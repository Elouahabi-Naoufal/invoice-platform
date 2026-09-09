"use server";
/**
 * APPLICATION layer — enforces lifecycle, immutability, snapshots, atomic numbering.
 * DOMAIN (calcInvoice) decides totals; PRESENTATION (UI/PDF) never decides legality.
 */
import { prisma } from "@/lib/prisma";
import { amountInWords, calcInvoice, deriveDueDate, isValidICE } from "@/domain/invoice";
import { invoiceCreateSchema, paymentSchema } from "@/server/validation";
import { nanoid } from "nanoid";

function toCalcLines(lines: { quantityMilli: number; unitPriceMinor: number; discountBps: number; taxRateBps: number; taxExempt: boolean }[]) {
  return lines.map((l) => ({ ...l }));
}

export async function createDraftInvoice(ownerId: string, raw: unknown) {
  const data = invoiceCreateSchema.parse(raw);
  if ((data.docType === "AVOIR" || data.docType === "RECTIFICATIVE") && !data.linkedInvoiceId)
    throw new Error(`${data.docType} requires linkedInvoiceId`);
  if ((data.docType === "AVOIR" || data.docType === "RECTIFICATIVE") && !data.correctionReason?.trim())
    throw new Error(`${data.docType} requires correctionReason (motif)`);
  const dueDate =
    data.dueDate ?? deriveDueDate(data.issueDate, data.paymentTerms, null);
  const calc = calcInvoice({
    lines: toCalcLines(data.lines),
    invDiscountBps: data.invDiscountBps,
    invDiscountFixedMinor: data.invDiscountFixedMinor,
  });
  const inv = await prisma.invoice.create({
    data: {
      ownerId,
      companyId: data.companyId,
      clientId: data.clientId,
      docType: data.docType,
      linkedInvoiceId: data.linkedInvoiceId,
      correctionReason: data.correctionReason,
      status: "DRAFT",
      currency: data.currency,
      invoiceLocale: data.invoiceLocale,
      issueDate: data.issueDate,
      dueDate,
      paymentTerms: data.paymentTerms,
      paymentMode: (data as { paymentMode?: string }).paymentMode,
      poNumber: data.poNumber,
      clientRef: data.clientRef,
      projectRef: data.projectRef,
      notes: data.notes,
      footerText: data.footerText,
      invDiscountBps: data.invDiscountBps,
      invDiscountFixedMinor: data.invDiscountFixedMinor,
      subtotalHT: calc.subtotalHT,
      totalTVA: calc.totalTVA,
      totalTTC: calc.totalTTC,
      taxBreakdown: JSON.stringify(calc.buckets),
      lines: {
        create: data.lines.map((l, i) => ({ ...l, position: i })),
      },
      events: { create: [{ actorId: ownerId, type: "created" }] },
    },
  });
  return inv;
}

/**
 * Finalize: MA guards (art.145) + atomic numbering + frozen snapshots.
 * - Seller ICE required + Mod97; B2B buyer (COMPANY + isAssujetti) requires ICE.
 * - AE_HORS_CHAMP: all lines forced exempt, TVA=0, taxMention art.91-II-3°.
 * - Chronology: issueDate must not predate latest finalized doc in same series.
 * - AVOIR uses Company.avoirPrefix series; FACTURE/RECTIFICATIVE use invoicePrefix.
 * - Snapshots freeze legalForm/capital/cnss/rcCity/TP + amountInWords + taxMention.
 */
export async function finalizeInvoice(ownerId: string, invoiceId: string) {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, ownerId },
    include: { lines: { orderBy: { position: "asc" } }, company: true, client: true },
  });
  if (!inv) throw new Error("not found");
  if (inv.status !== "DRAFT") throw new Error("only DRAFT can be finalized");
  if (inv.lines.length === 0) throw new Error("empty invoice");
  if (!inv.companyId || !inv.clientId || !inv.company || !inv.client)
    throw new Error("seller + buyer required");

  // ── MA legal guards ──
  const regime = (inv.company as { taxRegime?: string }).taxRegime ?? "COMMUN";
  if (!isValidICE(inv.company.ice))
    throw new Error("seller ICE invalid: 15 chiffres requis (art.145)");
  if (!inv.company.identifiantFiscal) throw new Error("seller IF requis (art.145)");
  if (!inv.company.patente) throw new Error("seller N° Taxe Professionnelle requis (art.145)");
  const buyerIsB2B = inv.client.type === "COMPANY" && (inv.client as { isAssujetti?: boolean }).isAssujetti !== false;
  if (buyerIsB2B && !isValidICE(inv.client.ice))
    throw new Error("buyer ICE invalid: ICE client obligatoire en B2B (art.145)");
  if (regime === "AE_HORS_CHAMP") {
    const bad = inv.lines.find((l) => !l.taxExempt);
    if (bad) throw new Error("AE hors champ TVA: toutes les lignes doivent être exonérées (art.91-II-3°)");
  }
  if ((inv.docType === "AVOIR" || inv.docType === "RECTIFICATIVE") && !inv.correctionReason?.trim())
    throw new Error(`${inv.docType} requires correctionReason`);

  const calc = calcInvoice({
    lines: toCalcLines(inv.lines),
    invDiscountBps: inv.invDiscountBps,
    invDiscountFixedMinor: inv.invDiscountFixedMinor,
  });
  if (regime === "AE_HORS_CHAMP" && calc.totalTVA !== 0)
    throw new Error("AE hors champ TVA: TVA doit être 0");
  const taxMention =
    regime === "AE_HORS_CHAMP"
      ? "TVA non applicable — article 91-II-3° du CGI"
      : calc.totalTVA === 0 && calc.taxableTotal > 0
        ? "Exonéré de TVA — article 92 du CGI (mention à préciser si autre fondement)"
        : null;

  const year = inv.issueDate.getFullYear();
  const prefix = inv.docType === "AVOIR"
    ? ((inv.company as { avoirPrefix?: string }).avoirPrefix || "AV")
    : (inv.company.invoicePrefix || "FAC");

  // Chronology guard (art.145: numéro croissant ⇒ date croissante)
  const lastInSeries = await prisma.invoice.findFirst({
    where: { ownerId, companyId: inv.companyId, docType: inv.docType, status: { in: ["ISSUED", "CANCELLED"] }, invoiceNumber: { startsWith: `${prefix}-${year}-` } },
    orderBy: { issueDate: "desc" },
    select: { issueDate: true, invoiceNumber: true },
  });
  if (lastInSeries && inv.issueDate < lastInSeries.issueDate)
    throw new Error(`chronologie art.145: date ${inv.issueDate.toISOString().slice(0, 10)} antérieure au dernier ${prefix}-${year} (${lastInSeries.issueDate.toISOString().slice(0, 10)})`);

  const result = await prisma.$transaction(async (tx) => {
    let series = await tx.numberingSeries.findUnique({
      where: { companyId_prefix_year: { companyId: inv.companyId!, prefix, year } },
    });
    if (!series) {
      series = await tx.numberingSeries.create({
        data: { companyId: inv.companyId!, prefix, year, lastNo: 0 },
      });
    }
    const next = series.lastNo + 1;
    await tx.numberingSeries.update({ where: { id: series.id }, data: { lastNo: next } });
    const number = `${prefix}-${year}-${String(next).padStart(4, "0")}`;

    const sellerSnapshot = JSON.stringify({
      legalName: inv.company!.legalName,
      tradeName: inv.company!.tradeName,
      legalForm: (inv.company as { legalForm?: string }).legalForm,
      capitalSocial: (inv.company as { capitalSocial?: number }).capitalSocial,
      address: inv.company!.address,
      city: inv.company!.city,
      phone: inv.company!.phone,
      email: inv.company!.email,
      ice: inv.company!.ice,
      identifiantFiscal: inv.company!.identifiantFiscal,
      rc: inv.company!.rc,
      rcCity: (inv.company as { rcCity?: string }).rcCity,
      patente: inv.company!.patente,
      cnss: (inv.company as { cnss?: string }).cnss,
      taxRegime: regime,
      bankName: inv.company!.bankName,
      accountHolder: inv.company!.accountHolder,
      rib: inv.company!.rib,
      iban: inv.company!.iban,
      swift: inv.company!.swift,
      logoPath: inv.company!.logoPath,
    });
    const buyerSnapshot = JSON.stringify({
      type: inv.client!.type,
      name: inv.client!.name,
      companyName: inv.client!.companyName,
      email: inv.client!.email,
      phone: inv.client!.phone,
      address: inv.client!.address,
      city: inv.client!.city,
      ice: inv.client!.ice,
      clientIF: (inv.client as { clientIF?: string }).clientIF,
      clientRC: (inv.client as { clientRC?: string }).clientRC,
    });
    const linesSnapshot = JSON.stringify(
      inv.lines.map((l) => ({
        description: l.description,
        quantityMilli: l.quantityMilli,
        unit: l.unit,
        unitPriceMinor: l.unitPriceMinor,
        discountBps: l.discountBps,
        taxRateBps: l.taxRateBps,
        taxExempt: l.taxExempt,
      }))
    );

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "ISSUED",
        invoiceNumber: number,
        sellerSnapshot,
        buyerSnapshot,
        linesSnapshot,
        subtotalHT: calc.subtotalHT,
        totalTVA: calc.totalTVA,
        totalTTC: calc.totalTTC,
        taxBreakdown: JSON.stringify(calc.buckets),
        taxMention,
        amountInWords: amountInWords(calc.totalTTC, inv.currency),
        finalizedAt: new Date(),
        publicToken: nanoid(32),
        events: { create: [{ actorId: ownerId, type: "finalized", metadata: number }] },
      },
    });
  });
  return result;
}

/**
 * Correction workflow (v1-ready, ledger-light):
 * - AVOIR: new DRAFT docType=AVOIR linked to original ISSUED/CANCELLED facture, own AV-series at finalize.
 *   Amounts stored POSITIVE (deduction). Application/lettrage against invoices = V2.
 * - RECTIFICATIVE ("annule et remplace"): duplicate original lines into new DRAFT linked to cancelled original.
 * Original numbers are never reused or deleted.
 */
export async function createAvoirDraft(ownerId: string, originalInvoiceId: string, raw: unknown) {
  const original = await prisma.invoice.findFirst({
    where: { id: originalInvoiceId, ownerId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!original) throw new Error("original not found");
  if (original.status !== "ISSUED" && original.status !== "CANCELLED")
    throw new Error("avoir requires an issued (or cancelled) original");
  if (original.docType === "AVOIR") throw new Error("cannot issue an avoir on an avoir in v1");
  const data = invoiceCreateSchema.parse({
    ...(raw as Record<string, unknown>),
    docType: "AVOIR",
    linkedInvoiceId: originalInvoiceId,
    companyId: original.companyId,
    clientId: original.clientId,
    currency: original.currency,
  });
  if (!data.correctionReason?.trim()) throw new Error("AVOIR requires correctionReason (motif)");
  return createDraftInvoice(ownerId, data);
}

export async function recordPayment(ownerId: string, invoiceId: string, raw: unknown) {
  const data = paymentSchema.parse(raw);
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, ownerId },
    include: { payments: true },
  });
  if (!inv) throw new Error("not found");
  if (inv.status !== "ISSUED") throw new Error("only ISSUED invoices accept payments");
  if (data.amountMinor <= 0) throw new Error("bad amount");
  if (inv.currency && (raw as { currency?: string }).currency && (raw as { currency?: string }).currency !== inv.currency)
    throw new Error("payment currency must match invoice");
  const paid = inv.payments.reduce((a, p) => a + p.amountMinor, 0);
  if (paid + data.amountMinor > inv.totalTTC) throw new Error("overpayment blocked in v1");
  const pay = await prisma.payment.create({
    data: {
      invoiceId,
      amountMinor: data.amountMinor,
      currency: inv.currency,
      paymentDate: data.paymentDate,
      method: data.method,
      reference: data.reference,
      notes: data.notes,
    },
  });
  const newPaid = paid + data.amountMinor;
  await prisma.invoiceEvent.create({
    data: {
      invoiceId,
      actorId: ownerId,
      type: newPaid >= inv.totalTTC ? "paid" : "payment_recorded",
      metadata: JSON.stringify({ amountMinor: data.amountMinor, method: data.method }),
    },
  });
  return pay;
}

export async function cancelInvoice(ownerId: string, invoiceId: string, reason: string) {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, ownerId } });
  if (!inv) throw new Error("not found");
  if (inv.status !== "ISSUED") throw new Error("only ISSUED can be cancelled");
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason.slice(0, 500),
      events: { create: [{ actorId: ownerId, type: "cancelled", metadata: reason.slice(0, 500) }] },
    },
  });
}

/** Duplicate any invoice → new DRAFT (no number, fresh dates). */
export async function duplicateInvoice(ownerId: string, invoiceId: string) {
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, ownerId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!inv) throw new Error("not found");
  const calc = calcInvoice({
    lines: toCalcLines(inv.lines),
    invDiscountBps: inv.invDiscountBps,
    invDiscountFixedMinor: inv.invDiscountFixedMinor,
  });
  const copy = await prisma.invoice.create({
    data: {
      ownerId,
      companyId: inv.companyId,
      clientId: inv.clientId,
      status: "DRAFT",
      currency: inv.currency,
      invoiceLocale: inv.invoiceLocale,
      issueDate: new Date(),
      dueDate: inv.dueDate ? deriveDueDate(new Date(), inv.paymentTerms, inv.dueDate) : null,
      paymentTerms: inv.paymentTerms,
      poNumber: inv.poNumber,
      clientRef: inv.clientRef,
      projectRef: inv.projectRef,
      notes: inv.notes,
      footerText: inv.footerText,
      invDiscountBps: inv.invDiscountBps,
      invDiscountFixedMinor: inv.invDiscountFixedMinor,
      subtotalHT: calc.subtotalHT,
      totalTVA: calc.totalTVA,
      totalTTC: calc.totalTTC,
      taxBreakdown: JSON.stringify(calc.buckets),
      lines: { create: inv.lines.map((l, i) => ({
        description: l.description, quantityMilli: l.quantityMilli, unit: l.unit,
        unitPriceMinor: l.unitPriceMinor, discountBps: l.discountBps,
        taxRateBps: l.taxRateBps, taxExempt: l.taxExempt, position: i,
      })) },
      events: { create: [{ actorId: ownerId, type: "duplicated", metadata: inv.invoiceNumber ?? inv.id }] },
    },
  });
  return copy;
}

export async function markSent(ownerId: string, invoiceId: string, sentTo: string) {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, ownerId } });
  if (!inv || inv.status !== "ISSUED") throw new Error("only ISSUED can be sent");
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      sentAt: new Date(),
      sentTo,
      events: { create: [{ actorId: ownerId, type: "sent", metadata: sentTo }] },
    },
  });
}
