import { requireAdmin } from "@/server/admin-session";
import { listRegistrations } from "@/server/admin-queries";
import RegistrationActions from "@/components/RegistrationActions";
import { PageHeader, EmptyState, Avatar } from "@/components/ui";
import { UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  await requireAdmin();
  const registrations = await listRegistrations();
  const pending = registrations.filter((r) => r.status === "PENDING").length;

  const badge = (s: string) => {
    const m: Record<string, string> = { PENDING: "badge badge-amber", APPROVED: "badge badge-emerald", REJECTED: "badge" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Registrations"
        description={pending > 0 ? `${pending} awaiting review.` : "All registrations have been reviewed."}
      />

      {registrations.length === 0 ? (
        <EmptyState icon={<UserPlus size={20} />} title="No registrations yet" body="Businesses that sign up at /register will appear here for approval." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr><th>Company</th><th>Owner</th><th>Email</th><th>Phone</th><th>Slug</th><th>Status</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.companyName}</td>
                    <td><span className="flex items-center gap-2"><Avatar name={r.name} size="h-6 w-6" />{r.name}</span></td>
                    <td className="text-ink-500">{r.email}</td>
                    <td className="text-ink-500">{r.phone || "—"}</td>
                    <td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{r.requestedSlug}</code></td>
                    <td>{badge(r.status)}</td>
                    <td className="tabular-nums text-ink-500">{r.createdAt.toLocaleDateString()}</td>
                    <td className="text-right">{r.status === "PENDING" && <RegistrationActions id={r.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}