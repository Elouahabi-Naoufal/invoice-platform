import { requireAdmin } from "@/server/admin-session";
import { getPlatformStats, listRegistrations, listTenants, listProvisioningJobs, listNotifications, listAuditLogs } from "@/server/admin-queries";
import { PageHeader, StatCard, SectionCard, EmptyState, Avatar } from "@/components/ui";
import AdminSystemStatus from "@/components/AdminSystemStatus";
import Link from "next/link";
import { UserPlus, CheckCircle2, Rocket, AlertTriangle, Inbox, Activity, Building2 } from "lucide-react";

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
  const recentTenants = tenants.slice(0, 5);
  const recentJobs = jobs.slice(0, 5);
  const failedNotifs = notifications.filter((n) => n.status === "FAILED").slice(0, 5);
  const recentAudit = audit.slice(0, 6);

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { ACTIVE: "badge badge-emerald", PROVISIONING: "badge badge-amber", FAILED: "badge badge-amber", PENDING: "badge badge-amber" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of registrations, tenants and delivery across the platform."
        actions={
          <Link href="/admin/registrations" className="btn-outline btn-sm">
            <UserPlus size={14} /> Registrations
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending registrations" value={String(stats.pending)} tone="warning" icon={<UserPlus size={20} />} href="/admin/registrations" />
        <StatCard label="Active tenants" value={String(stats.active)} tone="success" icon={<CheckCircle2 size={20} />} href="/admin/tenants" />
        <StatCard label="Provisioning" value={String(stats.provisioning)} tone="brand" icon={<Rocket size={20} />} href="/admin/provisioning" />
        <StatCard label="Failed" value={String(stats.failed)} tone="error" icon={<AlertTriangle size={20} />} href="/admin/tenants" />
      </div>

      <AdminSystemStatus />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Pending registrations"
          action={<Link href="/admin/registrations" className="text-[12px] font-medium text-brand-600 hover:underline">View all</Link>}
        >
          {pendingRegs.length === 0 ? (
            <EmptyState bare icon={<Inbox size={20} />} title="Nothing pending" body="New business registrations will appear here for review." />
          ) : (
            <table className="tbl">
              <thead><tr><th>Company</th><th>Owner</th><th>Slug</th><th>Date</th></tr></thead>
              <tbody>{pendingRegs.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.companyName}</td>
                  <td><span className="flex items-center gap-2"><Avatar name={r.name} size="h-6 w-6" />{r.name}</span></td>
                  <td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{r.requestedSlug}</code></td>
                  <td className="tabular-nums text-ink-500">{r.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          title="Recent tenants"
          action={<Link href="/admin/tenants" className="text-[12px] font-medium text-brand-600 hover:underline">View all</Link>}
        >
          {recentTenants.length === 0 ? (
            <EmptyState bare icon={<Building2 size={20} />} title="No tenants yet" body="Approve a registration to create your first tenant." />
          ) : (
            <table className="tbl">
              <thead><tr><th>Company</th><th>Slug</th><th>Status</th><th></th></tr></thead>
              <tbody>{recentTenants.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.companyName}</td>
                  <td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{t.slug}</code></td>
                  <td>{statusBadge(t.status)}</td>
                  <td className="text-right"><Link href={`/admin/tenants/${t.id}`} className="btn-ghost btn-sm">Manage</Link></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          title="Provisioning activity"
          action={<Link href="/admin/provisioning" className="text-[12px] font-medium text-brand-600 hover:underline">All jobs</Link>}
        >
          {recentJobs.length === 0 ? (
            <EmptyState bare icon={<Rocket size={20} />} title="No jobs yet" body="Provisioning activity will show here once you deploy a tenant." />
          ) : (
            <table className="tbl">
              <thead><tr><th>Tenant</th><th>Step</th><th>Status</th></tr></thead>
              <tbody>{recentJobs.map((j) => (
                <tr key={j.id}><td className="font-medium">{j.tenant.companyName}</td><td className="text-ink-500">{j.currentStep}</td><td>{statusBadge(j.status)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </SectionCard>

        <SectionCard
          title="Needs attention"
          action={<Link href="/admin/notifications" className="text-[12px] font-medium text-brand-600 hover:underline">Notifications</Link>}
        >
          {failedNotifs.length === 0 ? (
            <EmptyState bare icon={<CheckCircle2 size={20} />} title="All clear" body="No failed deliveries. Notifications are flowing." />
          ) : (
            <table className="tbl">
              <thead><tr><th>Target</th><th>Channel</th><th>Error</th></tr></thead>
              <tbody>{failedNotifs.map((n) => (
                <tr key={n.id}>
                  <td className="font-medium">{n.tenant?.companyName ?? n.registration?.companyName ?? n.recipient}</td>
                  <td>{n.channel}</td>
                  <td className="max-w-[240px] truncate text-[12px] text-error-600" title={n.lastError ?? ""}>{n.lastError}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Recent activity"
        action={<Link href="/admin/audit" className="text-[12px] font-medium text-brand-600 hover:underline">Full audit log</Link>}
      >
        {recentAudit.length === 0 ? (
          <EmptyState bare icon={<Activity size={20} />} title="No activity yet" body="Admin actions are recorded here." />
        ) : (
          <table className="tbl">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th></tr></thead>
            <tbody>{recentAudit.map((l) => (
              <tr key={l.id}>
                <td className="tabular-nums text-ink-500">{l.createdAt.toLocaleString()}</td>
                <td className="text-ink-500">{l.admin?.email ?? "system"}</td>
                <td><span className="badge">{l.action}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}