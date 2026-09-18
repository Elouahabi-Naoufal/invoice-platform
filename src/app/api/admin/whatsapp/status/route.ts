import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin-auth";
import { getWhatsAppStatus } from "@/server/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  try {
    return NextResponse.json(await getWhatsAppStatus());
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "status failed", { status: 500 });
  }
}