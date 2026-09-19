import { requireAdmin } from "@/server/admin-session";
import { listAuditLogs } from "@/server/admin-queries";
import { AdminPageHeader, AdminEmpty, AdminPanel, AdminTile } from "@/components/admin-ui";
import { ScrollText, Shield, User, Settings, Bell, Rocket, KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

const ACTION_ICON: Record<string, React.ReactNode> = {
  APPROVE: <Rocket size={13} />,
  REJECT: <Shield size={13} />,
  SUSPEND: <Shield size={13} />,
  RESUME: <Rocket size={13} />,
  DELETE: <Shield size={13} />,
  SUPPORT: <KeyRound size={13} />,
};

export default async function AuditPage() {
  await requireAdmin();
  const logs = await listAuditLogs();

  return (
    <div className="grid gap-6">
      <AdminPageHeader eyebrow="System" title="Audit log" description={`${logs.length} recorded action${logs.length === 1 ? "" : "s"} · newest first`} />
      {logs.length === 0 ? (
        <AdminEmpty icon={<ScrollText size={20} />} title="No audit entries" body="Administrative actions will be recorded here." />
      ) : (
        <AdminPanel title="Administrative actions" subtitle="Every action is immutable and traceable" icon={<ScrollText size={15} />} tone="neutral" padded={false}>
          <table className="adm-tbl">
            <thead><tr><th>When</th><th>Admin</th><th>Action</th><th>Metadata</th></tr></thead>
            <tbody>{logs.map((l) => (
              <tr key={l.id}>
                <td className="tabular-nums whitespace-nowrap text-ink-500">{l.createdAt.toLocaleString()}</td>
                <td className="text-ink-500">{l.admin?.email ?? "system"}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-700 dark:bg-white/10 dark:text-gray-300">
                    {ACTION_ICON[l.action] ?? <Bell size={11} />} {l.action}
                  </span>
                </td>
                <td><code className="text-[11px] text-ink-500">{l.metadata || "—"}</code></td>
              </tr>
            ))}</tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}