"use server";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifySupportToken } from "@/server/support-token";

const COOKIE = "ip_session";
const ACTIVE_COMPANY = "ip_company";
const PASSWORD_MIN = 8;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be 32+ chars");
  return new TextEncoder().encode(s);
}

function assertPasswordPolicy(pw: unknown): string {
  if (typeof pw !== "string" || pw.length < PASSWORD_MIN) {
    throw new Error(`password must be at least ${PASSWORD_MIN} characters`);
  }
  return pw;
}

/* ---------- login rate limiting (in-memory, single instance) ---------- */
const MAX_FAILURES = 8;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 10 * 60 * 1000;
const loginAttempts = new Map<string, { count: number; first: number; lockedUntil: number }>();

function assertNotLocked(key: string) {
  const rec = loginAttempts.get(key);
  if (!rec) return;
  if (rec.lockedUntil > Date.now()) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    throw new Error(`too many attempts — try again in ${mins} min`);
  }
}

function recordFailure(key: string) {
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, first: now, lockedUntil: 0 });
    return;
  }
  rec.count += 1;
  if (rec.count >= MAX_FAILURES) rec.lockedUntil = now + LOCK_MS;
}

function clearFailures(key: string) {
  loginAttempts.delete(key);
}

export async function register(owner: { email: string; password: string; displayName: string }): Promise<{ ok?: true; error?: string }> {
  const email = String(owner?.email ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) return { error: "A valid email is required." };
  let password: string;
  try {
    password = assertPasswordPolicy(owner?.password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Invalid password" };
  }
  const displayName = String(owner?.displayName ?? "").trim() || "Admin";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "That email is already registered." };
  // Single-user mode: refuse second registration unless ALLOW_MULTIUSER=1
  if (process.env.ALLOW_MULTIUSER !== "1") {
    const count = await prisma.user.count();
    if (count > 0) return { error: "Registration is closed on this workspace." };
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { email, passwordHash, displayName } });
  await setSession(user.id);
  return { ok: true };
}

export async function login(email: string, password: string): Promise<{ ok?: true; error?: string }> {
  const key = String(email ?? "").toLowerCase().trim();
  try {
    assertNotLocked(key);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Too many attempts." };
  }
  const user = await prisma.user.findUnique({ where: { email: key } });
  if (!user || !(await bcrypt.compare(String(password ?? ""), user.passwordHash))) {
    recordFailure(key);
    return { error: "Invalid email or password." };
  }
  clearFailures(key);
  await setSession(user.id);
  return { ok: true };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const user = await requireUser();
  if (!(await bcrypt.compare(String(currentPassword ?? ""), user.passwordHash))) {
    throw new Error("current password is incorrect");
  }
  const pw = assertPasswordPolicy(newPassword);
  const passwordHash = await bcrypt.hash(pw, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { ok: true };
}

export async function updateProfile(displayName: string) {
  const user = await requireUser();
  const name = String(displayName ?? "").trim();
  if (name.length < 2) throw new Error("display name must be at least 2 characters");
  await prisma.user.update({ where: { id: user.id }, data: { displayName: name } });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  (await cookies()).delete(ACTIVE_COMPANY);
}

async function setSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
}

/** Server-side auth: every private operation must call this. Never trust UI/middleware alone. */
export async function requireUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) throw new Error("unauthorized");
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = payload.sub as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("unauthorized");
    return user;
  } catch {
    throw new Error("unauthorized");
  }
}

export type Role = "OWNER" | "ADMIN" | "VIEWER";

export interface Actor {
  userId: string;
  /** The tenancy boundary: the owner whose data this actor may access. */
  ownerId: string;
  role: Role;
  email: string;
  displayName: string;
}

/**
 * Resolve the effective actor. A user who is a member of someone else's
 * account acts on that owner's data with the member's role; otherwise the
 * user owns their own data as OWNER.
 */
export async function requireActor(): Promise<Actor> {
  // Support session: read-only access granted to the platform admin.
  const supportKey = process.env.SUPPORT_KEY;
  if (supportKey) {
    const supportToken = (await cookies()).get("support_token")?.value;
    if (supportToken) {
      try {
        const { adminId } = verifySupportToken(supportKey, supportToken);
        const owner = await prisma.user.findFirst({ orderBy: { id: "asc" } });
        if (owner) {
          return {
            userId: "support",
            ownerId: owner.id,
            role: "VIEWER",
            email: adminId,
            displayName: "Support (read-only)",
          };
        }
      } catch {
        // fall through to normal auth
      }
    }
  }

  const user = await requireUser();
  const member = await prisma.member.findFirst({ where: { userId: user.id, revokedAt: null } });
  if (member) {
    return { userId: user.id, ownerId: member.ownerId, role: member.role as Role, email: user.email, displayName: user.displayName };
  }
  return { userId: user.id, ownerId: user.id, role: "OWNER", email: user.email, displayName: user.displayName };
}

/** VIEWER is read-only; OWNER/ADMIN may write. */
export async function requireWrite(): Promise<Actor> {
  const actor = await requireActor();
  if (actor.role === "VIEWER") throw new Error("forbidden: read-only access");
  return actor;
}

export async function requireRole(roles: Role[]): Promise<Actor> {
  const actor = await requireActor();
  if (!roles.includes(actor.role)) throw new Error("forbidden");
  return actor;
}

export async function getActiveCompanyId(): Promise<string | null> {
  return (await cookies()).get(ACTIVE_COMPANY)?.value ?? null;
}

export async function setActiveCompany(companyId: string) {
  const actor = await requireActor();
  const c = await prisma.company.findFirst({ where: { id: companyId, ownerId: actor.ownerId } });
  if (!c) throw new Error("not found"); // IDOR-safe: scoped to owner
  (await cookies()).set(ACTIVE_COMPANY, companyId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
}
