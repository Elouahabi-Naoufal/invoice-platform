// Shared, client-safe option lists — one source for every <select> in the UI.
import { CURRENCIES, PAYMENT_METHODS, PAYMENT_TERMS, UNITS } from "@/lib/constants";

export const CURRENCY_OPTIONS = CURRENCIES;
export const UNIT_OPTIONS = UNITS;

/** TVA choices for line items; -1 is the "exempt" sentinel used by the builder. */
export const TVA_OPTIONS = [
  { value: 2000, label: "20%" },
  { value: 1400, label: "14%" },
  { value: 1000, label: "10%" },
  { value: 700, label: "7%" },
  { value: 0, label: "0%" },
  { value: -1, label: "Exonéré" },
] as const;

export const PAYMENT_METHOD_OPTIONS: { value: (typeof PAYMENT_METHODS)[number]; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "CHECK", label: "Check" },
  { value: "OTHER", label: "Other" },
];

export const PAYMENT_TERM_OPTIONS: { value: (typeof PAYMENT_TERMS)[number]; label: string }[] = [
  { value: "ON_RECEIPT", label: "Due on receipt" },
  { value: "D7", label: "7 days" },
  { value: "D15", label: "15 days" },
  { value: "D30", label: "30 days" },
  { value: "D60", label: "60 days" },
  { value: "CUSTOM", label: "Custom" },
];
