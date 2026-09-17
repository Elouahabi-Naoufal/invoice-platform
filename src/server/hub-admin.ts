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

  await hubPrisma.$transaction([
    hubPrisma.tenant.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: adminId,
        supportKey,
      },
    }),
    hubPrisma.auditLog.create({
      data: { adminId, action: "APPROVE_TENANT", details: JSON.stringify({ tenantId: id, subdomain: tenant.subdomain }) },
    }),
  ]);
  return { ok: true, supportKey };
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
  const expiry = Date.now() + 30 * 60_000;
  const payload = `v1:${adminId}:${expiry}`;
  const { createHmac } = await import("crypto");
  const sig = createHmac("sha256", tenant.supportKey).update(payload).digest("hex").slice(0, 16);
  const token = Buffer.from(`${payload}:${sig}`).toString("base64");

  await hubPrisma.auditLog.create({
    data: { adminId, action: "SUPPORT_ACCESS", details: JSON.stringify({ tenantId, domain }) },
  });

  return { url: `https://${domain}/api/support-login?token=${encodeURIComponent(token)}` };
}