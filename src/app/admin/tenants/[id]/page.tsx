import { requireAdmin } from "@/server/admin-session";
import { getTenant } from "@/server/admin-queries";
import { notFound } from "next/navigation";
import { AdminPageHeader, AdminPanel, AdminEmpty, AdminBadge, CompanyMark } from "@/components/admin-ui";
import TenantProvisionActions from "@/components/TenantProvisionActions";
import TenantSupportPanel from "@/components/TenantSupportPanel";
import TenantNotifyButtons from "@/components/TenantNotifyButtons";
import { Rocket, Bell, KeyRound, ExternalLink, Mail, Phone, User, Gauge, CalendarClock, Send, ShieldCheck } from "lucide-react";
import type { AdmTone } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const tenant = await getTenant(id);
  if (!tenant) notFound();

  const tone: Record<string, AdmTone> = {
    ACTIVE: "success",
    PROVISIONING: "info",
    FAILED: "error",
    APPROVED: "brand",
    SUSPENDED: "neutral",
  };
  const jobTone = (s: string): AdmTone => (s === "COMPLETED" ? "success" : s === "FAILED" ? "error" : s === "RUNNING" ? "info" : "neutral");
  const notifTone = (s: string): AdmTone => (s === "SENT" ? "success" : s === "FAILED" ? "error" : "neutral");
  const fmt = (d: Date | null) => (d ? d.toLocaleString() : "—");

  const DetailRow = ({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="adm-dl-row">
      <dt className="flex items-center gap-2 text-[12px] text-ink-500 dark:text-gray-400"><span className="text-ink-400 dark:text-gray-500">{icon}</span>{label}</dt>
      <dd className={`${mono ? "font-mono text-[12px]" : ""} text-right text-[13px] font-medium text-ink-950 dark:text-gray-100`}>{value}</dd>
    </div>
  );

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Management"
        title={tenant.companyName}
        description={`Started as “${tenant.ownerName}” · approved ${tenant.approvedAt ? fmt(tenant.approvedAt) : "never"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={tone[tenant.status] ?? "neutral"} dot>{tenant.status}</AdminBadge>
            {tenant.deploymentUrl && (
              <a href={tenant.deploymentUrl} target="_blank" className="btn-outline btn-sm"><ExternalLink size={13} /> Open workspace</a>
            )}
          </div>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <AdminPanel
            title="Workspace details"
            subtitle="Owner and deployment information"
            icon={<User size={15} />}
            tone="brand"
          >
            <dl className="adm-dl">
              <DetailRow icon={<User size={13} />} label="Owner" value={<span className="flex items-center justify-end gap-2">{tenant.ownerName}<CompanyMark name={tenant.ownerName} size="h-6 w-6" /></span>} />
              <DetailRow icon={<Mail size={13} />} label="Email" value={tenant.email} />
              <DetailRow icon={<Phone size={13} />} label="Phone" value={tenant.phone || "—"} />
              <DetailRow icon={<Gauge size={13} />} label="Slug" value={<code className="rounded bg-ink-100 px-1.5 py-0.5 text-[12px] text-ink-700 dark:bg-white/10 dark:text-gray-300">{tenant.slug}</code>} />
              <DetailRow icon={<ShieldCheck size={13} />} label="Owner password" value={<code className="rounded bg-ink-100 px-1.5 py-0.5 text-[12px] text-ink-700 dark:bg-white/10 dark:text-gray-300">{tenant.ownerPassword || "—"}</code>} />
              <DetailRow icon={<Rocket size={13} />} label="Dokploy app" mono value={<code className="rounded bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-700 dark:bg-white/10 dark:text-gray-300">{tenant.dokployApplicationId || "—"}</code>} />
              <DetailRow icon={<CalendarClock size={13} />} label="Activated" value={fmt(tenant.activatedAt)} />
            </dl>
          </AdminPanel>

          <AdminPanel
            title="Provisioning jobs"
            subtitle="Deployment runs for this workspace"
            icon={<Rocket size={15} />}
            tone="info"
            padded={false}
          >
            {tenant.provisioningJobs.length === 0 ? (
              <AdminEmpty title="No jobs yet" body="Provision this tenant to see job progress here." icon={<Rocket size={20} />} />
            ) : (
              <table className="adm-tbl">
                <thead><tr><th>Status</th><th>Step</th><th>Retries</th><th>Error</th><th>Created</th></tr></thead>
                <tbody>{tenant.provisioningJobs.map((j) => (
                  <tr key={j.id}>
                    <td><AdminBadge tone={jobTone(j.status)} dot>{j.status}</AdminBadge></td>
                    <td className="text-ink-500">{j.currentStep}</td>
                    <td className="tabular-nums">{j.retryCount}</td>
                    <td className="max-w-[260px] truncate text-[12px] text-error-600" title={j.errorMessage ?? ""}>{j.errorMessage || "—"}</td>
                    <td className="tabular-nums whitespace-nowrap text-ink-500">{fmt(j.createdAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </AdminPanel>

          <AdminPanel
            title="Notifications"
            subtitle="Messages sent to this business"
            icon={<Bell size={15} />}
            tone="brand"
            padded={false}
          >
            {tenant.notifications.length === 0 ? (
              <AdminEmpty title="No notifications yet" body="Approval and welcome messages will appear here." icon={<Bell size={20} />} />
            ) : (
              <table className="adm-tbl">
                <thead><tr><th>Type</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Error</th></tr></thead>
                <tbody>{tenant.notifications.map((n) => (
                  <tr key={n.id}>
                    <td className="text-ink-500">{n.type}</td>
                    <td className="text-ink-500">{n.channel}</td>
                    <td className="text-ink-500">{n.recipient}</td>
                    <td><AdminBadge tone={notifTone(n.status)} dot>{n.status}</AdminBadge></td>
                    <td className="tabular-nums">{n.attempts}</td>
                    <td className="max-w-[220px] truncate text-[12px] text-error-600" title={n.lastError ?? ""}>{n.lastError || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </AdminPanel>

          <AdminPanel
            title="Support access history"
            subtitle="Read-only sessions granted"
            icon={<KeyRound size={15} />}
            tone="neutral"
            padded={false}
          >
            {tenant.supportAccesses.length === 0 ? (
              <AdminEmpty title="No support sessions" body="Support sessions you grant will be listed here." icon={<KeyRound size={20} />} />
            ) : (
              <table className="adm-tbl">
                <thead><tr><th>Admin</th><th>Created</th><th>Expires</th><th>Used</th><th>Revoked</th></tr></thead>
                <tbody>{tenant.supportAccesses.map((s) => (
                  <tr key={s.id}>
                    <td className="text-ink-500">{s.adminId}</td>
                    <td className="tabular-nums whitespace-nowrap text-ink-500">{fmt(s.createdAt)}</td>
                    <td className="tabular-nums whitespace-nowrap text-ink-500">{fmt(s.expiresAt)}</td>
                    <td className="text-ink-500">{fmt(s.usedAt)}</td>
                    <td className="text-ink-500">{fmt(s.revokedAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </AdminPanel>
        </div>

        <div className="grid gap-6">
          <AdminPanel title="Actions" subtitle="Provision, suspend or remove" icon={<Rocket size={15} />} tone="brand">
            <div className="flex flex-col gap-3">
              <TenantProvisionActions id={tenant.id} status={tenant.status} />
            </div>
          </AdminPanel>
          <AdminPanel title="Send messages" subtitle="Re-send approval or welcome" icon={<Send size={15} />} tone="success">
            <div className="flex flex-col gap-3">
              <TenantNotifyButtons id={tenant.id} />
            </div>
          </AdminPanel>
          <AdminPanel title="Support access" subtitle="Grant read-only access" icon={<KeyRound size={15} />} tone="neutral">
            <TenantSupportPanel id={tenant.id} supportKey={tenant.supportKey} />
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}