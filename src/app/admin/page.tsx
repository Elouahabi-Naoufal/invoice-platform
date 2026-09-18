import { requireAdmin } from "@/server/admin-auth";
import { getPlatformStats, listRegistrations } from "@/server/admin-actions";
import Link from "next/link";

export default async function AdminPage() {
  await requireAdmin();
  const stats = await getPlatformStats();
  const recent = (await listRegistrations()).slice(0, 5);

  const card = (label: string, value: number, tone?: string) => (
    <div className="card p-4">
      <p className={`text-2xl font-bold ${tone ?? ""}`}>{value}</p>
      <p className="meta">{label}</p>
    </div>
  );

  return (
    <div>
      <h1 className="page-title mb-6">Dashboard</h1>
      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {card("Pending registrations", stats.pending, stats.pending > 0 ? "text-amber-600" : "")}
        {card("Active tenants", stats.active, "text-emerald-600")}
        {card("Provisioning", stats.provisioning)}
        {card("Failed", stats.failed, stats.failed > 0 ? "text-red-600" : "")}
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-2.5 dark:border-white/10">
          <span className="section-title">Recent registrations</span>
          <Link href="/admin/registrations" className="text-[12px] text-brand-600 hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No registrations yet.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Company</th><th>Owner</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{recent.map((r) => (
              <tr key={r.id}><td className="font-medium">{r.companyName}</td><td className="text-ink-500">{r.name}</td><td>{r.status}</td><td className="tabular-nums text-ink-500">{r.createdAt.toLocaleDateString()}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}