import { requireAdmin } from "@/server/admin-session";
import { getTenant } from "@/server/admin-queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import TenantProvisionActions from "@/components/TenantProvisionActions";
import TenantSupportPanel from "@/components/TenantSupportPanel";
import TenantNotifyButtons from "@/components/TenantNotifyButtons";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  const tenant = await getTenant(id);
  if (!tenant) notFound();

  const badge = (s: string) => {
    const m: Record<string, string> = { ACTIVE: "badge badge-emerald", PROVISIONING: "badge badge-amber", FAILED: "badge badge-amber" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };
  const fmt = (d: Date | null) => (d ? d.toLocaleString() : "—");

  return (
    <div>
      <Link href="/admin/tenants" className="mb-4 inline-block text-[13px] text-brand-600 hover:underline">&larr; Tenants</Link>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="page-title">{tenant.companyName}</h1>
        {badge(tenant.status)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title mb-3">Details</h2>
          <dl className="grid gap-2 text-[13px]">
            <div className="flex justify-between"><dt className="text-ink-500">Owner</dt><dd>{tenant.ownerName}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Email</dt><dd>{tenant.email}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Phone</dt><dd>{tenant.phone || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Slug</dt><dd><code className="rounded bg-ink-100 px-1 dark:bg-white/10">{tenant.slug}</code></dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">URL</dt><dd>{tenant.deploymentUrl ? <a href={tenant.deploymentUrl} target="_blank" className="text-brand-600 hover:underline">{tenant.deploymentUrl}</a> : "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Dokploy app</dt><dd><code className="rounded bg-ink-100 px-1 text-[11px] dark:bg-white/10">{tenant.dokployApplicationId || "—"}</code></dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Approved</dt><dd className="tabular-nums">{fmt(tenant.approvedAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Activated</dt><dd className="tabular-nums">{fmt(tenant.activatedAt)}</dd></div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-3">Provisioning</h2>
          <TenantProvisionActions id={tenant.id} status={tenant.status} />
          <div className="mt-4 border-t border-ink-100 pt-3 dark:border-white/10">
            <h2 className="section-title mb-2">Notifications</h2>
            <TenantNotifyButtons id={tenant.id} />
          </div>
          <div className="mt-4 border-t border-ink-100 pt-3 dark:border-white/10">
            <h2 className="section-title mb-2">Support access</h2>
            <TenantSupportPanel id={tenant.id} supportKey={tenant.supportKey} />
          </div>
        </div>
      </div>

      <div className="mt-4 card overflow-hidden">
        <div className="border-b border-ink-200 px-4 py-2.5 dark:border-white/10"><span className="section-title">Provisioning jobs</span></div>
        {tenant.provisioningJobs.length === 0 ? <p className="p-4 text-sm text-ink-500">No jobs yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Status</th><th>Step</th><th>Retries</th><th>Error</th><th>Created</th></tr></thead>
            <tbody>{tenant.provisioningJobs.map((j) => (
              <tr key={j.id}><td>{j.status}</td><td>{j.currentStep}</td><td className="tabular-nums">{j.retryCount}</td><td className="text-red-600 text-[12px]">{j.errorMessage || "—"}</td><td className="tabular-nums text-ink-500">{fmt(j.createdAt)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="mt-4 card overflow-hidden">
        <div className="border-b border-ink-200 px-4 py-2.5 dark:border-white/10"><span className="section-title">Notifications</span></div>
        {tenant.notifications.length === 0 ? <p className="p-4 text-sm text-ink-500">No notifications yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Error</th></tr></thead>
            <tbody>{tenant.notifications.map((n) => (
              <tr key={n.id}><td>{n.channel}</td><td className="text-ink-500">{n.recipient}</td><td>{n.status}</td><td className="tabular-nums">{n.attempts}</td><td className="text-red-600 text-[12px]">{n.lastError || "—"}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>

      <div className="mt-4 card overflow-hidden">
        <div className="border-b border-ink-200 px-4 py-2.5 dark:border-white/10"><span className="section-title">Support access history</span></div>
        {tenant.supportAccesses.length === 0 ? <p className="p-4 text-sm text-ink-500">No support sessions yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Admin</th><th>Created</th><th>Expires</th><th>Used</th><th>Revoked</th></tr></thead>
            <tbody>{tenant.supportAccesses.map((s) => (
              <tr key={s.id}><td className="text-ink-500">{s.adminId}</td><td className="tabular-nums text-ink-500">{fmt(s.createdAt)}</td><td className="tabular-nums text-ink-500">{fmt(s.expiresAt)}</td><td>{fmt(s.usedAt)}</td><td>{fmt(s.revokedAt)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}