import { requireAdmin } from "@/server/admin-auth";
import { getPlatformStats, listRegistrations, listTenants, listProvisioningJobs, listNotifications, listAuditLogs } from "@/server/admin-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const [stats, registrations, tenants, jobs, notifications, audit] = await Promise.all([
    getPlatformStats(),
    listRegistrations(),
    listTenants(),
    listProvisioningJobs(),
    listNotifications(),
    listAuditLogs(),
  ]);

  const pendingRegs = registrations.filter((r) => r.status === "PENDING").slice(0, 5);
  const activeTenants = tenants.slice(0, 5);
  const recentJobs = jobs.slice(0, 5);
  const failedNotifs = notifications.filter((n) => n.status === "FAILED").slice(0, 5);
  const recentAudit = audit.slice(0, 6);
  const fmt = (d: Date) => d.toLocaleString();

  const stat = (label: string, value: number, tone = "", href?: string) => {
    const inner = (
      <div className="card p-4 transition-colors hover:border-ink-400 dark:hover:border-white/20">
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
        <p className="meta">{label}</p>
      </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { ACTIVE: "badge badge-emerald", PROVISIONING: "badge badge-amber", FAILED: "badge badge-amber", PENDING: "badge badge-amber" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div className="grid gap-6">
      <h1 className="page-title">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stat("Pending registrations", stats.pending, stats.pending > 0 ? "text-amber-600" : "", "/admin/registrations")}
        {stat("Active tenants", stats.active, "text-emerald-600", "/admin/tenants")}
        {stat("Provisioning", stats.provisioning, "", "/admin/provisioning")}
        {stat("Failed", stats.failed, stats.failed > 0 ? "text-red-600" : "", "/admin/tenants")}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-white/10">
            <span className="section-title">Pending registrations</span>
            <Link href="/admin/registrations" className="text-[12px] text-brand-600 hover:underline">All registrations</Link>
          </div>
          {pendingRegs.length === 0 ? <p className="p-4 text-sm text-ink-500">Nothing pending.</p> : (
            <table className="tbl">
              <thead><tr><th>Company</th><th>Owner</th><th>Slug</th><th>Date</th></tr></thead>
              <tbody>{pendingRegs.map((r) => (
                <tr key={r.id}><td className="font-medium">{r.companyName}</td><td className="text-ink-500">{r.name}</td><td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{r.requestedSlug}</code></td><td className="tabular-nums text-ink-500">{r.createdAt.toLocaleDateString()}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-white/10">
            <span className="section-title">Recent tenants</span>
            <Link href="/admin/tenants" className="text-[12px] text-brand-600 hover:underline">All tenants</Link>
          </div>
          {activeTenants.length === 0 ? <p className="p-4 text-sm text-ink-500">No tenants yet.</p> : (
            <table className="tbl">
              <thead><tr><th>Company</th><th>Slug</th><th>Status</th><th></th></tr></thead>
              <tbody>{activeTenants.map((t) => (
                <tr key={t.id}><td className="font-medium">{t.companyName}</td><td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{t.slug}</code></td><td>{statusBadge(t.status)}</td><td className="text-right"><Link href={`/admin/tenants/${t.id}`} className="btn-ghost btn-sm">Manage</Link></td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-white/10">
            <span className="section-title">Provisioning activity</span>
            <Link href="/admin/provisioning" className="text-[12px] text-brand-600 hover:underline">All jobs</Link>
          </div>
          {recentJobs.length === 0 ? <p className="p-4 text-sm text-ink-500">No jobs yet.</p> : (
            <table className="tbl">
              <thead><tr><th>Tenant</th><th>Step</th><th>Status</th></tr></thead>
              <tbody>{recentJobs.map((j) => (
                <tr key={j.id}><td className="font-medium">{j.tenant.companyName}</td><td className="text-ink-500">{j.currentStep}</td><td>{j.status}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-white/10">
            <span className="section-title">Notifications needing attention</span>
            <Link href="/admin/notifications" className="text-[12px] text-brand-600 hover:underline">All notifications</Link>
          </div>
          {failedNotifs.length === 0 ? <p className="p-4 text-sm text-ink-500">All notifications delivered.</p> : (
            <table className="tbl">
              <thead><tr><th>Tenant</th><th>Channel</th><th>Error</th></tr></thead>
              <tbody>{failedNotifs.map((n) => (
                <tr key={n.id}><td className="font-medium">{n.tenant.companyName}</td><td>{n.channel}</td><td className="text-red-600 text-[12px]">{n.lastError}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-white/10">
          <span className="section-title">Recent activity</span>
          <Link href="/admin/audit" className="text-[12px] text-brand-600 hover:underline">Full audit log</Link>
        </div>
        {recentAudit.length === 0 ? <p className="p-4 text-sm text-ink-500">No activity yet.</p> : (
          <table className="tbl">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th></tr></thead>
            <tbody>{recentAudit.map((l) => (
              <tr key={l.id}><td className="tabular-nums text-ink-500">{fmt(l.createdAt)}</td><td className="text-ink-500">{l.admin.email}</td><td className="font-medium">{l.action}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}