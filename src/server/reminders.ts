"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";

export async function listReminders(userId: string) {
  return prisma.reminder.findMany({
    where: { ownerId: userId },
    include: { invoice: { select: { invoiceNumber: true, totalTTC: true, dueDate: true } } },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createReminder(userId: string, raw: unknown) {
  const u = await requireUser();
  const d = z.object({ invoiceId: z.string(), type: z.string().optional(), channel: z.string().optional(), scheduledAt: z.string().datetime() }).parse(raw);
  const inv = await prisma.invoice.findFirst({ where: { id: d.invoiceId, ownerId: u.id } });
  if (!inv) throw new Error("Invoice not found");
  return prisma.reminder.create({ data: { ...d, ownerId: u.id } as never });
}

export async function listOverdue(userId: string) {
  return prisma.invoice.findMany({
    where: { ownerId: userId, status: "ISSUED", dueDate: { lt: new Date().toISOString().split("T")[0] } },
    orderBy: { dueDate: "asc" },
  });
}