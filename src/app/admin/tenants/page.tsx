import { requireAdmin } from "@/server/admin-session";
import { listTenants } from "@/server/admin-queries";
import Link from "next/link";

export default async function TenantsPage() {
  await requireAdmin();
  const tenants = await listTenants();

  const badge = (s: string) => {
    const m: Record<string, string> = {
      ACTIVE: "badge badge-emerald",
      PROVISIONING: "badge badge-amber",
      FAILED: "badge badge-amber",
      APPROVED: "badge",
      SUSPENDED: "badge",
    };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div>
      <h1 className="page-title mb-6">Tenants</h1>
      <div className="card overflow-hidden">
        {tenants.length === 0 ? (
          <p className="p-4 text-sm text-ink-500">No tenants yet. Approve a registration to create one.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Company</th><th>Owner</th><th>Slug</th><th>Status</th><th>URL</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.companyName}</td>
                  <td className="text-ink-500">{t.ownerName}</td>
                  <td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{t.slug}</code></td>
                  <td>{badge(t.status)}</td>
                  <td className="text-ink-500">{t.deploymentUrl ? <a href={t.deploymentUrl} target="_blank" className="text-brand-600 hover:underline">{t.deploymentUrl.replace("https://", "")}</a> : "—"}</td>
                  <td className="tabular-nums text-ink-500">{t.createdAt.toLocaleDateString()}</td>
                  <td className="text-right"><Link href={`/admin/tenants/${t.id}`} className="btn-ghost btn-sm">Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}