import { requireAdmin } from "@/server/admin-session";
import { listNotifications } from "@/server/admin-queries";
import NotificationRetryButton from "@/components/NotificationRetryButton";
import ProcessNotificationsButton from "@/components/ProcessNotificationsButton";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdmin();
  const notifications = await listNotifications();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="page-title">Notifications</h1>
        <ProcessNotificationsButton />
      </div>
      <div className="card overflow-hidden">
        {notifications.length === 0 ? <p className="p-4 text-sm text-ink-500">No notifications yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Target</th><th>Type</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Error</th><th></th></tr></thead>
            <tbody>{notifications.map((n) => (
              <tr key={n.id}>
                <td>
                  {n.tenant ? (
                    <Link href={`/admin/tenants/${n.tenantId}`} className="text-brand-600 hover:underline">{n.tenant.companyName}</Link>
                  ) : n.registration ? (
                    <Link href="/admin/registrations" className="text-brand-600 hover:underline">{n.registration.companyName}</Link>
                  ) : (
                    <span className="text-ink-500">{n.recipient}</span>
                  )}
                </td>
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