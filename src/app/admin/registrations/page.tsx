import { requireAdmin } from "@/server/admin-session";
import { listRegistrations } from "@/server/admin-queries";
import RegistrationActions from "@/components/RegistrationActions";

export default async function RegistrationsPage() {
  await requireAdmin();
  const registrations = await listRegistrations();

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { PENDING: "badge badge-amber", APPROVED: "badge badge-emerald", REJECTED: "badge badge-amber" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div>
      <h1 className="page-title mb-6">Registrations</h1>
      <div className="card overflow-hidden">
        {registrations.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No registrations yet.</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Company</th><th>Owner</th><th>Email</th><th>Phone</th><th>Slug</th><th>Status</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.companyName}</td>
                  <td className="text-ink-600">{r.name}</td>
                  <td className="text-ink-500">{r.email}</td>
                  <td className="text-ink-500">{r.phone || "—"}</td>
                  <td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{r.requestedSlug}</code></td>
                  <td>{statusBadge(r.status)}</td>
                  <td className="tabular-nums text-ink-500">{r.createdAt.toLocaleDateString()}</td>
                  <td>{r.status === "PENDING" && <RegistrationActions id={r.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}