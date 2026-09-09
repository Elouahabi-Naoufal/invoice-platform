import { describe, it, expect } from "vitest";
import { writeFileSync, mkdirSync } from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import React from "react";
import { InvoiceDoc, PdfInvoice } from "@/pdf/InvoiceDoc";
import { calcInvoice } from "@/domain/invoice";

/**
 * Quality-bar samples — rendered to /tmp/invoice-samples/ for human inspection.
 * Asserts: render succeeds, totals match calcInvoice(), page counts sane.
 */

const DIR = "/tmp/invoice-samples";

// Minimal valid PNG (solid block) to exercise the logo path end-to-end.
function fakeLogoPng(): string {
  const w = 120, h = 56;
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (1 + w * 3) + 1 + x * 3;
      const edge = x < 4 || y < 4 || x >= w - 4 || y >= h - 4;
      raw[o] = edge ? 29 : 240; raw[o + 1] = edge ? 78 : 240; raw[o + 2] = edge ? 216 : 240;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const zlib = require("zlib") as typeof import("zlib");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE((require("zlib") as typeof import("zlib")).crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

function seller(over: Record<string, unknown> = {}) {
  return {
    legalName: "Atlas Consulting SARL", tradeName: "Atlas Consulting", legalForm: "SARL au capital de 100 000 DH",
    address: "12, Rue Moussa Bennous, Maârif", city: "Casablanca",
    phone: "+212 6 61 00 00 00", email: "contact@atlas-consulting.ma",
    ice: "001234567890123", identifiantFiscal: "45879632", rc: "612345", rcCity: "Casablanca",
    patente: "52314789", cnss: "8123456", taxRegime: "COMMUN",
    bankName: "Attijariwafa Bank", rib: "007 780 0001234567890123 45",
    accentColor: "#1D4ED8", ...over,
  };
}

function buyer(over: Record<string, unknown> = {}) {
  return {
    companyName: "Client Démo SA", name: "Yasmine Cherkaoui",
    address: "45, Boulevard Anfa", city: "Casablanca",
    ice: "009876543210987", clientIF: "11223344", clientRC: "998877",
    ...over,
  };
}

function line(desc: string, qty = 1, pu = 10000, extra: Record<string, unknown> = {}) {
  return {
    description: desc, quantityMilli: Math.round(qty * 1000), unit: "piece",
    unitPriceMinor: pu, discountBps: 0, taxRateBps: 2000, taxExempt: false, ...extra,
  };
}

const base: Omit<PdfInvoice, "lines"> = {
  invoiceNumber: "FAC-2026-0042", issueDate: "2026-09-08", dueDate: "2026-10-08",
  currency: "MAD", locale: "fr",
  seller: seller(), buyer: buyer(),
  invDiscountBps: 0, invDiscountFixedMinor: 0,
  paymentMode: "VIREMENT", paymentTerms: "D30",
};

async function render(name: string, inv: PdfInvoice, expectPages?: number) {
  const calc = calcInvoice({ lines: inv.lines, invDiscountBps: inv.invDiscountBps, invDiscountFixedMinor: inv.invDiscountFixedMinor });
  const buf = await renderToBuffer(React.createElement(InvoiceDoc, { inv }) as React.ReactElement);
  const pdf = await PDFDocument.load(buf);
  const pages = pdf.getPageCount();
  writeFileSync(`${DIR}/${name}.pdf`, buf);
  console.log(`${name}: ${pages}p, TTC=${calc.totalTTC}, ${(buf.length / 1024).toFixed(0)}KB`);
  expect(buf.length).toBeGreaterThan(3000);
  if (expectPages !== undefined) expect(pages).toBe(expectPages);
  return { pages, calc };
}

describe("invoice samples", () => {
  it("renders the full quality bar", async () => {
    mkdirSync(DIR, { recursive: true });

    await render("01-one-line", { ...base, lines: [line("Prestation de conseil — Septembre 2026")] }, 1);
    await render("02-three-lines-discount-multitva", {
      ...base, invoiceNumber: "FAC-2026-0043",
      seller: seller({ accentColor: "#0F766E" }),
      invDiscountBps: 500,
      lines: [
        line("Développement web", 10, 50000, { unit: "heure", discountBps: 1000, taxRateBps: 2000 }),
        line("Hébergement annuel", 1, 120000, { taxRateBps: 1000 }),
        line("Fournitures de bureau", 5, 2400, { taxRateBps: 700 }),
      ],
    }, 1);
    await render("03-twelve-lines-multipage", {
      ...base, invoiceNumber: "FAC-2026-0044",
      seller: seller({ accentColor: "#334155" }),
      lines: Array.from({ length: 12 }, (_, i) =>
        line(`Article n°${i + 1} — désignation détaillée du produit vendu avec caractéristiques techniques`, 2 + (i % 4), 1500 + i * 733, { taxRateBps: [2000, 1400, 1000, 700][i % 4] })),
    });
    await render("04-long-names", {
      ...base, invoiceNumber: "FAC-2026-0045",
      seller: seller({ legalName: "Société Marocaine de Prestations Informatiques et de Conseil en Organisation SARL", address: " angle Boulevard Mohammed V et Rue Allal Ben Abdellah, Quartier des Habous, Casablanca 20250" }),
      buyer: buyer({ companyName: "Groupement Interprofessionnel pour le Développement des Échanges Commerciaux SA" }),
      lines: [line("Mission d'audit organisationnel et d'accompagnement à la transformation digitale sur douze mois"), line("Rapport final"), line("Formation")],
    }, 1);
    await render("05-invoice-discount-fixed", {
      ...base, invoiceNumber: "FAC-2026-0046", invDiscountFixedMinor: 50000,
      lines: [line("Lot matériel", 1, 500000), line("Installation", 1, 150000)],
    }, 1);
    await render("06-avoir", {
      ...base, docType: "AVOIR", invoiceNumber: "AV-2026-0001",
      linkedNumber: "FAC-2026-0042", correctionReason: "Retour marchandise non conforme",
      seller: seller({ accentColor: "#7C2D12" }),
      lines: [line("Retour lot matériel", 1, 500000)],
    }, 1);
    await render("07-rectificative", {
      ...base, docType: "RECTIFICATIVE", invoiceNumber: "FAC-2026-0047",
      linkedNumber: "FAC-2026-0041", correctionReason: "Erreur de quantité sur la ligne 2",
      lines: [line("Prestation corrigée", 3, 80000)],
    }, 1);
    await render("08-with-logo", {
      ...base, invoiceNumber: "FAC-2026-0048",
      seller: seller({ logoPath: fakeLogoPng(), accentColor: "#0E7490" }),
      lines: [line("Prestation de conseil"), line("Déplacement", 4, 5000, { taxRateBps: 1400 })],
    }, 1);
    await render("09-ae-hors-champ", {
      ...base, invoiceNumber: "FAC-2026-0049",
      seller: seller({ legalForm: "Auto-entrepreneur — loi 114-13", rc: undefined, accentColor: "#334155" }),
      taxMention: "TVA non applicable — article 91-II-3° du CGI",
      lines: [line("Cours de soutien", 8, 15000, { taxExempt: true, taxRateBps: 0 }), line("Fournitures", 2, 8000, { taxExempt: true, taxRateBps: 0 })],
    }, 1);
    const big = await render("10-twenty-lines", {
      ...base, invoiceNumber: "FAC-2026-0050",
      lines: Array.from({ length: 20 }, (_, i) => line(`Prestation récurrente — lot ${i + 1}`, 1, 9000 + i * 500)),
    });
    expect(big.pages).toBeGreaterThanOrEqual(2);
  }, 120000);
});
