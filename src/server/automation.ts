/**
 * Server-only automation core (NOT a "use server" module).
 * Exposes the recurring/reminder runners used by the scheduler and the
 * secret-protected cron endpoint — never callable as client actions.
 */
import { prisma } from "@/lib/prisma";
import { sendInvoiceViaWhatsApp } from "@/server/whatsapp-send";
import { createDraftInvoice, finalizeInvoice } from "@/server/invoices";
import { parseJsonArray } from "@/lib/safe";
import { toShortMessage } from "@/lib/errors";

function errorMessage(e: unknown): string {
  return toShortMessage(e);
}

/** Next run date strictly after `now`, stepping by periodDays. */
export function computeNextRun(from: Date, periodDays: number, now: Date = new Date()): Date {
  const period = Math.max(1, Math.floor(periodDays));
  const next = new Date(from);
  let guard = 0;
  while (next <= now && guard < 5000) {
    next.setDate(next.getDate() + period);
    guard += 1;
  }
  return next;
}

interface TemplateRow {
  id: string;
  ownerId: string;
  companyId: string | null;
  clientId: string | null;
  docType: string;
  currency: string;
  paymentTerms: string;
  periodDays: number;
  lines: string;
}

/** Create + finalize an invoice from a recurring template. */
export async function generateFromTemplate(ownerId: string, t: TemplateRow) {
  const lines = parseJsonArray(t.lines);
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("template has no lines");
  const today = new Date();
  const dueDate = new Date(today.getTime() + Math.max(1, t.periodDays) * 86400000);
  const draft = await createDraftInvoice(ownerId, {
    companyId: t.companyId,
    clientId: t.clientId,
    docType: t.docType,
    currency: t.currency,
    issueDate: today.toISOString().split("T")[0],
    dueDate: dueDate.toISOString().split("T")[0],
    paymentTerms: t.paymentTerms,
    lines,
  });
  return finalizeInvoice(ownerId, draft.id);
}

interface ReminderRow {
  id: string;
  ownerId: string;
  invoiceId: string;
  channel: string;
}

/** Send one reminder over WhatsApp and mark it sent. */
export async function dispatchReminder(reminder: ReminderRow) {
  await sendInvoiceViaWhatsApp(reminder.ownerId, reminder.invoiceId);
  await prisma.reminder.update({
    where: { id: reminder.id },
    data: { sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
  });
  await prisma.invoiceEvent.create({
    data: { invoiceId: reminder.invoiceId, actorId: reminder.ownerId, type: "reminder_sent", metadata: "WHATSAPP" },
  });
}

export async function runDueReminders(limit = 50): Promise<{ processed: number; sent: number; failed: number }> {
  const due = await prisma.reminder.findMany({
    where: { sentAt: null, scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: limit,
  });
  let sent = 0;
  let failed = 0;
  for (const r of due) {
    try {
      await dispatchReminder(r);
      sent += 1;
    } catch (e) {
      failed += 1;
      await prisma.reminder
        .update({ where: { id: r.id }, data: { attempts: { increment: 1 }, lastError: errorMessage(e) } })
        .catch(() => undefined);
    }
  }
  return { processed: due.length, sent, failed };
}

export async function runDueRecurring(
  limit = 25
): Promise<{ processed: number; generated: number; sent: number; failed: number }> {
  const now = new Date();
  const due = await prisma.recurringTemplate.findMany({
    where: {
      active: true,
      OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null, startDate: { lte: now } }],
    },
    orderBy: { nextRunAt: "asc" },
    take: limit,
  });
  let generated = 0;
  let sent = 0;
  let failed = 0;
  for (const t of due) {
    if (!t.companyId || !t.clientId) {
      failed += 1;
      await prisma.recurringTemplate
        .update({ where: { id: t.id }, data: { lastError: "company and client are required to generate" } })
        .catch(() => undefined);
      continue;
    }
    const base = t.nextRunAt ?? t.startDate;
    const next = computeNextRun(base, t.periodDays, now);
    // Atomic claim: advance the schedule before generating so concurrent ticks
    // (or multiple instances) cannot generate the same period twice.
    const claim = await prisma.recurringTemplate.updateMany({
      where: { id: t.id, active: true, nextRunAt: t.nextRunAt },
      data: { nextRunAt: next, lastGeneratedAt: now },
    });
    if (claim.count === 0) continue;
    try {
      const invoice = await generateFromTemplate(t.ownerId, t);
      await prisma.recurringTemplate.update({
        where: { id: t.id },
        data: { lastGeneratedInvoiceId: invoice.id, lastError: null },
      });
      generated += 1;
      if (t.autoSend && t.sendChannel === "WHATSAPP") {
        await sendInvoiceViaWhatsApp(t.ownerId, invoice.id);
        sent += 1;
      }
    } catch (e) {
      failed += 1;
      await prisma.recurringTemplate
        .update({ where: { id: t.id }, data: { lastError: errorMessage(e) } })
        .catch(() => undefined);
    }
  }
  return { processed: due.length, generated, sent, failed };
}

export async function runDueJobs() {
  const startedAt = Date.now();
  const reminders = await runDueReminders().catch((e) => ({ error: errorMessage(e) }));
  const recurring = await runDueRecurring().catch((e) => ({ error: errorMessage(e) }));
  return { reminders, recurring, durationMs: Date.now() - startedAt };
}
