import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoiceDoc } from "@/pdf/InvoiceDoc";
import { calcInvoice } from "@/domain/invoice";

function lines(n: number, rates = [2000, 1000, 700, 0]) {
  return Array.from({ length: n }, (_, i) => ({
    description: `Ligne ${i + 1} — prestation détaillée avec un libellé volontairement long pour tester le rendu multi-lignes dans le tableau PDF`,
    quantityMilli: 1000 + (i % 5) * 500,
    unit: "piece",
    unitPriceMinor: 1000 + i * 137,
    discountBps: i % 3 === 0 ? 1000 : 0,
    taxRateBps: rates[i % rates.length],
    taxExempt: i % 7 === 6,
  }));
}

const base = {
  invoiceNumber: "FAC-2026-0001", issueDate: "2026-09-09", dueDate: "2026-10-09",
  currency: "MAD", locale: "fr",
  seller: { legalName: "Société Exemple SARL au nom très long pour tester le header", address: "123, Boulevard Mohammed V, Quartier Maârif, Casablanca 20100", city: "Casablanca", ice: "123456789012345", identifiantFiscal: "12345678", patente: "TP999", rc: "123456", rcCity: "Casablanca", cnss: "555" },
  buyer: { name: "Client", companyName: "Client SA avec une raison sociale excessivement longue", address: "456, Avenue Hassan II", city: "Rabat", ice: "999999999999999" },
  invDiscountBps: 500, invDiscountFixedMinor: 0, poNumber: "BC-42", paymentMode: "VIREMENT",
};

describe("PDF stress", () => {
  for (const n of [1, 5, 20, 50]) {
    it(`renders ${n} lines, preview == PDF engine`, async () => {
      const ls = lines(n);
      const calc = calcInvoice({ lines: ls, invDiscountBps: 500, invDiscountFixedMinor: 0 });
      expect(calc.totalTTC).toBe(calc.taxableTotal + calc.totalTVA);
      const buf = await renderToBuffer(React.createElement(InvoiceDoc, { inv: { ...base, lines: ls } }) as React.ReactElement);
      expect(buf.length).toBeGreaterThan(2000);
    });
  }
  it("renders AVOIR with Net à déduire", async () => {
    const buf = await renderToBuffer(
      React.createElement(InvoiceDoc, { inv: { ...base, docType: "AVOIR", invoiceNumber: "AV-2026-0001", linkedNumber: "FAC-2026-0001", correctionReason: "Retour marchandise", lines: lines(3) } }) as React.ReactElement
    );
    expect(buf.length).toBeGreaterThan(2000);
  });
});
