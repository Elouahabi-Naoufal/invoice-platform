"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "hub_session";
const SESSION_MS = 8 * 3600_000;

export async function adminLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  let admin;
  try {
    admin = await prisma.superAdmin.findUnique({ where: { email } });
  } catch (e) {
    console.error("[adminLogin]", e instanceof Error ? e.message : e);
    redirect(`/admin-login?error=${encodeURIComponent("Database: " + (e instanceof Error ? e.message : String(e)))}`);
  }

  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    redirect("/admin-login?error=invalid+credentials");
  }

  const expiresAt = new Date(Date.now() + SESSION_MS);
  const cookie = await cookies();
  cookie.set(SESSION_COOKIE, admin.id, {
    expires: expiresAt,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
  });
  redirect("/admin");
}

export async function adminLogout() {
  const cookie = await cookies();
  cookie.delete(SESSION_COOKIE);
  redirect("/admin-login");
}

export async function requireAdmin() {
  const cookie = await cookies();
  const sid = cookie.get(SESSION_COOKIE)?.value;
  if (!sid) throw new Error("not authenticated");
  const admin = await prisma.superAdmin.findUnique({ where: { id: sid } });
  if (!admin) throw new Error("session invalid");
  return { id: admin.id, email: admin.email };
}

export async function bootstrapAdmin(email: string, password: string) {
  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) return;
  const hash = await bcrypt.hash(password, 12);
  await prisma.superAdmin.create({ data: { email, passwordHash: hash } });
}