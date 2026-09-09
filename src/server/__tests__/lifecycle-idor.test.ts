import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDraftInvoice, finalizeInvoice, recordPayment, cancelInvoice, duplicateInvoice } from "@/server/invoices";
import { deriveDisplayStatus, isValidICE } from "@/domain/invoice";

function makeValidICE(seed13: string): string {
  for (let i = 0; i < 200; i++) {
    const cand = seed13 + String(i).padStart(2, "0");
    if (isValidICE(cand)) return cand;
  }
  throw new Error("no ICE");
}

const suffix = Date.now().toString().slice(-6);
let userA = "", userB = "", compA = "", cliA = "";

beforeAll(async () => {
  const a = await prisma.user.create({ data: { email: `a${suffix}@t.ma`, passwordHash: "x", displayName: "A" } });
  const b = await prisma.user.create({ data: { email: `b${suffix}@t.ma`, passwordHash: "x", displayName: "B" } });
  userA = a.id; userB = b.id;
  const iceS = makeValidICE("1111111111111");
  const iceB = makeValidICE("2222222222222");
  const c = await prisma.company.create({
    data: { ownerId: userA, legalName: "Ste Test SARL", address: "1 rue Test, Casa", ice: iceS, identifiantFiscal: "12345678", patente: "TP999", invoicePrefix: "FAC", avoirPrefix: "AV", defaultCurrency: "MAD" } as never,
  });
  compA = c.id;
  const cl = await prisma.client.create({
    data: { ownerId: userA, type: "COMPANY", name: "Client Test", companyName: "Client SA", ice: iceB, address: "2 av Test" } as never,
  });
  cliA = cl.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { ownerId: { in: [userA, userB] } } });
  await prisma.client.deleteMany({ where: { ownerId: { in: [userA, userB] } } });
  await prisma.company.deleteMany({ where: { ownerId: { in: [userA, userB] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
});

function draftInput(n = 10000) {
  return {
    companyId: compA, clientId: cliA, currency: "MAD", issueDate: new Date("2026-03-01"),
    paymentTerms: "D30", paymentMode: "VIREMENT",
    lines: [{ description: "Prestation", quantityMilli: 1000, unit: "piece", unitPriceMinor: n, discountBps: 0, taxRateBps: 2000, taxExempt: false }],
  };
}

describe("lifecycle + IDOR", () => {
  it("finalize assigns number, freezes snapshot, blocks re-finalize", async () => {
    const d = await createDraftInvoice(userA, draftInput());
    expect(d.invoiceNumber).toBeNull();
    const f = await finalizeInvoice(userA, d.id);
    expect(f.invoiceNumber).toMatch(/^FAC-2026-\d{4}$/);
    expect(f.sellerSnapshot).toContain("Ste Test SARL");
    await expect(finalizeInvoice(userA, d.id)).rejects.toThrow();
  });

  it("IDOR: userB sees nothing, mutates nothing", async () => {
    const d = await createDraftInvoice(userA, draftInput());
    const seenByB = await prisma.invoice.findFirst({ where: { id: d.id, ownerId: userB } });
    expect(seenByB).toBeNull();
    await expect(finalizeInvoice(userB, d.id)).rejects.toThrow();
    await expect(recordPayment(userB, d.id, { amountMinor: 100, method: "CASH" })).rejects.toThrow();
    await expect(cancelInvoice(userB, d.id, "x")).rejects.toThrow();
    await expect(duplicateInvoice(userB, d.id)).rejects.toThrow();
    await prisma.invoice.delete({ where: { id: d.id } });
  });

  it("partial payments → PAID derived; overpay blocked", async () => {
    const d = await createDraftInvoice(userA, draftInput(10000)); // TTC 12000
    const f = await finalizeInvoice(userA, d.id);
    await recordPayment(userA, f.id, { amountMinor: 3000, method: "CASH" });
    let inv = await prisma.invoice.findUniqueOrThrow({ where: { id: f.id }, include: { payments: true } });
    let paid = inv.payments.reduce((a, p) => a + p.amountMinor, 0);
    expect(deriveDisplayStatus({ status: "ISSUED", totalTTC: inv.totalTTC, paidAmount: paid })).toBe("PARTIALLY_PAID");
    await expect(recordPayment(userA, f.id, { amountMinor: 99999, method: "CASH" })).rejects.toThrow();
    await recordPayment(userA, f.id, { amountMinor: inv.totalTTC - paid, method: "BANK_TRANSFER" });
    inv = await prisma.invoice.findUniqueOrThrow({ where: { id: f.id }, include: { payments: true } });
    paid = inv.payments.reduce((a, p) => a + p.amountMinor, 0);
    expect(deriveDisplayStatus({ status: "ISSUED", totalTTC: inv.totalTTC, paidAmount: paid })).toBe("PAID");
  });

  it("cancel keeps number; next number not reused; duplicate → fresh DRAFT", async () => {
    const y = new Date().getFullYear();
    const d1 = await createDraftInvoice(userA, { ...draftInput(), issueDate: new Date(`${y}-04-01`) });
    const d2 = await createDraftInvoice(userA, { ...draftInput(), issueDate: new Date(`${y}-04-02`) });
    const f1 = await finalizeInvoice(userA, d1.id);
    const f2 = await finalizeInvoice(userA, d2.id);
    const n1 = Number(f1.invoiceNumber!.split("-").pop());
    const n2 = Number(f2.invoiceNumber!.split("-").pop());
    expect(n2).toBe(n1 + 1);
    await cancelInvoice(userA, f1.id, "erreur");
    const d3 = await createDraftInvoice(userA, { ...draftInput(), issueDate: new Date(`${y}-04-03`) });
    const f3 = await finalizeInvoice(userA, d3.id);
    expect(Number(f3.invoiceNumber!.split("-").pop())).toBe(n2 + 1); // not reused
    const dup = await duplicateInvoice(userA, f2.id);
    expect(dup.status).toBe("DRAFT");
    expect(dup.invoiceNumber).toBeNull();
  });
});
