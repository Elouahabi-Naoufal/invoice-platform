import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin-session";
import { whatsappGateway } from "@/server/whatsapp";
import { normalizeWhatsAppRecipient } from "@/server/whatsapp-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { to?: string; text?: string };
    if (!body.to) return new NextResponse("missing 'to' number", { status: 400 });
    const to = normalizeWhatsAppRecipient(body.to);
    await whatsappGateway.ensureReady();
    const chatId = await whatsappGateway.resolveChatId(to);
    if (!chatId) return new NextResponse("number is not registered on WhatsApp", { status: 400 });
    const { messageId } = await whatsappGateway.sendText(
      chatId,
      body.text || "Test message from Invora Hub — your WhatsApp is connected correctly."
    );
    return NextResponse.json({ ok: true, messageId });
  } catch (e) {
    return new NextResponse(e instanceof Error ? e.message : "send failed", { status: 500 });
  }
}