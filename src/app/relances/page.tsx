import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { ReminderForm } from "@/components/ReminderForm";
import { formatMoney } from "@/domain/invoice";

export default async function RelancesPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  const u = await prisma.user.findFirst({ where: { email: (await requireUser()).email } as never });
  if (!u) redirect("/login");
  const overdue = await safeFindMany(() => prisma.invoice.findMany({ where: { ownerId: u.id, status: "ISSUED", dueDate: { lt: new Date() } } as never, orderBy: { dueDate: "asc" }, take: 100 }), []);
  const reminders = await safeFindMany(() => prisma.reminder.findMany({ where: { ownerId: u.id }, include: { invoice: { select: { invoiceNumber: true, totalTTC: true, currency: true } } }, orderBy: { scheduledAt: "desc" }, take: 100 }), []);
  const issued = await safeFindMany(() => prisma.invoice.findMany({ where: { ownerId: u.id, status: "ISSUED" }, select: { id: true, invoiceNumber: true, dueDate: true }, orderBy: { dueDate: "asc" }, take: 100 }), []);
  return (
    <div>
      <div className="mb-5"><h1 className="page-title">Relances</h1><p className="meta mt-1">Overdue invoices and scheduled reminders — channel, date and invoice are all your choices.</p></div>
      <div className="card mb-4 p-4"><h2 className="font-semibold mb-2">Schedule a reminder</h2><ReminderForm invoices={issued.map((i) => ({ ...i, dueDate: i.dueDate ? new Date(i.dueDate).toISOString() : null })) as never} onDone={() => {}} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Overdue ({overdue.length})</span></div>
          {overdue.length === 0 ? <p className="p-4 text-sm text-ink-500">No overdue invoices 🎉</p> : (
            <table className="tbl">
              <thead><tr><th>Number</th><th>Due</th><th className="num">Total</th></tr></thead>
              <tbody>
                {overdue.map((inv) => (
                  <tr key={inv.id}><td className="font-medium">{inv.invoiceNumber}</td><td className="text-ink-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td><td className="num tabular-nums">{formatMoney(inv.totalTTC, inv.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Scheduled reminders</span></div>
          {reminders.length === 0 ? <p className="p-4 text-sm text-ink-500">No reminders yet</p> : (
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>When</th><th>Channel</th><th>Status</th></tr></thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id}><td className="font-medium">{r.invoice.invoiceNumber}</td><td className="tabular-nums text-ink-500">{new Date(r.scheduledAt).toLocaleString()}</td><td className="text-ink-500">{r.channel}</td><td>{r.sentAt ? <span className="badge badge-emerald">Sent</span> : <span className="badge">Pending</span>}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
