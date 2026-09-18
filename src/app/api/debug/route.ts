import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const debugKey = process.env.DEBUG_KEY;
  if (!debugKey) return NextResponse.json({ error: "debug disabled" }, { status: 404 });

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key !== debugKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const out: Record<string, unknown> = {
    databaseUrl: process.env.DATABASE_URL ?? null,
    hasAdminEmail: !!process.env.HUB_ADMIN_EMAIL,
    hasAdminPassword: !!process.env.HUB_ADMIN_PASSWORD,
    adminEmail: process.env.HUB_ADMIN_EMAIL ?? null,
    dokployConfigured: !!(process.env.DOKPLOY_URL && process.env.DOKPLOY_TOKEN),
    emailConfigured: !!process.env.SMTP_HOST,
    supportEnabled: !!process.env.SUPPORT_KEY,
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
    out.registrationCount = await prisma.registration.count();
    out.tenantCount = await prisma.tenant.count();
  } catch (e) {
    out.countError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(out);
}