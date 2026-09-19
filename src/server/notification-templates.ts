/**
 * Editable notification templates with {variable} placeholders.
 *
 * Templates are stored in the DB (NotificationTemplate). If a row is missing,
 * the built-in default is used. Rendering replaces {var} tokens and leaves
 * unknown tokens untouched so typos are visible.
 */
import { prisma } from "@/lib/prisma";

export type TemplateType = "REGISTRATION_RECEIVED" | "APPROVED" | "WELCOME" | "SUSPENDED";

export const TEMPLATE_TYPES: TemplateType[] = ["REGISTRATION_RECEIVED", "APPROVED", "WELCOME", "SUSPENDED"];

/** Variables available to every template, with a human description. */
export const TEMPLATE_VARIABLES: { token: string; description: string }[] = [
  { token: "{companyName}", description: "The business name" },
  { token: "{ownerName}", description: "The owner's full name" },
  { token: "{email}", description: "The owner's email" },
  { token: "{phone}", description: "The owner's phone (may be empty)" },
  { token: "{slug}", description: "The workspace slug" },
  { token: "{url}", description: "The workspace URL (https://…)" },
  { token: "{password}", description: "The generated owner password (welcome only)" },
  { token: "{eta}", description: "Estimated activation time (approval only)" },
  { token: "{supportKey}", description: "The tenant support key" },
];

interface DefaultTemplate {
  subject: string;
  body: string;
}

const DEFAULTS: Record<TemplateType, DefaultTemplate> = {
  REGISTRATION_RECEIVED: {
    subject: "We received your Invora registration",
    body:
      "Thanks for registering {companyName}!\n\n" +
      "We received your request for the workspace \"{slug}\". " +
      "Our team will review it and contact you as soon as it is approved.\n\n" +
      "— Invora",
  },
  APPROVED: {
    subject: "Your Invora account was approved",
    body:
      "Good news, {companyName}!\n\n" +
      "Your registration has been approved.\n\n" +
      "Your platform: {url}\n\n" +
      "We are preparing your workspace now. It will be fully activated in about {eta}. " +
      "You will receive another message with your login details as soon as it is ready.\n\n" +
      "— Invora",
  },
  WELCOME: {
    subject: "Your Invora workspace is ready",
    body:
      "Welcome to Invora!\n\n" +
      "Your workspace for {companyName} is ready to use.\n\n" +
      "Sign in: {url}\n" +
      "Email: {email}\n" +
      "Password: {password}\n\n" +
      "Please change your password after your first sign-in (Settings → Security).\n\n" +
      "If you need help, share your support key: {supportKey}\n\n" +
      "— Invora",
  },
  SUSPENDED: {
    subject: "Your Invora account has been suspended",
    body:
      "Your Invora workspace for {companyName} has been suspended. " +
      "Please contact support for assistance.\n\n" +
      "— Invora",
  },
};

export function defaultTemplate(type: TemplateType): DefaultTemplate {
  return DEFAULTS[type];
}

/** Replace {tokens} with values. Unknown tokens are left as-is. */
export function renderTemplate(body: string, vars: Record<string, string | null | undefined>): string {
  return body.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? match : value;
  });
}

export async function getTemplate(type: TemplateType): Promise<{ subject: string; body: string; enabled: boolean }> {
  const row = await prisma.notificationTemplate.findUnique({ where: { type } }).catch(() => null);
  const fallback = DEFAULTS[type];
  return {
    subject: row?.subject ?? fallback.subject,
    body: row?.body ?? fallback.body,
    enabled: row?.enabled ?? true,
  };
}

export async function listTemplates() {
  const rows = await prisma.notificationTemplate.findMany().catch(() => []);
  const byType = new Map(rows.map((r) => [r.type, r]));
  return TEMPLATE_TYPES.map((type) => {
    const row = byType.get(type);
    const fallback = DEFAULTS[type];
    return {
      type,
      subject: row?.subject ?? fallback.subject,
      body: row?.body ?? fallback.body,
      enabled: row?.enabled ?? true,
      isDefault: !row,
    };
  });
}

export async function upsertTemplate(type: TemplateType, data: { subject?: string | null; body: string; enabled?: boolean }) {
  return prisma.notificationTemplate.upsert({
    where: { type },
    create: { type, subject: data.subject ?? null, body: data.body, enabled: data.enabled ?? true },
    update: { subject: data.subject ?? null, body: data.body, enabled: data.enabled ?? true },
  });
}

export async function resetTemplate(type: TemplateType) {
  await prisma.notificationTemplate.deleteMany({ where: { type } });
  return defaultTemplate(type);
}