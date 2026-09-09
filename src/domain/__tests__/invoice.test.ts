import { describe, it, expect } from "vitest";
import { calcInvoice, deriveDisplayStatus, deriveDueDate } from "../invoice";

describe("calcInvoice", () => {
  it("single line 20% TVA", () => {
    const r = calcInvoice({
      lines: [{ quantityMilli: 1000, unitPriceMinor: 10000, discountBps: 0, taxRateBps: 2000 }],
    });
    expect(r.subtotalHT).toBe(10000);
    expect(r.totalTVA).toBe(2000);
    expect(r.totalTTC).toBe(12000);
  });

  it("line discount then invoice discount order", () => {
    const r = calcInvoice({
      lines: [
        { quantityMilli: 2000, unitPriceMinor: 5000, discountBps: 1000, taxRateBps: 2000 }, // gross 10000 -10% = 9000
      ],
      invDiscountBps: 1000, // -10% => 900
      invDiscountFixedMinor: 500,
    });
    // subtotal 9000, pct 900, fixed 500 → taxable 7600, TVA 1520, TTC 9120
    expect(r.subtotalHT).toBe(9000);
    expect(r.invDiscountTotal).toBe(1400);
    expect(r.taxableTotal).toBe(7600);
    expect(r.totalTVA).toBe(1520);
    expect(r.totalTTC).toBe(9120);
  });

  it("multiple TVA buckets + exempt", () => {
    const r = calcInvoice({
      lines: [
        { quantityMilli: 1000, unitPriceMinor: 10000, discountBps: 0, taxRateBps: 2000 },
        { quantityMilli: 1000, unitPriceMinor: 10000, discountBps: 0, taxRateBps: 1000 },
        { quantityMilli: 1000, unitPriceMinor: 5000, discountBps: 0, taxRateBps: 0, taxExempt: true },
      ],
    });
    expect(r.taxableTotal).toBe(25000);
    expect(r.totalTVA).toBe(3000); // 2000+1000+0
    expect(r.totalTTC).toBe(28000);
    expect(r.buckets.length).toBe(3);
  });

  it("rounding half-up edge: qty decimals", () => {
    // 3 x 3.33 = 9.99 → 999 minor
    const r = calcInvoice({
      lines: [{ quantityMilli: 3000, unitPriceMinor: 333, discountBps: 0, taxRateBps: 2000 }],
    });
    expect(r.subtotalHT).toBe(999);
    expect(r.totalTVA).toBe(200); // 999*20% = 199.8 → 200
    expect(r.totalTTC).toBe(1199);
  });

  it("fixed discount capped at subtotal", () => {
    const r = calcInvoice({
      lines: [{ quantityMilli: 1000, unitPriceMinor: 1000, discountBps: 0, taxRateBps: 0 }],
      invDiscountFixedMinor: 5000,
    });
    expect(r.taxableTotal).toBe(0);
    expect(r.totalTTC).toBe(0);
  });

  it("allocation exactness: discount split sums exactly", () => {
    const r = calcInvoice({
      lines: [
        { quantityMilli: 1000, unitPriceMinor: 1000, discountBps: 0, taxRateBps: 2000 },
        { quantityMilli: 1000, unitPriceMinor: 1000, discountBps: 0, taxRateBps: 2000 },
        { quantityMilli: 1000, unitPriceMinor: 1000, discountBps: 0, taxRateBps: 2000 },
      ],
      invDiscountFixedMinor: 100, // 100/3 not divisible
    });
    const bucketTaxable = r.buckets.reduce((a, b) => a + b.taxable, 0);
    expect(bucketTaxable).toBe(r.taxableTotal);
    expect(r.totalTTC).toBe(r.taxableTotal + r.totalTVA);
  });
});

describe("deriveDisplayStatus", () => {
  it("derives PAID / PARTIAL / OVERDUE / SENT", () => {
    expect(
      deriveDisplayStatus({ status: "ISSUED", totalTTC: 10000, paidAmount: 10000 })
    ).toBe("PAID");
    expect(
      deriveDisplayStatus({ status: "ISSUED", totalTTC: 10000, paidAmount: 3000 })
    ).toBe("PARTIALLY_PAID");
    expect(
      deriveDisplayStatus({
        status: "ISSUED",
        totalTTC: 10000,
        paidAmount: 0,
        dueDate: new Date("2020-01-01"),
        now: new Date("2026-01-01"),
      })
    ).toBe("OVERDUE");
    expect(
      deriveDisplayStatus({ status: "ISSUED", totalTTC: 10000, paidAmount: 0, sentAt: new Date() })
    ).toBe("SENT");
  });
});

describe("deriveDueDate", () => {
  it("D30 adds 30 days", () => {
    const d = deriveDueDate(new Date("2026-09-01T00:00:00Z"), "D30");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-10-01");
  });
});
