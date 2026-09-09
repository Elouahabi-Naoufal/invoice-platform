"use server";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE = "ip_session";
const ACTIVE_COMPANY = "ip_company";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be 32+ chars");
  return new TextEncoder().encode(s);
}

export async function register(owner: { email: string; password: string; displayName: string }) {
  const exists = await prisma.user.findUnique({ where: { email: owner.email.toLowerCase() } });
  if (exists) throw new Error("email taken");
  // Single-user mode: refuse second registration unless ALLOW_MULTIUSER=1
  if (process.env.ALLOW_MULTIUSER !== "1") {
    const count = await prisma.user.count();
    if (count > 0) throw new Error("single-user mode: registration closed");
  }
  const passwordHash = await bcrypt.hash(owner.password, 12);
  const user = await prisma.user.create({
    data: { email: owner.email.toLowerCase(), passwordHash, displayName: owner.displayName },
  });
  await setSession(user.id);
  return { id: user.id, email: user.email };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new Error("invalid credentials");
  await setSession(user.id);
  return { id: user.id, email: user.email };
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

export async function getActiveCompanyId(): Promise<string | null> {
  return (await cookies()).get(ACTIVE_COMPANY)?.value ?? null;
}

export async function setActiveCompany(companyId: string) {
  const user = await requireUser();
  const c = await prisma.company.findFirst({ where: { id: companyId, ownerId: user.id } });
  if (!c) throw new Error("not found"); // IDOR-safe: scoped to owner
  (await cookies()).set(ACTIVE_COMPANY, companyId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86400 });
}
