import { requireAdmin } from "@/server/admin-session";
import { listTenants } from "@/server/admin-queries";
import { PageHeader, EmptyState } from "@/components/ui";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireAdmin();
  const tenants = await listTenants();

  const badge = (s: string) => {
    const m: Record<string, string> = {
      ACTIVE: "badge badge-emerald",
      PROVISIONING: "badge badge-amber",
      FAILED: "badge badge-amber",
      APPROVED: "badge badge-info",
      SUSPENDED: "badge",
    };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div className="grid gap-5">
      <PageHeader title="Tenants" description="Provisioned workspaces and their deployment status." />

      {tenants.length === 0 ? (
        <EmptyState icon={<Building2 size={20} />} title="No tenants yet" body="Approve a registration to create your first tenant." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Company</th><th>Owner</th><th>Slug</th><th>Status</th><th>URL</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium">{t.companyName}</td>
                    <td className="text-ink-500">{t.ownerName}</td>
                    <td><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{t.slug}</code></td>
                    <td>{badge(t.status)}</td>
                    <td>
                      {t.deploymentUrl ? (
                        <a href={t.deploymentUrl} target="_blank" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                          {t.deploymentUrl.replace("https://", "")} <ExternalLink size={11} />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="tabular-nums text-ink-500">{t.createdAt.toLocaleDateString()}</td>
                    <td className="text-right"><Link href={`/admin/tenants/${t.id}`} className="btn-outline btn-sm">Manage</Link></td>
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