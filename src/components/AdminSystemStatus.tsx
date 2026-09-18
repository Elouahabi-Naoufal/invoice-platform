import { getWhatsAppStatus } from "@/server/whatsapp";
import { emailConfigured } from "@/server/email";
import { dokployConfigured } from "@/server/dokploy";

function Pill({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded border border-ink-200 px-3 py-2 dark:border-white/10">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
        <span className="text-[13px] font-medium">{label}</span>
      </div>
      <span className="text-[12px] text-ink-500">{detail ?? (ok ? "Ready" : "Not configured")}</span>
    </div>
  );
}

export default async function AdminSystemStatus() {
  const wa = await getWhatsAppStatus().catch(() => null);
  const dokploy = dokployConfigured();
  const email = emailConfigured();
  const support = !!process.env.SUPPORT_KEY;

  return (
    <div className="card p-5">
      <h2 className="section-title mb-3">System status</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <Pill ok={!!wa?.connected} label="WhatsApp" detail={wa?.connected ? (wa.account ? `Connected · ${wa.account}` : "Connected") : (wa?.phase ?? "Unavailable")} />
        <Pill ok={dokploy} label="Dokploy provisioning" />
        <Pill ok={email} label="Email (SMTP)" />
        <Pill ok={support} label="Support access" detail={support ? "Enabled" : "This instance is the hub"} />
      </div>
    </div>
  );
}