import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key !== process.env.HUB_ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const out: Record<string, unknown> = {
    databaseUrl: process.env.DATABASE_URL ?? null,
    hasAdminEmail: !!process.env.HUB_ADMIN_EMAIL,
    hasAdminPassword: !!process.env.HUB_ADMIN_PASSWORD,
    adminEmail: process.env.HUB_ADMIN_EMAIL ?? null,
    cwd: process.cwd(),
  };

  try {
    const admins = await prisma.superAdmin.findMany({ select: { email: true, createdAt: true } });
    out.adminCount = admins.length;
    out.admins = admins;
  } catch (e) {
    out.adminQueryError = e instanceof Error ? e.message : String(e);
  }

  try {
    const regs = await prisma.registration.count();
    out.registrationCount = regs;
  } catch (e) {
    out.registrationError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(out);
}