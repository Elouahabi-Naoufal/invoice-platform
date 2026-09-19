import { NextResponse } from "next/server";
import { resolveTenantByEmail } from "@/server/hub-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.HUB_API_SECRET;
  if (!secret) return false;
  return req.headers.get("x-hub-secret") === secret;
}

/** Called by the router container to resolve an email → workspace URL. */
export async function GET(req: Request) {
  if (!process.env.HUB_API_SECRET) return NextResponse.json({ error: "HUB_API_SECRET not configured" }, { status: 500 });
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email = new URL(req.url).searchParams.get("email") ?? "";
  const res = await resolveTenantByEmail(email);
  return NextResponse.json(res);
}