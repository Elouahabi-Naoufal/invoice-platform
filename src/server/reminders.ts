"use server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { z } from "zod";
import { dispatchReminder } from "@/server/automation";

export async function listReminders(_userId?: string) {
  const u = await requireUser();
  return prisma.reminder.findMany({
    where: { ownerId: u.id },
    include: { invoice: { select: { invoiceNumber: true, totalTTC: true, dueDate: true } } },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createReminder(_userId: string, raw: unknown) {
  const u = await requireUser();
  const d = z
    .object({
      invoiceId: z.string(),
      type: z.enum(["OVERDUE", "BEFORE_DUE"]).default("OVERDUE"),
      channel: z.enum(["EMAIL", "WHATSAPP"]).default("EMAIL"),
      scheduledAt: z.string().datetime(),
    })
    .parse(raw);
  const inv = await prisma.invoice.findFirst({ where: { id: d.invoiceId, ownerId: u.id, status: "ISSUED" } });
  if (!inv) throw new Error("Invoice not found or not issued");
  return prisma.reminder.create({ data: { ...d, ownerId: u.id } as never });
}

export async function listOverdue(_userId?: string) {
  const u = await requireUser();
  return prisma.invoice.findMany({
    where: { ownerId: u.id, status: "ISSUED", dueDate: { lt: new Date() } },
    orderBy: { dueDate: "asc" },
  });
}

export async function deleteReminder(id: string) {
  const u = await requireUser();
  const r = await prisma.reminder.findFirst({ where: { id, ownerId: u.id } });
  if (!r) throw new Error("not found");
  await prisma.reminder.delete({ where: { id } });
  return { ok: true };
}

/** Manual "send now" from the Relances page. */
export async function sendReminderNow(id: string) {
  const u = await requireUser();
  const r = await prisma.reminder.findFirst({ where: { id, ownerId: u.id } });
  if (!r) throw new Error("not found");
  await dispatchReminder(r);
  return { ok: true };
}
