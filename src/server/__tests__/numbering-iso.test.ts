import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDraftInvoice, finalizeInvoice } from "@/server/invoices";
import { isValidICE } from "@/domain/invoice";
function ice(s: string): string { for (let i = 0; i < 200; i++) { const c = s + String(i).padStart(2, "0"); if (isValidICE(c)) return c; } throw new Error("ice"); }
const suf = "iso" + Date.now().toString().slice(-5);
let u = "", c1 = "", c2 = "", cl = "";
beforeAll(async () => {
  const usr = await prisma.user.create({ data: { email: `${suf}@t.ma`, passwordHash: "x", displayName: "I" } }); u = usr.id;
  const mk = (n: string) => prisma.company.create({ data: { ownerId: u, legalName: n, address: "adr", ice: ice("3333333333333"), identifiantFiscal: "1", patente: "2", invoicePrefix: "FAC", avoirPrefix: "AV", defaultCurrency: "MAD" } as never });
  c1 = (await mk("C1")).id; c2 = (await mk("C2")).id;
  cl = (await prisma.client.create({ data: { ownerId: u, type: "COMPANY", name: "K", companyName: "K SA", ice: ice("4444444444444"), address: "a" } as never })).id;
});
afterAll(async () => {
  await prisma.invoice.deleteMany({ where: { ownerId: u } });
  await prisma.client.deleteMany({ where: { ownerId: u } });
  await prisma.company.deleteMany({ where: { ownerId: u } });
  await prisma.user.deleteMany({ where: { id: u } });
});
const L = [{ description: "x", quantityMilli: 1000, unit: "piece", unitPriceMinor: 1000, discountBps: 0, taxRateBps: 2000, taxExempt: false }];
describe("numbering isolation", () => {
  it("two companies same prefix/year number independently", async () => {
    const y = new Date().getFullYear();
    const a1 = await finalizeInvoice(u, (await createDraftInvoice(u, { companyId: c1, clientId: cl, currency: "MAD", issueDate: new Date(`${y}-05-01`), paymentTerms: "D30", lines: L })).id);
    const b1 = await finalizeInvoice(u, (await createDraftInvoice(u, { companyId: c2, clientId: cl, currency: "MAD", issueDate: new Date(`${y}-05-01`), paymentTerms: "D30", lines: L })).id);
    const a2 = await finalizeInvoice(u, (await createDraftInvoice(u, { companyId: c1, clientId: cl, currency: "MAD", issueDate: new Date(`${y}-05-02`), paymentTerms: "D30", lines: L })).id);
    expect(a1.invoiceNumber).toBe(`FAC-${y}-0001`);
    expect(b1.invoiceNumber).toBe(`FAC-${y}-0001`);
    expect(a2.invoiceNumber).toBe(`FAC-${y}-0002`);
  });
});
