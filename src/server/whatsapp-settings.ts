/**
 * WhatsApp settings read/write. Server-only (NOT a "use server" action):
 * ownerId must come from the authenticated API route.
 */
import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/server/auth";
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  WHATSAPP_TEMPLATE_TOKENS,
  validateWhatsAppTemplate,
} from "@/server/whatsapp-message";

async function resolveActiveCompany(ownerId: string) {
  const activeId = await getActiveCompanyId();
  if (activeId) {
    const active = await prisma.company.findFirst({ where: { id: activeId, ownerId } });
    if (active) return active;
  }
  return prisma.company.findFirst({
    where: { ownerId, archived: false },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWhatsAppSettings(ownerId: string) {
  const company = await resolveActiveCompany(ownerId);
  if (!company) throw new Error("no company");
  return {
    companyId: company.id,
    companyName: company.tradeName || company.legalName,
    enabled: company.whatsappEnabled,
    template: company.whatsappTemplate ?? DEFAULT_WHATSAPP_TEMPLATE,
    isDefault: !company.whatsappTemplate,
    defaultTemplate: DEFAULT_WHATSAPP_TEMPLATE,
    tokens: [...WHATSAPP_TEMPLATE_TOKENS],
  };
}

export async function updateWhatsAppSettings(ownerId: string, raw: unknown) {
  if (!raw || typeof raw !== "object") throw new Error("settings invalid");
  const { enabled, template } = raw as { enabled?: unknown; template?: unknown };
  if (typeof enabled !== "boolean") throw new Error("enabled must be a boolean");
  const cleanTemplate = validateWhatsAppTemplate(template);
  const company = await resolveActiveCompany(ownerId);
  if (!company) throw new Error("no company");
  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { whatsappEnabled: enabled, whatsappTemplate: cleanTemplate },
  });
  return {
    companyId: updated.id,
    companyName: updated.tradeName || updated.legalName,
    enabled: updated.whatsappEnabled,
    template: updated.whatsappTemplate ?? DEFAULT_WHATSAPP_TEMPLATE,
    isDefault: !updated.whatsappTemplate,
    defaultTemplate: DEFAULT_WHATSAPP_TEMPLATE,
    tokens: [...WHATSAPP_TEMPLATE_TOKENS],
  };
}
