import Link from "next/link";
import { listTenants, getTenantStats } from "@/server/hub-admin";
import { requireAdmin } from "@/server/hub-auth";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const tenants = await listTenants();
  const stats = await getTenantStats();

  const fmt = (d: Date) => d.toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { PENDING: "badge badge-amber", APPROVED: "badge badge-emerald", REJECTED: "badge badge-amber" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div>
      <h1 className="page-title mb-5">Dashboard</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="meta">Total registrations</p></div>
        <div className="card p-4 border-amber-300 dark:border-amber-700"><p className="text-2xl font-bold text-amber-600">{stats.pending}</p><p className="meta">Pending approval</p></div>
        <div className="card p-4 border-emerald-300 dark:border-emerald-700"><p className="text-2xl font-bold text-emerald-600">{stats.approved}</p><p className="meta">Active</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-4 py-2.5 dark:border-white/10"><span className="section-title">Tenants ({tenants.length})</span></div>
        {tenants.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No registrations yet.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Company</th><th>Email</th><th>Subdomain</th><th>Status</th><th>Registered</th><th></th></tr></thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.companyName}</td>
                  <td className="text-ink-500">{t.email}</td>
                  <td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{t.subdomain}.invora.app</code></td>
                  <td>{statusBadge(t.status)}</td>
                  <td className="tabular-nums text-ink-500">{fmt(t.createdAt)}</td>
                  <td className="text-right"><Link href={`/admin/tenants/${t.id}`} className="btn-ghost btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}