import { requireAdmin } from "@/server/admin-session";
import { listRegistrations } from "@/server/admin-queries";
import RegistrationActions from "@/components/RegistrationActions";
import { AdminPageHeader, AdminEmpty, AdminPanel, AdminBadge, CompanyMark } from "@/components/admin-ui";
import { Avatar } from "@/components/ui";
import { UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  await requireAdmin();
  const registrations = await listRegistrations();
  const pending = registrations.filter((r) => r.status === "PENDING").length;

  const tone = (s: string) => (s === "PENDING" ? "warning" as const : s === "APPROVED" ? "success" as const : "neutral" as const);

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Management"
        title="Registrations"
        description={pending > 0 ? `${pending} business${pending === 1 ? "" : "es"} waiting for your approval.` : "All registrations have been reviewed."}
        actions={
          pending > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-warning-600 dark:text-warning-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning-500" /> {pending} pending
            </span>
          ) : undefined
        }
      />

      {registrations.length === 0 ? (
        <AdminEmpty icon={<UserPlus size={20} />} title="No registrations yet" body="Businesses that sign up at /register will appear here for approval." />
      ) : (
        <AdminPanel title="Registration requests" subtitle={`${registrations.length} total · newest first`} icon={<UserPlus size={15} />} tone="warning" padded={false}>
          <table className="adm-tbl">
            <thead><tr><th>Company</th><th>Owner</th><th>Email</th><th>Phone</th><th>Slug</th><th>Status</th><th>Date</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td><span className="flex items-center gap-2.5 font-medium">{<CompanyMark name={r.companyName} size="h-7 w-7" />}{r.companyName}</span></td>
                  <td><span className="flex items-center gap-2 text-ink-700 dark:text-gray-200"><Avatar name={r.name} size="h-6 w-6" />{r.name}</span></td>
                  <td className="text-ink-500">{r.email}</td>
                  <td className="text-ink-500">{r.phone || "—"}</td>
                  <td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-[12px] text-ink-700 dark:bg-white/10 dark:text-gray-300">{r.requestedSlug}</code></td>
                  <td><AdminBadge tone={tone(r.status)} dot>{r.status}</AdminBadge></td>
                  <td className="tabular-nums whitespace-nowrap text-ink-500">{r.createdAt.toLocaleDateString()}</td>
                  <td className="text-right"><RegistrationActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}