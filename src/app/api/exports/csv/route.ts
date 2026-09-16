import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { buildInvoicesCsv } from "@/server/csv";

export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return NextResponse.json({ error: "invalid date range" }, { status: 400 });
  }
  try {
    const csv = await buildInvoicesCsv(user.id, { from, to });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "export failed" }, { status: 500 });
  }
}
