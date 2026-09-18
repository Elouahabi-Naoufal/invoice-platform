import { requireAdmin } from "@/server/admin-auth";
import { getStats, listRegistrations } from "@/server/admin-actions";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const stats = await getStats();
  const recent = (await listRegistrations()).slice(0, 5);

  const fmt = (d: Date) => d.toLocaleDateString();

  return (
    <div>
      <h1 className="page-title mb-6">Dashboard</h1>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><p className="text-2xl font-bold">{stats.pending}</p><p className="meta">Pending</p></div>
        <div className="card p-4"><p className="text-2xl font-bold">{stats.approved}</p><p className="meta">Approved</p></div>
        <div className="card p-4"><p className="text-2xl font-bold">{stats.rejected}</p><p className="meta">Rejected</p></div>
      </div>
      <div className="card overflow-hidden">
        <div className="border-b px-4 py-2.5 border-ink-200 dark:border-white/10"><span className="section-title">Recent registrations</span></div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No registrations yet.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Company</th><th>Owner</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{recent.map((r) => (
              <tr key={r.id}><td className="font-medium">{r.companyName}</td><td className="text-ink-500">{r.name}</td><td>{r.status}</td><td className="tabular-nums text-ink-500">{fmt(r.createdAt)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}