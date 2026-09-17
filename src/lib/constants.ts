/**
 * Shared domain constants — single source of truth for enums and defaults.
 * Never re-declare these literals inline; import from here.
 */

export const DEFAULT_CURRENCY = "MAD";
export const CURRENCIES = ["MAD", "EUR", "USD", "GBP"] as const;

export const DEFAULT_TAX_BPS = 2000; // 20%

export const DEFAULT_UNIT = "piece";
export const UNITS = ["piece", "heure", "jour", "kg", "service"] as const;

export const DOC_TYPES = ["FACTURE", "DEVIS", "AVOIR", "RECTIFICATIVE"] as const;
export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "CANCELLED"] as const;

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CARD", "CHECK", "OTHER"] as const;
export const PAYMENT_TERMS = ["ON_RECEIPT", "D7", "D15", "D30", "D60", "CUSTOM"] as const;

export const DEFAULT_ACCENT = "#1D4ED8";

export const MS_PER_DAY = 86_400_000;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 5;
export const EXPORT_LIMIT = 5000;

export const MAX_ERROR_LENGTH = 500;
export const TOKEN_LENGTH = 32;
export const SEQUENCE_WIDTH = 4;

export type DocType = (typeof DOC_TYPES)[number];
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentTerm = (typeof PAYMENT_TERMS)[number];
export type Currency = (typeof CURRENCIES)[number];
