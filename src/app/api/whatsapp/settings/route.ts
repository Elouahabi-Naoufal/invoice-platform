import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { getWhatsAppSettings, updateWhatsAppSettings } from "@/server/whatsapp-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  try {
    return NextResponse.json(await getWhatsAppSettings(user.id));
  } catch (e) {
    const message = e instanceof Error ? e.message : "settings failed";
    return new NextResponse(message, { status: message === "no company" ? 400 : 500 });
  }
}

export async function PUT(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("settings invalid", { status: 400 });
  }
  try {
    return NextResponse.json(await updateWhatsAppSettings(user.id, body));
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "settings invalid", { status: 400 });
  }
}
