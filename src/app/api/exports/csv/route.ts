import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { buildInvoicesCsv } from "@/server/csv";

export async function GET(req: NextRequest) {
  try { await requireUser(); } catch { return NextResponse.json({ error: "unauthorized" }, { status: 401 }); }
  const u = await (await import("@/server/auth")).requireUser();
  const { searchParams } = new URL(req.url);
  const csv = await buildInvoicesCsv(u.id, { from: searchParams.get("from") ?? undefined, to: searchParams.get("to") ?? undefined });
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
