import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { buildUblForInvoice } from "@/server/ubl";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireUser(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const u = await (await import("@/server/auth")).requireUser();
  try {
    const xml = await buildUblForInvoice(u.id, params.id);
    return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": `attachment; filename="${params.id}.xml"` } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "not found" }, { status: 404 }); }
}
