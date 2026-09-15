import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDraftInvoice, finalizeInvoice, setQuoteStatus, convertDevisToInvoice } from "@/server/invoices";
import { isValidICE } from "@/domain/invoice";

function makeValidICE(seed13: string): string {
  for (let i = 0; i < 200; i++) {
    const cand = seed13 + String(i).padStart(2, "0");
    if (isValidICE(cand)) return cand;
  }
  throw new Error("no ICE");
}

const suffix = "dv" + Date.now().toString().slice(-5);
let userA = "", compA = "", cliA = "";
const y = new Date().getFullYear();

beforeAll(async () => {
  const a = await prisma.user.create({ data: { email: `${suffix}@t.ma`, passwordHash: "x", displayName: "DV" } });
  userA = a.id;
  const c = await prisma.company.create({
    data: { ownerId: userA, legalName: "DV SARL", address: "adr", ice: makeValidICE("5555555555555"), identifiantFiscal: "1", patente: "2", invoicePrefix: "FAC", avoirPrefix: "AV", devisPrefix: "DEV", defaultCurrency: "MAD" } as never,
  });
  compA = c.id;
  const cl = await prisma.client.create({
    data: { ownerId: userA, type: "COMPANY", name: "K", companyName: "K SA", ice: makeValidICE("6666666666666"), address: "a" } as never,
  });
  cliA = cl.id;
});

afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { ownerId: userA } });
  await prisma.client.deleteMany({ where: { ownerId: userA } });
  await prisma.company.deleteMany({ where: { ownerId: userA } });
  await prisma.user.deleteMany({ where: { id: userA } });
});

const L = [{ description: "x", quantityMilli: 1000, unit: "piece", unitPriceMinor: 5000, discountBps: 0, taxRateBps: 2000, taxExempt: false }];

describe("devis lifecycle", () => {
  it("finalizes with DEV series, PENDING, default +30d validity", async () => {
    const d = await createDraftInvoice(userA, {
      companyId: compA, clientId: cliA, docType: "DEVIS", currency: "MAD",
      issueDate: new Date(`${y}-06-01`), paymentTerms: "D30", lines: L,
    });
    expect(d.validUntil).not.toBeNull();
    const f = await finalizeInvoice(userA, d.id);
    expect(f.invoiceNumber).toBe(`DEV-${y}-0001`);
    expect(f.quoteStatus).toBe("PENDING");
  });

  it("accept + convert creates linked FACTURE draft (idempotent)", async () => {
    const d = await createDraftInvoice(userA, {
      companyId: compA, clientId: cliA, docType: "DEVIS", currency: "MAD",
      issueDate: new Date(`${y}-06-02`), paymentTerms: "D30", lines: L,
    });
    const f = await finalizeInvoice(userA, d.id);
    await setQuoteStatus(userA, f.id, "ACCEPTED");
    const f1 = await convertDevisToInvoice(userA, f.id);
    expect(f1.docType).toBe("FACTURE");
    expect(f1.status).toBe("DRAFT");
    expect(f1.linkedInvoiceId).toBe(f.id);
    const f2 = await convertDevisToInvoice(userA, f.id);
    expect(f2.id).toBe(f1.id); // idempotent — one facture per devis
    const check = await prisma.invoice.findUniqueOrThrow({ where: { id: f.id } });
    expect(check.convertedInvoiceId).toBe(f1.id);
  });

  it("refuse works; facture cannot be decided", async () => {
    const d = await createDraftInvoice(userA, {
      companyId: compA, clientId: cliA, docType: "DEVIS", currency: "MAD",
      issueDate: new Date(`${y}-06-03`), paymentTerms: "D30", lines: L,
    });
    const f = await finalizeInvoice(userA, d.id);
    await setQuoteStatus(userA, f.id, "REFUSED");
    const check = await prisma.invoice.findUniqueOrThrow({ where: { id: f.id } });
    expect(check.quoteStatus).toBe("REFUSED");
    const df = await createDraftInvoice(userA, {
      companyId: compA, clientId: cliA, currency: "MAD",
      issueDate: new Date(`${y}-06-04`), paymentTerms: "D30", lines: L,
    });
    const ff = await finalizeInvoice(userA, df.id);
    await expect(setQuoteStatus(userA, ff.id, "ACCEPTED")).rejects.toThrow();
  });
});
