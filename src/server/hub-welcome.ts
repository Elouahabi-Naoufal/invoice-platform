"use server";
import { hubPrisma } from "@/lib/hub-prisma";

export async function sendTenantWelcome(id: string) {
  const tenant = await hubPrisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new Error("not found");
  if (!tenant.phone) throw new Error("no phone number");
  if (!tenant.supportKey) throw new Error("no support key");
  if (tenant.status !== "APPROVED") throw new Error("not approved");

  const domain = `${tenant.subdomain}.${process.env.CLOUDFLARE_DOMAIN || "invora.app"}`;
  const { sendHubWhatsApp } = await import("@/server/whatsapp-send");
  await sendHubWhatsApp(tenant.phone,
    `✅ Welcome to Invora! Your account is ready at https://${domain}\n\nSupport key: ${tenant.supportKey}\n\nSave this key — you'll need it to get help from support.`
  );

  await hubPrisma.auditLog.create({
    data: { adminId: "hub", action: "SEND_WELCOME", details: JSON.stringify({ tenantId: id, phone: tenant.phone }) },
  });
  return { ok: true };
}