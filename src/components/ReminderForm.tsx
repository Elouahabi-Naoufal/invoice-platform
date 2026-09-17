"use client";
import { useRouter } from "next/navigation";
import { createReminder } from "@/server/reminders";
import { useToast } from "@/components/ui";
import { useState } from "react";

export function ReminderForm({ invoices, onDone }: { invoices: { id: string; invoiceNumber: string | null; dueDate: string | null }[]; onDone?: () => void }) {
  const r = useRouter(); const toast = useToast(); const [err, setErr] = useState("");
  async function submit(fd: FormData) {
    const obj: Record<string, string> = {}; fd.forEach((v, k) => { obj[k] = String(v); });
    setErr("");
    try {
      const res = await createReminder("", { invoiceId: obj.invoiceId, type: obj.type || "OVERDUE", channel: "WHATSAPP", scheduledAt: new Date(obj.scheduledAt).toISOString() } as never) as { sentNow?: boolean };
      toast({ kind: "ok", title: res?.sentNow ? "Reminder sent" : "Reminder scheduled" });
      onDone?.(); r.refresh();
    } catch (e) { const m = e instanceof Error ? e.message : "Failed"; setErr(m); toast({ kind: "err", title: "Reminder failed", body: m }); }
  }
  // Default to "now" (local time) so scheduling an overdue reminder sends immediately.
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return (
    <form action={submit as never} className="flex flex-wrap gap-2 items-end">
      <div><label className="label">Invoice *</label>
        <select name="invoiceId" required className="input">
          <option value="">— choose —</option>
          {invoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoiceNumber ?? inv.id.slice(0, 8)} {inv.dueDate ? `· due ${inv.dueDate.slice(0, 10)}` : ""}</option>)}
        </select>
      </div>
      <div><label className="label">Type</label><select name="type" className="input" defaultValue="OVERDUE"><option value="OVERDUE">Overdue</option><option value="BEFORE_DUE">Before due</option></select></div>
      <div><label className="label">Channel</label><input value="WhatsApp" readOnly className="input bg-ink-50 dark:bg-white/5" /></div>
      <div><label className="label">Scheduled at *</label><input name="scheduledAt" type="datetime-local" required defaultValue={nowLocal} className="input" /></div>
      <button type="submit" className="btn-primary btn-sm">Schedule</button>
      {err && <p className="field-err w-full">{err}</p>}
    </form>
  );
}
