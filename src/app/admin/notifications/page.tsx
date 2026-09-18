import { requireAdmin } from "@/server/admin-auth";
import { listNotifications } from "@/server/admin-actions";
import NotificationRetryButton from "@/components/NotificationRetryButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdmin();
  const notifications = await listNotifications();

  return (
    <div>
      <h1 className="page-title mb-6">Notifications</h1>
      <div className="card overflow-hidden">
        {notifications.length === 0 ? <p className="p-4 text-sm text-ink-500">No notifications yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Tenant</th><th>Type</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Error</th><th></th></tr></thead>
            <tbody>{notifications.map((n) => (
              <tr key={n.id}>
                <td><Link href={`/admin/tenants/${n.tenantId}`} className="text-brand-600 hover:underline">{n.tenant.companyName}</Link></td>
                <td>{n.type}</td>
                <td>{n.channel}</td>
                <td className="text-ink-500">{n.recipient}</td>
                <td>{n.status === "SENT" ? <span className="badge badge-emerald">Sent</span> : n.status === "FAILED" ? <span className="badge badge-amber">Failed</span> : <span className="badge">Pending</span>}</td>
                <td className="tabular-nums">{n.attempts}</td>
                <td className="text-red-600 text-[12px]">{n.lastError || "—"}</td>
                <td className="text-right">{(n.status === "FAILED" || n.status === "PENDING") && <NotificationRetryButton id={n.id} />}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}