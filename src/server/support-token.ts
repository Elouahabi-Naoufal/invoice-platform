/**
 * HMAC-signed support tokens. Shared by the hub (sign) and tenant app (verify).
 * The signing secret is the tenant's SUPPORT_KEY (env var in the tenant container).
 */
import crypto from "crypto";

export interface SupportTokenPayload {
  adminId: string;
  expiry: number;
}

export function signSupportToken(supportKey: string, adminId: string, expiry: number): string {
  const payload = `v1:${adminId}:${expiry}`;
  const sig = crypto.createHmac("sha256", supportKey).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifySupportToken(supportKey: string, token: string): SupportTokenPayload {
  const decoded = Buffer.from(token, "base64url").toString("utf-8");
  const parts = decoded.split(":");
  if (parts.length !== 4) throw new Error("malformed token");
  const [version, adminId, expiryStr, sig] = parts;
  if (version !== "v1") throw new Error("unsupported token version");
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry)) throw new Error("malformed expiry");
  if (Date.now() > expiry) throw new Error("token expired");
  const expected = crypto.createHmac("sha256", supportKey).update(`v1:${adminId}:${expiry}`).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("invalid signature");
  return { adminId, expiry };
}