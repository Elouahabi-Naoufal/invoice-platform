import { NextRequest, NextResponse } from "next/server";
import { requireActor } from "@/server/auth";
import { buildReports, reportsToCsv } from "@/server/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let ownerId: string;
  try {
    ownerId = (await requireActor()).ownerId;
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
    const data = await buildReports(ownerId, {
      companyId: searchParams.get("companyId") ?? undefined,
      from,
      to,
    });
    return new NextResponse(reportsToCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reports-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "export failed" }, { status: 500 });
  }
}
