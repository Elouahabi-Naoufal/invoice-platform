export async function listTenants() {
  const { hubPrisma } = await import("@/lib/hub-prisma");
  return hubPrisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getTenantStats() {
  const { hubPrisma } = await import("@/lib/hub-prisma");
  const [total, pending, approved] = await Promise.all([
    hubPrisma.tenant.count(),
    hubPrisma.tenant.count({ where: { status: "PENDING" } }),
    hubPrisma.tenant.count({ where: { status: "APPROVED" } }),
  ]);
  return { total, pending, approved };
}

export async function approveTenant(id: string, adminId: string) {
  const { hubPrisma } = await import("@/lib/hub-prisma");
  const tenant = await hubPrisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new Error("not found");
  if (tenant.status !== "PENDING") throw new Error("already processed");

  const supportKey = crypto.randomUUID().slice(0, 12);
  const domain = `${tenant.subdomain}.${process.env.CLOUDFLARE_DOMAIN || "invora.app"}`;

  // Create Cloudflare DNS record
  const { createDnsRecord } = await import("@/server/cloudflare");
  const target = process.env.CLOUDFLARE_CNAME_TARGET || `invoice.naoufalelouahabi.com`;
  await createDnsRecord(tenant.subdomain, target);

  // Deploy via Dokploy
  const { createTenantDeployment } = await import("@/server/dokploy");
  const deploymentId = await createTenantDeployment({ subdomain: tenant.subdomain, domain, supportKey });

  await hubPrisma.$transaction([
    hubPrisma.tenant.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: adminId,
        supportKey,
        deploymentId,
      },
    }),
    hubPrisma.auditLog.create({
      data: { adminId, action: "APPROVE_TENANT", details: JSON.stringify({ tenantId: id, subdomain: tenant.subdomain, domain, deploymentId }) },
    }),
  ]);

  // Send WhatsApp welcome notification if hub has WhatsApp connected and tenant has a phone
  if (tenant.phone) {
    try {
      const { sendHubWhatsApp } = await import("@/server/whatsapp-send");
      await sendHubWhatsApp(tenant.phone, `✅ Welcome to Invora! Your account is ready at https://${domain}\n\nSupport key: ${supportKey}\n\nSave this key — you'll need it to get help from support.`);
    } catch (e) {
      console.warn(`[hub] WhatsApp notification failed for ${tenant.subdomain}:`, e);
    }
  }

  return { ok: true, domain, supportKey };
}

export async function rejectTenant(id: string, adminId: string) {
  const { hubPrisma } = await import("@/lib/hub-prisma");
  const tenant = await hubPrisma.tenant.findUnique({ where: { id } });
  if (!tenant) throw new Error("not found");
  await hubPrisma.$transaction([
    hubPrisma.tenant.update({ where: { id }, data: { status: "REJECTED" } }),
    hubPrisma.auditLog.create({
      data: { adminId, action: "REJECT_TENANT", details: JSON.stringify({ tenantId: id, subdomain: tenant.subdomain }) },
    }),
  ]);
  return { ok: true };
}

export async function generateSupportAccessUrl(tenantId: string, adminId: string) {
  const { hubPrisma } = await import("@/lib/hub-prisma");
  const tenant = await hubPrisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  if (!tenant.supportKey) throw new Error("no support key for this tenant");

  const domain = `${tenant.subdomain}.${process.env.CLOUDFLARE_DOMAIN || "invora.app"}`;
  const expiry = Date.now() + 30 * 60_000; // 30 minutes

  const crypto = await import("crypto");
  const payload = `v1:${adminId}:${expiry}`;
  const sig = crypto.default.createHmac("sha256", tenant.supportKey).update(payload).digest("hex").slice(0, 16);
  const token = Buffer.from(`${payload}:${sig}`).toString("base64");

  await hubPrisma.auditLog.create({
    data: { adminId, action: "SUPPORT_ACCESS", details: JSON.stringify({ tenantId, domain }) },
  });

  return { url: `https://${domain}/api/support-login?token=${encodeURIComponent(token)}` };
}