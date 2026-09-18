"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ADMIN_SESSION_COOKIE } from "@/server/admin-session";

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
  cookie.set(ADMIN_SESSION_COOKIE, admin.id, {
    expires: expiresAt,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}

export async function adminLogout() {
  const cookie = await cookies();
  cookie.set(ADMIN_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  cookie.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin-login");
}