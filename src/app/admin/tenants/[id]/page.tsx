import { requireAdmin } from "@/server/admin-session";
import { getTenant } from "@/server/admin-queries";
import { notFound } from "next/navigation";
import { PageHeader, SectionCard, EmptyState } from "@/components/ui";
import TenantProvisionActions from "@/components/TenantProvisionActions";
import TenantSupportPanel from "@/components/TenantSupportPanel";
import TenantNotifyButtons from "@/components/TenantNotifyButtons";
import { Rocket, Bell, KeyRound, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const tenant = await getTenant(id);
  if (!tenant) notFound();

  const badge = (s: string) => {
    const m: Record<string, string> = { ACTIVE: "badge badge-emerald", PROVISIONING: "badge badge-amber", FAILED: "badge badge-amber", APPROVED: "badge badge-info", SUSPENDED: "badge" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };
  const fmt = (d: Date | null) => (d ? d.toLocaleString() : "—");

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <dt className="text-[12px] text-ink-500">{label}</dt>
      <dd className="text-[13px] font-medium text-right">{value}</dd>
    </div>
  );

  return (
    <div className="grid gap-5">
      <PageHeader
        title={tenant.companyName}
        breadcrumbs={[{ label: "Tenants", href: "/admin/tenants" }, { label: tenant.companyName }]}
        actions={
          <div className="flex items-center gap-2">
            {badge(tenant.status)}
            {tenant.deploymentUrl && (
              <a href={tenant.deploymentUrl} target="_blank" className="btn-outline btn-sm"><ExternalLink size={13} /> Open</a>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title mb-2">Details</h2>
          <dl className="divide-y divide-ink-100 dark:divide-white/5">
            {row("Owner", tenant.ownerName)}
            {row("Email", tenant.email)}
            {row("Phone", tenant.phone || "—")}
            {row("Slug", <code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{tenant.slug}</code>)}
            {row("Owner password", tenant.ownerPassword ? <code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{tenant.ownerPassword}</code> : "—")}
            {row("Dokploy app", <code className="rounded bg-ink-100 px-1 text-[11px] dark:bg-white/10">{tenant.dokployApplicationId || "—"}</code>)}
            {row("Approved", fmt(tenant.approvedAt))}
            {row("Activated", fmt(tenant.activatedAt))}
          </dl>
        </div>

        <div className="grid gap-4">
          <SectionCard title="Provisioning">
            <div className="p-4"><TenantProvisionActions id={tenant.id} status={tenant.status} /></div>
          </SectionCard>
          <SectionCard title="Notifications">
            <div className="p-4"><TenantNotifyButtons id={tenant.id} /></div>
          </SectionCard>
          <SectionCard title="Support access">
            <div className="p-4"><TenantSupportPanel id={tenant.id} supportKey={tenant.supportKey} /></div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Provisioning jobs">
        {tenant.provisioningJobs.length === 0 ? (
          <EmptyState bare icon={<Rocket size={20} />} title="No jobs yet" body="Provision this tenant to see job progress here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Status</th><th>Step</th><th>Retries</th><th>Error</th><th>Created</th></tr></thead>
              <tbody>{tenant.provisioningJobs.map((j) => (
                <tr key={j.id}>
                  <td>{badge(j.status)}</td>
                  <td className="text-ink-500">{j.currentStep}</td>
                  <td className="tabular-nums">{j.retryCount}</td>
                  <td className="max-w-[260px] truncate text-[12px] text-error-600" title={j.errorMessage ?? ""}>{j.errorMessage || "—"}</td>
                  <td className="tabular-nums text-ink-500">{fmt(j.createdAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Notifications">
        {tenant.notifications.length === 0 ? (
          <EmptyState bare icon={<Bell size={20} />} title="No notifications yet" body="Approval and welcome messages will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Type</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Error</th></tr></thead>
              <tbody>{tenant.notifications.map((n) => (
                <tr key={n.id}>
                  <td className="text-ink-500">{n.type}</td>
                  <td>{n.channel}</td>
                  <td className="text-ink-500">{n.recipient}</td>
                  <td>{n.status === "SENT" ? <span className="badge badge-emerald">Sent</span> : n.status === "FAILED" ? <span className="badge badge-amber">Failed</span> : <span className="badge">Pending</span>}</td>
                  <td className="tabular-nums">{n.attempts}</td>
                  <td className="max-w-[220px] truncate text-[12px] text-error-600" title={n.lastError ?? ""}>{n.lastError || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Support access history">
        {tenant.supportAccesses.length === 0 ? (
          <EmptyState bare icon={<KeyRound size={20} />} title="No support sessions" body="Support sessions you grant will be listed here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Admin</th><th>Created</th><th>Expires</th><th>Used</th><th>Revoked</th></tr></thead>
              <tbody>{tenant.supportAccesses.map((s) => (
                <tr key={s.id}>
                  <td className="text-ink-500">{s.adminId}</td>
                  <td className="tabular-nums text-ink-500">{fmt(s.createdAt)}</td>
                  <td className="tabular-nums text-ink-500">{fmt(s.expiresAt)}</td>
                  <td className="text-ink-500">{fmt(s.usedAt)}</td>
                  <td className="text-ink-500">{fmt(s.revokedAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}