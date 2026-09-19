/**
 * Support access: an admin can open a tenant's app in a temporary, read-only
 * session. The token is HMAC-signed with the tenant's support key (shared secret)
 * so the tenant app can verify it locally without calling the hub.
 */
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { tenantDomain } from "@/server/tenant-domain";
import { signSupportToken } from "@/server/support-token";

const TOKEN_TTL_MS = 30 * 60_000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generateSupportAccess(tenantId: string, adminId: string, providedKey: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("not found");
  if (tenant.status !== "ACTIVE") throw new Error("tenant is not active");
  if (!tenant.supportKey) throw new Error("no support key on tenant");
  if (providedKey.trim() !== tenant.supportKey) throw new Error("support key does not match");

  const expiry = Date.now() + TOKEN_TTL_MS;
  const token = signSupportToken(tenant.supportKey, adminId, expiry);

  await prisma.$transaction([
    prisma.supportAccess.create({
      data: { tenantId, adminId, tokenHash: hashToken(token), expiresAt: new Date(expiry) },
    }),
    prisma.auditLog.create({
      data: { adminId, action: "SUPPORT_ACCESS_GRANTED", tenantId, metadata: JSON.stringify({ expiresAt: new Date(expiry).toISOString() }) },
    }),
  ]);

  const url = `https://${tenantDomain(tenant.slug)}/api/support-login?token=${encodeURIComponent(token)}`;
  return { url, expiresAt: new Date(expiry) };
}

export async function revokeSupportAccess(tenantId: string, adminId: string) {
  const res = await prisma.supportAccess.updateMany({
    where: { tenantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { adminId, action: "SUPPORT_ACCESS_REVOKED", tenantId, metadata: JSON.stringify({ count: res.count }) },
  });
  return { ok: true, revoked: res.count };
}

export async function listSupportAccess(tenantId: string) {
  return prisma.supportAccess.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20 });
}