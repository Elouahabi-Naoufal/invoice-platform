// Pure domain calculator — NO React, NO Prisma. Single source for preview + PDF + API.
// Money = integer minor units. Half-up rounding. Prices are HT (explicit).

export interface CalcLine {
  quantityMilli: number; // 1000 = 1.0
  unitPriceMinor: number; // HT per 1.0 unit
  discountBps: number; // 0..10000
  taxRateBps: number;
  taxExempt?: boolean;
}

export interface CalcInput {
  lines: CalcLine[];
  invDiscountBps?: number;
  invDiscountFixedMinor?: number;
}

export interface TaxBucket {
  rateBps: number;
  taxable: number;
  tax: number;
}

export interface CalcResult {
  subtotalHT: number;
  invDiscountTotal: number;
  taxableTotal: number;
  totalTVA: number;
  totalTTC: number;
  buckets: TaxBucket[];
  perLineNetHT: number[];
}

/** Half-up: round(n/d) for non-negative ints */
export function divRoundHalfUp(n: number, d: number): number {
  if (d <= 0) throw new Error("divisor must be > 0");
  return Math.floor((n + d / 2) / d);
}

export function calcInvoice(input: CalcInput): CalcResult {
  const invBps = input.invDiscountBps ?? 0;
  const invFixed = input.invDiscountFixedMinor ?? 0;
  if (invBps < 0 || invBps > 10000) throw new Error("invDiscountBps out of range");
  if (invFixed < 0) throw new Error("invDiscountFixedMinor negative");

  // 1. per-line gross → net HT
  const perLineNetHT = input.lines.map((l) => {
    if (l.quantityMilli < 0 || l.unitPriceMinor < 0) throw new Error("negative qty/price");
    if (l.discountBps < 0 || l.discountBps > 10000) throw new Error("line discount out of range");
    const gross = divRoundHalfUp(l.quantityMilli * l.unitPriceMinor, 1000);
    const disc = divRoundHalfUp(gross * l.discountBps, 10000);
    return gross - disc;
  });

  const subtotalHT = perLineNetHT.reduce((a, b) => a + b, 0);

  // 2. invoice-level discount: pct first, then fixed (capped)
  const pctPart = divRoundHalfUp(subtotalHT * invBps, 10000);
  const afterPct = subtotalHT - pctPart;
  const fixedPart = Math.min(invFixed, afterPct);
  const invDiscountTotal = pctPart + fixedPart;
  const taxableTotal = subtotalHT - invDiscountTotal;

  // 3. allocate invoice discount proportionally per line (largest-remainder for exactness)
  // Simple approach: pro-rata with half-up per line, fix drift on last line.
  const perLineTaxable: number[] = [];
  if (subtotalHT === 0) {
    input.lines.forEach(() => perLineTaxable.push(0));
  } else {
    let allocated = 0;
    input.lines.forEach((_, i) => {
      if (i < input.lines.length - 1) {
        const share = divRoundHalfUp(perLineNetHT[i] * invDiscountTotal, subtotalHT);
        perLineTaxable.push(perLineNetHT[i] - share);
        allocated += share;
      } else {
        const share = invDiscountTotal - allocated;
        perLineTaxable.push(perLineNetHT[i] - share);
      }
    });
  }

  // 4. bucket by tax rate (exempt lines excluded from tax but included in taxableTotal? No:
  // exempt lines contribute to TTC without tax. Keep them in taxableTotal, tax 0.)
  const bucketMap = new Map<number, number>();
  input.lines.forEach((l, i) => {
    const rate = l.taxExempt ? -1 : l.taxRateBps;
    bucketMap.set(rate, (bucketMap.get(rate) ?? 0) + perLineTaxable[i]);
  });

  const buckets: TaxBucket[] = [];
  let totalTVA = 0;
  for (const [rate, taxable] of bucketMap) {
    if (rate === -1) {
      buckets.push({ rateBps: 0, taxable, tax: 0 });
    } else {
      const tax = divRoundHalfUp(taxable * rate, 10000);
      totalTVA += tax;
      buckets.push({ rateBps: rate, taxable, tax });
    }
  }
  buckets.sort((a, b) => a.rateBps - b.rateBps);

  return {
    subtotalHT,
    invDiscountTotal,
    taxableTotal,
    totalTVA,
    totalTTC: taxableTotal + totalTVA,
    buckets,
    perLineNetHT,
  };
}

// ── Status derivation (OVERDUE/SENT/VIEWED/PARTIAL/PAID derived, not persisted) ──
export type PersistedStatus = "DRAFT" | "ISSUED" | "CANCELLED";
export type DisplayStatus =
  | "DRAFT"
  | "CANCELLED"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "SENT"
  | "ISSUED";

