import { requireAdmin } from "@/server/admin-session";
import { listAuditLogs } from "@/server/admin-queries";
import { PageHeader, EmptyState } from "@/components/ui";
import { ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const logs = await listAuditLogs();

  return (
    <div className="grid gap-5">
      <PageHeader title="Audit log" description="Every administrative action, newest first." />
      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={20} />} title="No audit entries" body="Administrative actions will be recorded here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Metadata</th></tr></thead>
              <tbody>{logs.map((l) => (
                <tr key={l.id}>
                  <td className="tabular-nums whitespace-nowrap text-ink-500">{l.createdAt.toLocaleString()}</td>
                  <td className="text-ink-500">{l.admin?.email ?? "system"}</td>
                  <td><span className="badge">{l.action}</span></td>
                  <td><code className="text-[11px] text-ink-500">{l.metadata || "—"}</code></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}