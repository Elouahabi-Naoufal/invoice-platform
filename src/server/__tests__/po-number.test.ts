import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDraftInvoice } from "@/server/invoices";
import { isValidICE } from "@/domain/invoice";

function makeValidICE(seed13: string): string {
  for (let i = 0; i < 200; i++) {
    const cand = seed13 + String(i).padStart(2, "0");
    if (isValidICE(cand)) return cand;
  }
  throw new Error("no ICE");
}

const suffix = "po" + Date.now().toString().slice(-6);
let ownerId = "", companyId = "", clientId = "";
const y = new Date().getFullYear();

beforeAll(async () => {
  const u = await prisma.user.create({ data: { email: `${suffix}@t.ma`, passwordHash: "x", displayName: "PO" } });
  ownerId = u.id;
  const c = await prisma.company.create({
    data: { ownerId, legalName: "PO SARL", address: "adr", ice: makeValidICE("4000000000000"), identifiantFiscal: "1", patente: "2", invoicePrefix: "FAC", avoirPrefix: "AV", devisPrefix: "DEV", defaultCurrency: "MAD" } as never,
  });
  companyId = c.id;
  const cl = await prisma.client.create({ data: { ownerId, type: "COMPANY", name: "K", companyName: "K SA", ice: makeValidICE("4100000000000"), address: "a" } as never });
  clientId = cl.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { ownerId } });
  await prisma.client.deleteMany({ where: { ownerId } });
  await prisma.company.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { id: ownerId } });
});

const base = {
  companyId: "", clientId: "", currency: "MAD", issueDate: new Date(`${y}-07-01`),
  paymentTerms: "D30", lines: [{ description: "x", quantityMilli: 1000, unit: "piece", unitPriceMinor: 1000, discountBps: 0, taxRateBps: 2000, taxExempt: false }],
};

describe("purchase-order auto number", () => {
  it("assigns PO-YYYY-NNNN when none provided, incrementing per company/year", async () => {
    const a = await createDraftInvoice(ownerId, { ...base, companyId, clientId });
    const b = await createDraftInvoice(ownerId, { ...base, companyId, clientId });
    expect(a.poNumber).toBe(`PO-${y}-0001`);
    expect(b.poNumber).toBe(`PO-${y}-0002`);
  });

  it("keeps a user-provided purchase order", async () => {
    const c = await createDraftInvoice(ownerId, { ...base, companyId, clientId, poNumber: "BC-42" });
    expect(c.poNumber).toBe("BC-42");
  });
});
