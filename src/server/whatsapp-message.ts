import { formatMoney, waDigits } from "@/domain/invoice";

export const WHATSAPP_STATUSES = ["NOT_SENT", "SENDING", "SENT", "FAILED"] as const;
export type WhatsAppStatus = (typeof WHATSAPP_STATUSES)[number];

/** Duplicate-send guard: a SENDING row newer than this is treated as in progress. */
export const WHATSAPP_SEND_LOCK_TTL_MS = 10 * 60 * 1000;

export const WHATSAPP_TEMPLATE_TOKENS = [
  "docType",
  "number",
  "amount",
  "currency",
  "seller",
  "buyer",
  "url",
  "dueDate",
] as const;
export type WhatsAppTemplateToken = (typeof WHATSAPP_TEMPLATE_TOKENS)[number];

export const DEFAULT_WHATSAPP_TEMPLATE =
  "Bonjour {buyer}, voici votre {docType} {number} de {seller} : {amount} {currency}. Lien public : {url}";

export interface WhatsAppTemplateVars {
  docType: string;
  number: string | null;
  amountMinor: number;
  currency: string;
  seller: string;
  buyer: string;
  url: string;
  dueDate: string | null;
}

/** Strict recipient normalization for provider sends (share links stay permissive). */
export function normalizeWhatsAppRecipient(phone: unknown): string {
  if (typeof phone !== "string" || !phone.trim()) {
    throw new Error("recipient invalid: a destination phone number is required");
  }
  const digits = waDigits(phone.trim());
  if (!digits || !/^\d{8,15}$/.test(digits)) {
    throw new Error("recipient invalid: use international digits, e.g. +212661234567");
  }
  return digits;
}

/** Validate a stored template without sending: known placeholders + caption length. */
export function validateWhatsAppTemplate(template: unknown): string {
  if (typeof template !== "string" || !template.trim()) {
    throw new Error("WhatsApp template is required");
  }
  const clean = template.trim();
  if (clean.length > 1000) throw new Error("WhatsApp template must be 1000 characters or fewer");
  const unknownTokens = [...clean.matchAll(/\{([A-Za-z]+)\}/g)]
    .map((m) => m[1]!)
    .filter((token) => !(WHATSAPP_TEMPLATE_TOKENS as readonly string[]).includes(token));
  if (unknownTokens.length > 0) {
    throw new Error(
      `Unknown WhatsApp placeholder(s): ${[...new Set(unknownTokens)].join(", ")}. Allowed: ${WHATSAPP_TEMPLATE_TOKENS.map((t) => `{${t}}`).join(" ")}`
    );
  }
  return clean;
}

export function renderWhatsAppTemplate(template: unknown, vars: WhatsAppTemplateVars): string {
  const clean = validateWhatsAppTemplate(template);
  const values: Record<WhatsAppTemplateToken, string> = {
    docType: vars.docType,
    number: vars.number ?? "",
    amount: formatMoney(vars.amountMinor, vars.currency),
    currency: vars.currency,
    seller: vars.seller,
    buyer: vars.buyer,
    url: vars.url,
    dueDate: vars.dueDate ?? "",
  };
  const rendered = clean.replace(/\{([A-Za-z]+)\}/g, (match, token: string) => {
    const key = token as WhatsAppTemplateToken;
    return key in values ? values[key] : match;
  });
  if (!rendered.trim()) throw new Error("WhatsApp message is empty after rendering the template");
  if (rendered.length > 1000) throw new Error("Rendered WhatsApp message must be 1000 characters or fewer");
  return rendered;
}

export function isWhatsAppSendLocked(
  status: string | null | undefined,
  lastAttemptAt: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (status !== "SENDING" || !lastAttemptAt) return false;
  return now.getTime() - lastAttemptAt.getTime() < WHATSAPP_SEND_LOCK_TTL_MS;
}

/** Keep provider/transport errors in DB/logs without stacks or secrets. */
export function sanitizeWhatsAppError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "unknown error");
  const clean = raw.replace(/\s+/g, " ").trim().slice(0, 500);
  return clean || "WhatsApp send failed";
}
