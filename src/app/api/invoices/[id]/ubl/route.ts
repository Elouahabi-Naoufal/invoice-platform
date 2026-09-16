import { NextResponse } from "next/server";
import { requireActor } from "@/server/auth";
import { buildUblForInvoice } from "@/server/ubl";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let ownerId: string;
  try {
    ownerId = (await requireActor()).ownerId;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const xml = await buildUblForInvoice(ownerId, params.id);
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${params.id}.xml"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "not found";
    return NextResponse.json({ error: message }, { status: message === "not found" ? 404 : 500 });
  }
}
