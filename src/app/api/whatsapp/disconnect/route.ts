import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { disconnectWhatsApp } from "@/server/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireUser();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  try {
    return NextResponse.json(await disconnectWhatsApp());
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "disconnect failed", { status: 500 });
  }
}
