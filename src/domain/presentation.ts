// Shared presentation helpers for invoice documents (preview + PDF).
// Pure — no React, no Prisma. Keeps the HTML preview and the PDF identical.

import { DEFAULT_ACCENT } from "@/lib/constants";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Return a valid #RRGGBB accent, falling back to the brand default. */
export function normalizeAccent(value: unknown): string {
  const candidate = String(value ?? "");
  return HEX_COLOR.test(candidate) ? candidate : DEFAULT_ACCENT;
}

/** Human title for a document type. */
export function docTitle(docType: string): string {
  switch (docType) {
    case "AVOIR":
      return "AVOIR";
    case "RECTIFICATIVE":
      return "FACTURE RECTIFICATIVE";
    case "DEVIS":
      return "DEVIS";
    default:
      return "FACTURE";
  }
}

/** ISO date (yyyy-mm-dd) → dd/mm/yyyy. */
export function formatIsoAsDdMmYyyy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
