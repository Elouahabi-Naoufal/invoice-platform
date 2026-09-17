"use server";
import { cookies } from "next/headers";
import { hubPrisma } from "@/lib/hub-prisma";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "hub_admin_session";
const SESSION_MS = 8 * 3600_000;

export async function adminLogin(email: string, password: string) {
  const key = email.toLowerCase().trim();
  if (!key || !key.includes("@")) throw new Error("valid email required");
  const admin = await hubPrisma.superAdmin.findUnique({ where: { email: key } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash)))
    throw new Error("invalid credentials");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const session = await hubPrisma.hubSession.create({
    data: { adminId: admin.id, expiresAt },
  });
  const cookie = await cookies();
  cookie.set(SESSION_COOKIE, session.id, {
    expires: expiresAt,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
  });
  return { id: admin.id, email: admin.email };
}

export async function adminLogout() {
  const cookie = await cookies();
  const sid = cookie.get(SESSION_COOKIE)?.value;
  if (sid) {
    await hubPrisma.hubSession.delete({ where: { id: sid } }).catch(() => undefined);
    cookie.delete(SESSION_COOKIE);
  }
}

export async function requireAdmin() {
  const cookie = await cookies();
  const sid = cookie.get(SESSION_COOKIE)?.value;
  if (!sid) throw new Error("not authenticated");
  const session = await hubPrisma.hubSession.findUnique({
    where: { id: sid },
    include: { admin: true },
  });
  if (!session || session.expiresAt < new Date()) {
    cookie.delete(SESSION_COOKIE);
    throw new Error("session expired");
  }
  return { id: session.admin.id, email: session.admin.email, displayName: session.admin.displayName };
}

export async function seedAdmin(email: string, password: string) {
  const key = email.toLowerCase().trim();
  const exists = await hubPrisma.superAdmin.findUnique({ where: { email: key } });
  if (exists) throw new Error("admin already exists");
  const passwordHash = await bcrypt.hash(password, 12);
  return hubPrisma.superAdmin.create({ data: { email: key, passwordHash } });
}