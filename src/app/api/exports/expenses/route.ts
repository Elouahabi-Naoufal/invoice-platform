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
  const rows = await prisma.expense.findMany({ where: { ownerId }, orderBy: { date: "desc" }, take: EXPORT_LIMIT });
  const body = rows.map((e) => [
    new Date(e.date).toISOString().slice(0, 10),
    e.description, e.supplier ?? "", e.category ?? "",
    minorToPlain(e.amountHTMinor), minorToPlain(e.totalMinor), e.currency,
    e.paymentMethod, e.reference ?? "", e.billable ? "yes" : "no",
  ]);
  const csv = toCsv(body, ["date", "description", "supplier", "category", "amountHT", "total", "currency", "paymentMethod", "reference", "billable"]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="expenses-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
