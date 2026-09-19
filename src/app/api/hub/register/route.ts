import { NextResponse } from "next/server";
import { createRegistration } from "@/server/hub-api";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.HUB_API_SECRET;
  if (!secret) return false;
  return req.headers.get("x-hub-secret") === secret;
}

/** Called by the router container to submit a registration. */
export async function POST(req: Request) {
  if (!process.env.HUB_API_SECRET) return NextResponse.json({ error: "HUB_API_SECRET not configured" }, { status: 500 });
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`hub-register:${ip}`, 5, 60 * 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many registration attempts." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const res = await createRegistration(body);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}