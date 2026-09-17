// Pure charge/rate engine — no React, no Prisma. Country-agnostic; all rates
// are user-defined, so the same app works for any country's taxes/contributions.

import { divRoundHalfUp } from "@/domain/invoice";

export interface RateLike {
  id: string;
  name: string;
  kind: string; // PERCENT | FIXED
  percentBps: number;
  fixedMinor: number;
  capMinor?: number | null;
}

export interface ChargeLine {
  rateId: string;
  name: string;
  amountMinor: number;
}

/** Value of a single rate applied to a base amount (minor units). */
export function applyRate(rate: RateLike, baseMinor: number): number {
  const raw = rate.kind === "FIXED" ? rate.fixedMinor : divRoundHalfUp(baseMinor * rate.percentBps, 10000);
  return rate.capMinor && rate.capMinor > 0 ? Math.min(raw, rate.capMinor) : raw;
}

export function computeCharges(rates: RateLike[], baseMinor: number): { lines: ChargeLine[]; total: number } {
  const lines = rates.map((r) => ({ rateId: r.id, name: r.name, amountMinor: applyRate(r, baseMinor) }));
  return { lines, total: lines.reduce((a, l) => a + l.amountMinor, 0) };
}

/** VAT for an expense (unless exempt). */
export function expenseVat(amountHTMinor: number, taxRateBps: number, taxExempt: boolean): number {
  return taxExempt ? 0 : divRoundHalfUp(amountHTMinor * taxRateBps, 10000);
}
