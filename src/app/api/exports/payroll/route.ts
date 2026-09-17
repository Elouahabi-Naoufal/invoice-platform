import { NextResponse } from "next/server";
import { requireActor } from "@/server/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  let ownerId: string;
  try { ownerId = (await requireActor()).ownerId; } catch { return new NextResponse("unauthorized", { status: 401 }); }
  const rows = await prisma.payslip.findMany({ where: { ownerId }, include: { employee: { select: { fullName: true } } }, orderBy: { period: "desc" }, take: 5000 });
  const header = ["period", "employee", "gross", "net", "employerCost", "currency", "status"].join(";");
  const lines = rows.map((p) => [
    p.period, p.employee.fullName,
    (p.grossMinor / 100).toFixed(2), (p.netMinor / 100).toFixed(2), (p.employerCostMinor / 100).toFixed(2),
    p.currency, p.status,
  ].map(esc).join(";"));
  return new NextResponse([header, ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payroll-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
