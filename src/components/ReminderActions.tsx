"use client";
import { useRouter } from "next/navigation";
import { sendReminderNow, deleteReminder } from "@/server/reminders";
import { useToast } from "@/components/ui";

export function ReminderActions({ id, sent }: { id: string; sent: boolean }) {
  const r = useRouter();
  const toast = useToast();
  return (
    <span className="flex justify-end gap-1">
      <button
        onClick={async () => {
          try {
            await sendReminderNow(id);
            toast({ kind: "ok", title: sent ? "Reminder resent" : "Reminder sent" });
            r.refresh();
          } catch (e) {
            toast({ kind: "err", title: "Send failed", body: e instanceof Error ? e.message : undefined });
          }
        }}
        className="btn-primary btn-sm"
      >
        {sent ? "Resend" : "Send now"}
      </button>
      <button
        onClick={async () => {
          try {
            await deleteReminder(id);
            toast({ kind: "ok", title: "Reminder deleted" });
            r.refresh();
          } catch {
            toast({ kind: "err", title: "Delete failed" });
          }
        }}
        className="btn-ghost btn-sm hover:text-red-700"
        aria-label="Delete reminder"
      >
        ×
      </button>
    </span>
  );
}
