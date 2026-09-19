import { requireAdmin } from "@/server/admin-session";
import { listProvisioningJobs } from "@/server/admin-queries";
import { AdminPageHeader, AdminEmpty, AdminPanel, AdminBadge } from "@/components/admin-ui";
import Link from "next/link";
import { Rocket } from "lucide-react";
import type { AdmTone } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function ProvisioningPage() {
  await requireAdmin();
  const jobs = await listProvisioningJobs();
  const fmt = (d: Date | null) => (d ? d.toLocaleString() : "—");

  const tone = (s: string): AdmTone => (s === "COMPLETED" ? "success" : s === "FAILED" ? "error" : s === "RUNNING" ? "info" : "neutral");
  const active = jobs.filter((j) => j.status === "RUNNING" || j.status === "QUEUED").length;

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Management"
        title="Provisioning"
        description={active > 0 ? `${active} deployment${active === 1 ? "" : "s"} in flight.` : "Deployment jobs for tenant workspaces."}
        actions={active > 0 ? <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-info-600 dark:text-info-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-info-500" /> Deploying</span> : undefined}
      />
      {jobs.length === 0 ? (
        <AdminEmpty icon={<Rocket size={20} />} title="No provisioning jobs" body="Jobs appear here when you provision a tenant." />
      ) : (
        <AdminPanel title="Deployment jobs" subtitle="Provision, build and activation steps" icon={<Rocket size={15} />} tone="info" padded={false}>
          <table className="adm-tbl">
            <thead><tr><th>Tenant</th><th>Status</th><th>Step</th><th>Retries</th><th>Error</th><th>Started</th><th>Completed</th></tr></thead>
            <tbody>{jobs.map((j) => (
              <tr key={j.id}>
                <td><Link href={`/admin/tenants/${j.tenantId}`} className="font-medium text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">{j.tenant.companyName}</Link></td>
                <td><AdminBadge tone={tone(j.status)} dot>{j.status}</AdminBadge></td>
                <td className="text-ink-500">{j.currentStep}</td>
                <td className="tabular-nums">{j.retryCount}</td>
                <td className="max-w-[260px] truncate text-[12px] text-error-600" title={j.errorMessage ?? ""}>{j.errorMessage || "—"}</td>
                <td className="tabular-nums whitespace-nowrap text-ink-500">{fmt(j.startedAt)}</td>
                <td className="tabular-nums whitespace-nowrap text-ink-500">{fmt(j.completedAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        </AdminPanel>
      )}
    </div>
  );
}