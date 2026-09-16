import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { sendInvoiceEmail } from "@/server/email";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return new NextResponse("unauthorized", { status: 401 });
  }
  let body: { to?: unknown; subject?: unknown; message?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  try {
    const result = await sendInvoiceEmail(user.id, params.id, {
      to: typeof body.to === "string" ? body.to : undefined,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      message: typeof body.message === "string" ? body.message : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "send failed";
    const status = message === "not found" ? 404 : message === "only ISSUED sendable" || message.startsWith("recipient invalid") ? 400 : message.startsWith("SMTP not configured") ? 500 : 502;
    return new NextResponse(message, { status });
  }
}
