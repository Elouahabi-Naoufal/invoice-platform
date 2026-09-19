import { requireAdmin } from "@/server/admin-session";
import { getPlatformStats, listRegistrations, listTenants, listProvisioningJobs, listNotifications, listAuditLogs } from "@/server/admin-queries";
import { AdminPageHeader, AdminStatCard, AdminPanel, AdminEmpty, AdminBadge, CompanyMark, AdminTile } from "@/components/admin-ui";
import AdminSystemStatus from "@/components/AdminSystemStatus";
import Link from "next/link";
import { UserPlus, CheckCircle2, Rocket, AlertTriangle, Inbox, Building2, Activity, MessageCircle, ScrollText } from "lucide-react";

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

  const pendingRegs = registrations.filter((r) => r.status === "PENDING").slice(0, 6);
  const recentTenants = tenants.slice(0, 6);
  const recentJobs = jobs.slice(0, 6);
  const failedNotifs = notifications.filter((n) => n.status === "FAILED").slice(0, 6);
  const recentAudit = audit.slice(0, 7);

  const tenantTone = (s: string) =>
    s === "ACTIVE" ? "success" as const : s === "SUSPENDED" ? "neutral" as const : s === "FAILED" ? "error" as const : "warning" as const;
  const jobTone = (s: string) => (s === "COMPLETED" ? "success" as const : s === "FAILED" ? "error" as const : s === "RUNNING" ? "info" as const : "neutral" as const);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Registrations, tenants and message delivery across the platform at a glance."
        actions={
          <Link href="/admin/registrations" className="btn-accent btn-sm">
            <UserPlus size={14} /> Review registrations
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard tone="brand" label="Pending registrations" value={String(stats.pending)} sub={`${stats.pending} awaiting review`} icon={<UserPlus size={20} />} href="/admin/registrations" />
        <AdminStatCard tone="success" label="Active tenants" value={String(stats.active)} sub="Live workspaces" icon={<CheckCircle2 size={20} />} href="/admin/tenants" />
        <AdminStatCard tone="info" label="Provisioning" value={String(stats.provisioning)} sub="In progress" icon={<Rocket size={20} />} href="/admin/provisioning" />
        <AdminStatCard tone="error" label="Failed" value={String(stats.failed)} sub="Need attention" icon={<AlertTriangle size={20} />} href="/admin/tenants" />
      </div>

      <AdminSystemStatus />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel
          title="Pending registrations"
          subtitle="Businesses waiting for approval"
          icon={<UserPlus size={15} />}
          tone="warning"
          action={<Link href="/admin/registrations" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">View all</Link>}
          padded={false}
        >
          {pendingRegs.length === 0 ? (
            <AdminEmpty title="Nothing pending" body="New business registrations will appear here for review." icon={<Inbox size={20} />} />
          ) : (
            <table className="adm-tbl">
              <thead><tr><th>Company</th><th>Owner</th><th>Slug</th><th>Date</th></tr></thead>
              <tbody>{pendingRegs.map((r) => (
                <tr key={r.id}>
                  <td><span className="flex items-center gap-2.5 font-medium">{<CompanyMark name={r.companyName} size="h-7 w-7" />}{r.companyName}</span></td>
                  <td className="text-ink-500">{r.name}</td>
                  <td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-[12px] text-ink-700 dark:bg-white/10 dark:text-gray-300">{r.requestedSlug}</code></td>
                  <td className="tabular-nums whitespace-nowrap text-ink-500">{r.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </AdminPanel>

        <AdminPanel
          title="Recent tenants"
          subtitle="Newest provisioned workspaces"
          icon={<Building2 size={15} />}
          tone="success"
          action={<Link href="/admin/tenants" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">View all</Link>}
          padded={false}
        >
          {recentTenants.length === 0 ? (
            <AdminEmpty title="No tenants yet" body="Approve a registration to create your first tenant." icon={<Building2 size={20} />} />
          ) : (
            <table className="adm-tbl">
              <thead><tr><th>Company</th><th>Slug</th><th>Status</th><th className="text-right">Manage</th></tr></thead>
              <tbody>{recentTenants.map((t) => (
                <tr key={t.id}>
                  <td><span className="flex items-center gap-2.5 font-medium">{<CompanyMark name={t.companyName} size="h-7 w-7" />}{t.companyName}</span></td>
                  <td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-[12px] text-ink-700 dark:bg-white/10 dark:text-gray-300">{t.slug}</code></td>
                  <td><AdminBadge tone={tenantTone(t.status)} dot>{t.status}</AdminBadge></td>
                  <td className="text-right"><Link href={`/admin/tenants/${t.id}`} className="btn-ghost btn-sm">Manage</Link></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </AdminPanel>

        <AdminPanel
          title="Provisioning activity"
          subtitle="Recent deployment jobs"
          icon={<Rocket size={15} />}
          tone="info"
          action={<Link href="/admin/provisioning" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">All jobs</Link>}
          padded={false}
        >
          {recentJobs.length === 0 ? (
            <AdminEmpty title="No jobs yet" body="Provisioning activity will show here once you deploy a tenant." icon={<Rocket size={20} />} />
          ) : (
            <table className="adm-tbl">
              <thead><tr><th>Tenant</th><th>Step</th><th>Status</th></tr></thead>
              <tbody>{recentJobs.map((j) => (
                <tr key={j.id}>
                  <td className="font-medium">{j.tenant.companyName}</td>
                  <td className="text-ink-500">{j.currentStep}</td>
                  <td><AdminBadge tone={jobTone(j.status)} dot>{j.status}</AdminBadge></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </AdminPanel>

        <AdminPanel
          title="Needs attention"
          subtitle="Failed message deliveries"
          icon={<AlertTriangle size={15} />}
          tone="error"
          action={<Link href="/admin/notifications" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">Notifications</Link>}
          padded={false}
        >
          {failedNotifs.length === 0 ? (
            <AdminEmpty title="All clear" body="No failed deliveries. Notifications are flowing." icon={<CheckCircle2 size={20} />} />
          ) : (
            <table className="adm-tbl">
              <thead><tr><th>Target</th><th>Channel</th><th>Error</th></tr></thead>
              <tbody>{failedNotifs.map((n) => (
                <tr key={n.id}>
                  <td className="font-medium">{n.tenant?.companyName ?? n.registration?.companyName ?? n.recipient}</td>
                  <td className="text-ink-500">{n.channel}</td>
                  <td className="max-w-[240px] truncate text-[12px] text-error-600" title={n.lastError ?? ""}>{n.lastError}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </AdminPanel>
      </div>

      <AdminPanel
        title="Recent activity"
        subtitle="Audited administrative actions"
        icon={<Activity size={15} />}
        tone="neutral"
        action={<Link href="/admin/audit" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">Full audit log</Link>}
        padded={false}
      >
        {recentAudit.length === 0 ? (
          <AdminEmpty title="No activity yet" body="Admin actions are recorded here." icon={<ScrollText size={20} />} />
        ) : (
          <table className="adm-tbl">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th></th></tr></thead>
            <tbody>{recentAudit.map((l) => (
              <tr key={l.id}>
                <td className="tabular-nums whitespace-nowrap text-ink-500">{l.createdAt.toLocaleString()}</td>
                <td className="text-ink-500">{l.admin?.email ?? "system"}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700 dark:bg-white/10 dark:text-gray-300">
                    <MessageCircle size={11} className="text-ink-400" />{l.action}
                  </span>
                </td>
                <td className="text-right"><AdminTile size="sm" tone="neutral"><Activity size={13} /></AdminTile></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </AdminPanel>
    </div>
  );
}