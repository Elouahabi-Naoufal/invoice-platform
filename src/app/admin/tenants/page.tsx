import { requireAdmin } from "@/server/admin-session";
import { listTenants } from "@/server/admin-queries";
import { AdminPageHeader, AdminEmpty, AdminPanel, AdminBadge, CompanyMark } from "@/components/admin-ui";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";
import type { AdmTone } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireAdmin();
  const tenants = await listTenants();

  const tone = (s: string): AdmTone =>
    s === "ACTIVE" ? "success" : s === "PROVISIONING" ? "info" : s === "FAILED" ? "error" : s === "APPROVED" ? "brand" : "neutral";
  const active = tenants.filter((t) => t.status === "ACTIVE").length;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Management"
        title="Tenants"
        description={`${tenants.length} workspace${tenants.length === 1 ? "" : "s"} — ${active} live. Each runs in its own isolated container.`}
        actions={
          <Link href="/admin/registrations" className="btn-accent btn-sm"><Building2 size={14} /> New tenant</Link>
        }
      />

      {tenants.length === 0 ? (
        <AdminEmpty icon={<Building2 size={20} />} title="No tenants yet" body="Approve a registration to create your first tenant." />
      ) : (
        <AdminPanel title="Workspaces" subtitle="Provisioned businesses and deployment status" icon={<Building2 size={15} />} tone="success" padded={false}>
          <table className="adm-tbl">
            <thead><tr><th>Company</th><th>Owner</th><th>Slug</th><th>Status</th><th>URL</th><th>Created</th><th className="text-right">Manage</th></tr></thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td><span className="flex items-center gap-2.5 font-medium">{<CompanyMark name={t.companyName} size="h-7 w-7" />}{t.companyName}</span></td>
                  <td className="text-ink-500">{t.ownerName}</td>
                  <td><code className="rounded bg-ink-100 px-1.5 py-0.5 text-[12px] text-ink-700 dark:bg-white/10 dark:text-gray-300">{t.slug}</code></td>
                  <td><AdminBadge tone={tone(t.status)} dot>{t.status}</AdminBadge></td>
                  <td>
                    {t.deploymentUrl ? (
                      <a href={t.deploymentUrl} target="_blank" className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">
                        <span className="truncate max-w-[220px]">{t.deploymentUrl.replace("https://", "")}</span> <ExternalLink size={11} />
                      </a>
                    ) : <span className="text-ink-400">—</span>}
                  </td>
                  <td className="tabular-nums whitespace-nowrap text-ink-500">{t.createdAt.toLocaleDateString()}</td>
                  <td className="text-right"><Link href={`/admin/tenants/${t.id}`} className="btn-outline btn-sm">Manage</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}