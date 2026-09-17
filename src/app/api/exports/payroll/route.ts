import { NextResponse } from "next/server";
import { requireActor } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { minorToPlain, toCsv } from "@/lib/csv";
import { EXPORT_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ownerId: string;
  try { ownerId = (await requireActor()).ownerId; } catch { return new NextResponse("unauthorized", { status: 401 }); }
  const rows = await prisma.payslip.findMany({ where: { ownerId }, include: { employee: { select: { fullName: true } } }, orderBy: { period: "desc" }, take: EXPORT_LIMIT });
  const body = rows.map((p) => [
    p.period, p.employee.fullName,
    minorToPlain(p.grossMinor), minorToPlain(p.netMinor), minorToPlain(p.employerCostMinor),
    p.currency, p.status,
  ]);
  const csv = toCsv(body, ["period", "employee", "gross", "net", "employerCost", "currency", "status"]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payroll-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
