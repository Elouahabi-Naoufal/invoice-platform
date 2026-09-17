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
  const rows = await prisma.expense.findMany({ where: { ownerId }, orderBy: { date: "desc" }, take: 5000 });
  const header = ["date", "description", "supplier", "category", "amountHT", "total", "paymentMethod", "reference", "billable"].join(";");
  const lines = rows.map((e) => [
    new Date(e.date).toISOString().slice(0, 10),
    e.description, e.supplier ?? "", e.category ?? "",
    (e.amountHTMinor / 100).toFixed(2), (e.totalMinor / 100).toFixed(2),
    e.paymentMethod, e.reference ?? "", e.billable ? "yes" : "no",
  ].map(esc).join(";"));
  return new NextResponse([header, ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
