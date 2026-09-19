import { getWhatsAppStatus } from "@/server/whatsapp";
import { emailConfigured } from "@/server/email";
import { dokployConfigured } from "@/server/dokploy";
import { AdminPanel, AdminBadge, AdminTile, type AdmTone } from "@/components/admin-ui";
import { MessageCircle, Rocket, Mail, KeyRound, Activity } from "lucide-react";

function StatusItem({ ok, label, detail, icon, tone }: { ok: boolean; label: string; detail?: string; icon: React.ReactNode; tone: AdmTone }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-200/80 px-4 py-3 dark:border-white/10">
      <AdminTile size="sm" tone={ok ? "success" : "neutral"}>{icon}</AdminTile>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-ink-950 dark:text-white">{label}</div>
        <div className="truncate text-[12px] text-ink-500 dark:text-gray-400">{detail ?? (ok ? "All systems operational" : "Action required")}</div>
      </div>
      <AdminBadge tone={ok ? tone : "neutral"} dot>{ok ? "Ready" : "Attention"}</AdminBadge>
    </div>
  );
}

export default async function AdminSystemStatus() {
  const wa = await getWhatsAppStatus().catch(() => null);
  const dokploy = dokployConfigured();
  const email = emailConfigured();
  const support = !!process.env.SUPPORT_KEY;

  return (
    <AdminPanel
      title="System status"
      subtitle="Live health of the platform services"
      icon={<Activity size={15} />}
      tone="brand"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <StatusItem
          ok={!!wa?.connected}
          tone="success"
          label="WhatsApp"
          icon={<MessageCircle size={15} />}
          detail={wa?.connected ? `Connected · ${wa.account}` : `Not connected · ${wa?.phase ?? "unavailable"}`}
        />
        <StatusItem
          ok={dokploy}
          tone="info"
          label="Dokploy provisioning"
          icon={<Rocket size={15} />}
          detail={dokploy ? "Deployment API reachable" : "Missing DOKPLOY_URL / TOKEN"}
        />
        <StatusItem
          ok={email}
          tone="info"
          label="Email (SMTP)"
          icon={<Mail size={15} />}
          detail={email ? "Outbound email enabled" : "Read-only · configure SMTP env"}
        />
        <StatusItem
          ok={support}
          tone="neutral"
          label="Support access"
          icon={<KeyRound size={15} />}
          detail={support ? "Support tokens enabled" : "This instance is the hub"}
        />
      </div>
    </AdminPanel>
  );
}