export function deriveDisplayStatus(opts: {
  status: PersistedStatus;
  totalTTC: number;
  paidAmount: number;
  dueDate?: Date | null;
  sentAt?: Date | null;
  now?: Date;
}): DisplayStatus {
  const now = opts.now ?? new Date();
  if (opts.status === "DRAFT") return "DRAFT";
  if (opts.status === "CANCELLED") return "CANCELLED";
  const remaining = opts.totalTTC - opts.paidAmount;
  if (remaining <= 0 && opts.totalTTC > 0) return "PAID";
  if (opts.paidAmount > 0) return "PARTIALLY_PAID";
  if (opts.dueDate && opts.dueDate < now && remaining > 0) return "OVERDUE";
  if (opts.sentAt) return "SENT";
  return "ISSUED";
}

export function deriveDueDate(issueDate: Date, terms: string, customDue?: Date | null): Date | null {
  const d = new Date(issueDate);
  switch (terms) {
    case "ON_RECEIPT":
      return d;
    case "D7":
      d.setDate(d.getDate() + 7);
      return d;
    case "D15":
      d.setDate(d.getDate() + 15);
      return d;
    case "D30":
      d.setDate(d.getDate() + 30);
      return d;
    case "D60":
      d.setDate(d.getDate() + 60);
      return d;
    default:
      return customDue ?? null;
  }
}

export const CURRENCY_PRECISION: Record<string, number> = {
  MAD: 2,
  EUR: 2,
  USD: 2,
  GBP: 2,
};

export function formatMoney(minor: number, currency: string, locale = "fr-MA"): string {
  const prec = CURRENCY_PRECISION[currency] ?? 2;
  const major = minor / Math.pow(10, prec);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(major);
  } catch {
    return `${major.toFixed(prec)} ${currency}`;
  }
}

// ── Morocco: ICE 15 digits, Mod97 checksum (best-effort, matches DGI portals) ──
export function isValidICE(ice: string | null | undefined): boolean {
  if (!ice) return false;
  const digits = ice.replace(/[\s.-]/g, "");
  if (!/^\d{15}$/.test(digits)) return false;
  try {
    return BigInt(digits) % 97n === 0n;
  } catch {
    return false;
  }
}

// ── Morocco: arrêté en lettres (FR), e.g. "mille deux cents dirhams et cinquante centimes" ──
const FR_SMALL = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"];
const FR_TENS = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"];

function frUnder100(n: number): string {
  if (n < 20) return FR_SMALL[n];
  const t = Math.floor(n / 10);
  const r = n % 10;
  if (t === 7 || t === 9) {
    // 70-79 = soixante + 10-19 ; 90-99 = quatre-vingt + 10-19
    const base = t === 7 ? "soixante" : "quatre-vingt";
    if (r === 1 && t === 7) return `${base}-et-onze`;
    return `${base}-${FR_SMALL[10 + r]}`;
  }
  if (r === 0) return t === 8 ? "quatre-vingts" : FR_TENS[t];
  if (r === 1 && t !== 8) return `${FR_TENS[t]}-et-un`;
  return `${FR_TENS[t]}-${FR_SMALL[r]}`;
}

function frUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = "";
  if (h > 0) {
    out = h === 1 ? "cent" : `${FR_SMALL[h]} cent${r === 0 ? "s" : ""}`;
    if (r > 0) out += ` ${frUnder100(r)}`;
    return out;
  }
  return frUnder100(r);
}

export function frIntToWords(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("frIntToWords: non-negative safe int");
  if (n < 1000) return frUnder1000(n);
  if (n < 1_000_000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    const head = th === 1 ? "mille" : `${frUnder1000(th)} mille`;
    return r === 0 ? head : `${head} ${frUnder1000(r)}`;
  }
  if (n < 1_000_000_000) {
    const m = Math.floor(n / 1_000_000);
    const r = n % 1_000_000;
    const head = m === 1 ? "un million" : `${frUnder1000(m)} millions`;
    return r === 0 ? head : `${head} ${frIntToWords(r)}`;
  }
  throw new Error("amount too large for v1 words");
}

const CURRENCY_WORDS: Record<string, { one: string; many: string; cent: string }> = {
  MAD: { one: "dirham", many: "dirhams", cent: "centimes" },
  EUR: { one: "euro", many: "euros", cent: "centimes" },
  USD: { one: "dollar", many: "dollars", cent: "cents" },
  GBP: { one: "livre", many: "livres", cent: "pence" },
};

export function amountInWords(minor: number, currency: string): string {
  if (minor < 0) throw new Error("negative amount");
  const w = CURRENCY_WORDS[currency] ?? { one: currency, many: currency, cent: "centimes" };
  const major = Math.floor(minor / 100);
  const cents = minor % 100;
  const head = `${frIntToWords(major)} ${major <= 1 ? w.one : w.many}`;
  if (cents === 0) return `Arrêté la présente facture à la somme de ${head}.`;
  return `Arrêté la présente facture à la somme de ${head} et ${frIntToWords(cents)} ${w.cent}.`;
}
