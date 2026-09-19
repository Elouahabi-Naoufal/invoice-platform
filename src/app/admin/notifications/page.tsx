import { requireAdmin } from "@/server/admin-session";
import { listNotifications } from "@/server/admin-queries";
import NotificationRetryButton from "@/components/NotificationRetryButton";
import ProcessNotificationsButton from "@/components/ProcessNotificationsButton";
import { AdminPageHeader, AdminEmpty, AdminPanel, AdminBadge } from "@/components/admin-ui";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { AdmTone } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireAdmin();
  const notifications = await listNotifications();
  const failed = notifications.filter((n) => n.status === "FAILED").length;

  const tone = (s: string): AdmTone => (s === "SENT" ? "success" : s === "FAILED" ? "error" : "neutral");

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Communication"
        title="Notifications"
        description={failed > 0 ? `${failed} delivery failure${failed === 1 ? "" : "s"} need attention.` : "All notifications delivered."}
        actions={<ProcessNotificationsButton />}
      />
      {notifications.length === 0 ? (
        <AdminEmpty icon={<Bell size={20} />} title="No notifications yet" body="Registration confirmations and welcome messages will appear here." />
      ) : (
        <AdminPanel title="Message delivery" subtitle={`${notifications.length} sent or queued`} icon={<Bell size={15} />} tone="brand" padded={false}>
          <table className="adm-tbl">
            <thead><tr><th>Target</th><th>Type</th><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Error</th><th className="text-right">Retry</th></tr></thead>
            <tbody>{notifications.map((n) => (
              <tr key={n.id}>
                <td>
                  {n.tenant ? (
                    <Link href={`/admin/tenants/${n.tenantId}`} className="font-medium text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">{n.tenant.companyName}</Link>
                  ) : n.registration ? (
                    <Link href="/admin/registrations" className="font-medium text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">{n.registration.companyName}</Link>
                  ) : (
                    <span className="text-ink-500">{n.recipient}</span>
                  )}
                </td>
                <td><span className="text-[12px] font-medium text-ink-700 dark:text-gray-200">{n.type}</span></td>
                <td className="text-ink-500">{n.channel}</td>
                <td className="text-ink-500">{n.recipient}</td>
                <td><AdminBadge tone={tone(n.status)} dot>{n.status}</AdminBadge></td>
                <td className="tabular-nums">{n.attempts}</td>
                <td className="max-w-[220px] truncate text-[12px] text-error-600" title={n.lastError ?? ""}>{n.lastError || "—"}</td>
                <td className="text-right">{(n.status === "FAILED" || n.status === "PENDING") && <NotificationRetryButton id={n.id} />}</td>
              </tr>
            ))}</tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}