import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { sendInvoiceViaWhatsApp } from "@/server/whatsapp-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusFor(message: string): number {
  if (message === "not found") return 404;
  if (message === "only ISSUED sendable") return 400;
  if (message === "WhatsApp sending is disabled for this company") return 400;
  if (message === "WhatsApp send already in progress") return 409;
  if (message.startsWith("recipient invalid")) return 400;
  if (message === "number is not registered on WhatsApp") return 404;
  if (message === "public link unavailable") return 500;
  if (/not ready after|client unavailable/i.test(message)) return 503;
  return 502;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  let body: { to?: unknown } = {};
  try {
    body = (await req.json()) as { to?: unknown };
  } catch {
    body = {};
  }
  try {
    const result = await sendInvoiceViaWhatsApp(user.id, params.id, { to: body?.to });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "WhatsApp send failed";
    return new NextResponse(message, { status: statusFor(message) });
  }
}
