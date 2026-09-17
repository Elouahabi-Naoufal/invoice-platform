import { z } from "zod";
import {
  CURRENCIES, DOC_TYPES, INVOICE_STATUSES, PAYMENT_METHODS, PAYMENT_TERMS,
  DEFAULT_CURRENCY, DEFAULT_TAX_BPS, DEFAULT_UNIT, DEFAULT_ACCENT,
} from "@/lib/constants";

export const companySchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().optional(),
  address: z.string().min(3),
  city: z.string().optional(),
  country: z.string().default("MA"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  defaultCurrency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
  defaultTaxBps: z.number().int().min(0).max(10000).default(DEFAULT_TAX_BPS),
  invoicePrefix: z.string().min(2).max(8).default("FAC"),
  avoirPrefix: z.string().min(2).max(8).default("AV"),
  devisPrefix: z.string().min(2).max(8).default("DEV"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "accent must be #RRGGBB").default(DEFAULT_ACCENT),
  invoiceLocale: z.string().default("fr"),
  footerNotes: z.string().optional(),
  ice: z.string().regex(/^\d{15}$/, "ICE = 15 chiffres").optional().or(z.literal("")),
  identifiantFiscal: z.string().optional(),
  rc: z.string().optional(),
  rcCity: z.string().optional(),
  patente: z.string().optional(),
  legalForm: z.string().optional(),
  capitalSocial: z.number().int().min(0).optional(),
  cnss: z.string().optional(),
  taxRegime: z.enum(["COMMUN", "AE_HORS_CHAMP", "EXONERE_ART92"]).default("COMMUN"),
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  rib: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
});

export const clientSchema = z.object({
  type: z.enum(["PERSON", "COMPANY"]).default("COMPANY"),
  name: z.string().min(2),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default("MA"),
  ice: z.string().optional(),
  clientIF: z.string().optional(),
  clientRC: z.string().optional(),
  isAssujetti: z.boolean().default(true),
  defaultCurrency: z.enum(CURRENCIES).default(DEFAULT_CURRENCY),
  notes: z.string().optional(),
});

export const lineSchema = z.object({
  description: z.string().min(1),
  quantityMilli: z.number().int().min(1).default(1000),
  unit: z.string().default(DEFAULT_UNIT),
  unitPriceMinor: z.number().int().min(0),
  discountBps: z.number().int().min(0).max(10000).default(0),
  taxRateBps: z.number().int().min(0).max(10000).default(DEFAULT_TAX_BPS),
  taxExempt: z.boolean().default(false),
});

export const invoiceCreateSchema = z.object({
  companyId: z.string().min(1),
  clientId: z.string().min(1),
  docType: z.enum(DOC_TYPES).default("FACTURE"),
  linkedInvoiceId: z.string().optional(),
  correctionReason: z.string().optional(),
  validUntil: z.coerce.date().optional().nullable(),
  currency: z.enum(CURRENCIES),
  invoiceLocale: z.string().default("fr"),
  issueDate: z.coerce.date(),
  paymentTerms: z.enum(PAYMENT_TERMS).default("D30"),
  dueDate: z.coerce.date().optional().nullable(),
  paymentMode: z.string().optional(),
  poNumber: z.string().optional(),
  clientRef: z.string().optional(),
  projectRef: z.string().optional(),
  notes: z.string().optional(),
  footerText: z.string().optional(),
  invDiscountBps: z.number().int().min(0).max(10000).default(0),
  invDiscountFixedMinor: z.number().int().min(0).default(0),
  lines: z.array(lineSchema).min(1),
});

export const productSchema = z.object({
  companyId: z.string().optional().nullable(),
  name: z.string().min(2),
  description: z.string().optional(),
  unit: z.string().default(DEFAULT_UNIT),
  unitPriceMinor: z.number().int().min(0),
  taxRateBps: z.number().int().min(0).max(10000).default(DEFAULT_TAX_BPS),
  taxExempt: z.boolean().default(false),
});

export const paymentSchema = z.object({
  amountMinor: z.number().int().min(1),
  paymentDate: z.coerce.date().default(() => new Date()),
  method: z.enum(PAYMENT_METHODS).default("BANK_TRANSFER"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

/** Re-exported for callers that validate invoice status values. */
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
