import { requireAdmin } from "@/server/admin-session";
import { listNotifications } from "@/server/admin-queries";
import NotificationRetryButton from "@/components/NotificationRetryButton";
import ProcessNotificationsButton from "@/components/ProcessNotificationsButton";
import { PageHeader, EmptyState } from "@/components/ui";
import Link from "next/link";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdmin();
  const notifications = await listNotifications();
  const failed = notifications.filter((n) => n.status === "FAILED").length;

  const statusBadge = (s: string) =>
    s === "SENT" ? <span className="badge badge-emerald">Sent</span> : s === "FAILED" ? <span className="badge badge-amber">Failed</span> : <span className="badge">Pending</span>;

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Notifications"
        description={failed > 0 ? `${failed} delivery failure${failed === 1 ? "" : "s"} need attention.` : "All notifications delivered."}
        actions={<ProcessNotificationsButton />}
      />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell size={20} />} title="No notifications yet" body="Registration confirmations and welcome messages will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Target</th><th>Type</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Error</th><th></th></tr></thead>
              <tbody>{notifications.map((n) => (
                <tr key={n.id}>
                  <td>
                    {n.tenant ? (
                      <Link href={`/admin/tenants/${n.tenantId}`} className="font-medium text-brand-600 hover:underline">{n.tenant.companyName}</Link>
                    ) : n.registration ? (
                      <Link href="/admin/registrations" className="font-medium text-brand-600 hover:underline">{n.registration.companyName}</Link>
                    ) : (
                      <span className="text-ink-500">{n.recipient}</span>
                    )}
                  </td>
                  <td><span className="badge">{n.type}</span></td>
                  <td className="text-ink-500">{n.channel}</td>
                  <td className="text-ink-500">{n.recipient}</td>
                  <td>{statusBadge(n.status)}</td>
                  <td className="tabular-nums">{n.attempts}</td>
                  <td className="max-w-[220px] truncate text-[12px] text-error-600" title={n.lastError ?? ""}>{n.lastError || "—"}</td>
                  <td className="text-right">{(n.status === "FAILED" || n.status === "PENDING") && <NotificationRetryButton id={n.id} />}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}