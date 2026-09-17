"use server";
import { prisma } from "@/lib/prisma";
import { requireActor, requireWrite } from "@/server/auth";
import { z } from "zod";
import { dispatchReminder } from "@/server/automation";

export async function listReminders(_userId?: string) {
  const { ownerId } = await requireActor();
  return prisma.reminder.findMany({
    where: { ownerId },
    include: { invoice: { select: { invoiceNumber: true, totalTTC: true, dueDate: true } } },
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createReminder(_userId: string, raw: unknown) {
  const { ownerId } = await requireWrite();
  const d = z
    .object({
      invoiceId: z.string(),
      type: z.enum(["OVERDUE", "BEFORE_DUE"]).default("OVERDUE"),
      channel: z.enum(["WHATSAPP"]).default("WHATSAPP"),
      scheduledAt: z.string().datetime(),
    })
    .parse(raw);
  const inv = await prisma.invoice.findFirst({ where: { id: d.invoiceId, ownerId, status: "ISSUED" } });
  if (!inv) throw new Error("Invoice not found or not issued");
  const reminder = await prisma.reminder.create({ data: { ...d, ownerId } as never });

  // If it is already due, send it right away so scheduling feels immediate.
  if (new Date(d.scheduledAt).getTime() <= Date.now()) {
    try {
      await dispatchReminder(reminder);
      return { ...reminder, sentNow: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "send failed";
      await prisma.reminder
        .update({ where: { id: reminder.id }, data: { attempts: { increment: 1 }, lastError: msg } })
        .catch(() => undefined);
      throw new Error(`Reminder saved but not sent — ${msg}`);
    }
  }
  return { ...reminder, sentNow: false };
}

export async function listOverdue(_userId?: string) {
  const { ownerId } = await requireActor();
  return prisma.invoice.findMany({
    where: { ownerId, status: "ISSUED", dueDate: { lt: new Date() } },
    orderBy: { dueDate: "asc" },
  });
}

export async function deleteReminder(id: string) {
  const { ownerId } = await requireWrite();
  const r = await prisma.reminder.findFirst({ where: { id, ownerId } });
  if (!r) throw new Error("not found");
  await prisma.reminder.delete({ where: { id } });
  return { ok: true };
}

/** Manual "send now" from the Relances page. */
export async function sendReminderNow(id: string) {
  const { ownerId } = await requireWrite();
  const r = await prisma.reminder.findFirst({ where: { id, ownerId } });
  if (!r) throw new Error("not found");
  await dispatchReminder(r);
  return { ok: true };
}
