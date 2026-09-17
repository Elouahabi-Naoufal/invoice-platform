"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";
import { computeCharges, toRateLike } from "@/domain/charges";

export async function listEmployees() {
  const { ownerId } = await requireActor();
  return prisma.employee.findMany({ where: { ownerId, active: true }, orderBy: { fullName: "asc" } });
}

export async function createEmployee(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = z.object({
    fullName: z.string().min(1),
    position: z.string().optional().nullable(),
    grossSalaryMinor: z.number().int().min(0),
    currency: z.string().default("MAD"),
    notes: z.string().optional().nullable(),
  }).parse(raw);
  return prisma.employee.create({ data: { ...d, ownerId } as never });
}

export async function deleteEmployee(id: string) {
  const { ownerId } = await requireWrite();
  const e = await prisma.employee.findFirst({ where: { id, ownerId } });
  if (!e) throw new Error("not found");
  await prisma.employee.update({ where: { id }, data: { active: false } });
  return { ok: true };
}

export async function listPayslips() {
  const { ownerId } = await requireActor();
  return prisma.payslip.findMany({
    where: { ownerId },
    include: { employee: { select: { fullName: true } } },
    orderBy: { period: "desc" },
    take: 200,
  });
}

export async function generatePayslip(raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = z.object({
    employeeId: z.string(),
    period: z.string().regex(/^\d{4}-\d{2}$/, "period must be YYYY-MM"),
    employerRateIds: z.array(z.string()).default([]),
    employeeRateIds: z.array(z.string()).default([]),
    grossMinor: z.number().int().min(0).optional(),
    notes: z.string().optional().nullable(),
  }).parse(raw);

  const emp = await prisma.employee.findFirst({ where: { id: d.employeeId, ownerId } });
  if (!emp) throw new Error("employee not found");
  const gross = d.grossMinor ?? emp.grossSalaryMinor;

  const ids = [...new Set([...d.employerRateIds, ...d.employeeRateIds])];
  const rates = ids.length ? await prisma.rate.findMany({ where: { id: { in: ids }, ownerId } }) : [];
  const map = new Map(rates.map((r) => [r.id, r]));
  const employerRates = d.employerRateIds.map((id) => map.get(id)).filter(Boolean).map((r) => toRateLike(r as never));
  const employeeRates = d.employeeRateIds.map((id) => map.get(id)).filter(Boolean).map((r) => toRateLike(r as never));

  const employer = computeCharges(employerRates, gross);
  const deductions = computeCharges(employeeRates, gross);
  const employerCostMinor = gross + employer.total;
  const netMinor = gross - deductions.total;

  return prisma.payslip.create({
    data: {
      ownerId,
      employeeId: emp.id,
      period: d.period,
      grossMinor: gross,
      currency: emp.currency,
      employerCharges: JSON.stringify(employer.lines),
      employeeDeductions: JSON.stringify(deductions.lines),
      employerCostMinor,
      netMinor,
      notes: d.notes || null,
    } as never,
  });
}

export async function deletePayslip(id: string) {
  const { ownerId } = await requireWrite();
  const p = await prisma.payslip.findFirst({ where: { id, ownerId } });
  if (!p) throw new Error("not found");
  await prisma.payslip.delete({ where: { id } });
  return { ok: true };
}

export async function markPayslipPaid(id: string) {
  const { ownerId } = await requireWrite();
  const p = await prisma.payslip.findFirst({ where: { id, ownerId }, include: { employee: { select: { fullName: true } } } });
  if (!p) throw new Error("not found");
  const updated = await prisma.payslip.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
  // Auto-post the employer cost to the money ledger.
  const account = await prisma.account.findFirst({ where: { ownerId, currency: p.currency, active: true }, orderBy: { createdAt: "asc" } });
  if (account && p.employerCostMinor > 0) {
    await prisma.ledgerEntry.create({
      data: {
        ownerId,
        accountId: account.id,
        direction: "OUT",
        amountMinor: p.employerCostMinor,
        currency: p.currency,
        label: `Salary ${p.period} — ${p.employee.fullName}`,
        category: "Payroll",
        date: new Date(),
      },
    });
  }
  return updated;
}
