import { requireAdmin } from "@/server/admin-session";
import { listAuditLogs } from "@/server/admin-queries";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const logs = await listAuditLogs();

  return (
    <div>
      <h1 className="page-title mb-6">Audit log</h1>
      <div className="card overflow-hidden">
        {logs.length === 0 ? <p className="p-4 text-sm text-ink-500">No audit entries yet.</p> : (
          <table className="tbl">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Metadata</th></tr></thead>
            <tbody>{logs.map((l) => (
              <tr key={l.id}>
                <td className="tabular-nums text-ink-500">{l.createdAt.toLocaleString()}</td>
                <td className="text-ink-500">{l.admin.email}</td>
                <td className="font-medium">{l.action}</td>
                <td><code className="text-[11px] text-ink-500">{l.metadata || "—"}</code></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}