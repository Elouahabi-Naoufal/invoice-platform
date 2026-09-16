import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import PasswordForm from "@/components/PasswordForm";

export default async function SettingsPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-5">Settings</h1>
      <div className="grid gap-3">
        <div className="card p-5">
          <h2 className="section-title mb-1">Security</h2>
          <p className="mb-3 text-[13px] text-ink-500 dark:text-stone-400">Change your password. Minimum 8 characters.</p>
          <PasswordForm />
        </div>
        <div className="card p-5">
          <h2 className="section-title mb-1">Automation</h2>
          <p className="text-[13px] text-ink-500 dark:text-stone-400">
            Recurring invoices and due reminders run automatically via a background worker. Set
            <code className="rounded bg-ink-100 dark:bg-white/10 px-1 text-[12px]"> CRON_SECRET</code> in the environment to enable it.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="section-title mb-1">Email delivery (SMTP)</h2>
          <p className="text-[13px] text-ink-500 dark:text-stone-400">
            Configure <code className="rounded bg-ink-100 dark:bg-white/10 px-1 text-[12px]">SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM</code> in
            <code className="rounded bg-ink-100 dark:bg-white/10 px-1 text-[12px]"> .env</code> and restart.
            Without SMTP, sending fails explicitly — an invoice is never marked sent on a provider failure.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="section-title mb-1">WhatsApp sending</h2>
          <p className="text-[13px] text-ink-500 dark:text-stone-400">
            Pair the server once with a QR code, then send issued invoices as PDF documents with your
            configurable message template.
          </p>
          <Link href="/settings/whatsapp" className="btn-outline btn-sm mt-3 inline-flex">Open WhatsApp settings</Link>
        </div>
        <div className="card p-5">
          <h2 className="section-title mb-1">Archiving</h2>
          <p className="text-[13px] text-ink-500 dark:text-stone-400">
            Invoices must be kept 10 years (art. 211 CGI). Issued and cancelled invoices are immutable and keep
            their numbers. Back up the SQLite file regularly — there is no cloud sync in v1.
          </p>
        </div>
        <div className="card p-5">
          <h2 className="section-title mb-1">Numbering</h2>
          <p className="text-[13px] text-ink-500 dark:text-stone-400">
            Numbers are allocated per company, per prefix, per year at finalization — never reused, never edited.
            Credit notes use their own series (default prefix <code className="rounded bg-ink-100 dark:bg-white/10 px-1 text-[12px]">AV</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
