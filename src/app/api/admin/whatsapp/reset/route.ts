import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin-session";
import { resetWhatsAppSession } from "@/server/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  try {
    return NextResponse.json(await resetWhatsAppSession());
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "reset failed", { status: 500 });
  }
}