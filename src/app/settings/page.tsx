import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getWhatsAppStatus } from "@/server/whatsapp";
import ProfileForm from "@/components/ProfileForm";
import { MessageCircle, Lock, Workflow, Database, CheckCircle2, XCircle } from "lucide-react";

function StatusLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      {ok ? <CheckCircle2 size={14} className="text-success-600" /> : <XCircle size={14} className="text-ink-400" />}
      <span className={ok ? "text-ink-700 dark:text-gray-200" : "text-ink-500 dark:text-gray-400"}>{label}</span>
    </span>
  );
}

export default async function SettingsGeneralPage() {
  const user = await requireUser();
  const whatsapp = await getWhatsAppStatus().catch(() => null);

  const sections = [
    { href: "/settings/whatsapp", icon: MessageCircle, title: "WhatsApp", body: whatsapp?.connected ? "Connected — sending via WhatsApp Web." : "Pair a phone with a QR code." },
    { href: "/settings/security", icon: Lock, title: "Security", body: "Change your password." },
    { href: "/settings/automation", icon: Workflow, title: "Automation", body: "Recurring invoices and reminders." },
    { href: "/settings/data", icon: Database, title: "Data & backup", body: "Exports, archiving and numbering." },
  ];

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <h2 className="section-title mb-3">Account</h2>
        <ProfileForm initialName={user.displayName} />
        <p className="meta mt-3">Signed in as <strong className="text-ink-700 dark:text-gray-200">{user.email}</strong></p>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-3">Sending channel</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <StatusLine ok={Boolean(whatsapp?.connected)} label={whatsapp?.connected ? "WhatsApp connected" : "WhatsApp not connected"} />
        </div>
        <p className="meta mt-2">Invoices, quotes and reminders are sent over WhatsApp.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="card flex items-start gap-3 p-4 transition-colors hover:border-ink-400 dark:hover:border-white/20">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-ink-100 text-ink-700 dark:bg-white/10 dark:text-gray-200">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink-950 dark:text-white">{s.title}</span>
                <span className="meta block">{s.body}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
