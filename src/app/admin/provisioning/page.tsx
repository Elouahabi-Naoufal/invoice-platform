import { requireAdmin } from "@/server/admin-session";
import { listProvisioningJobs } from "@/server/admin-queries";
import { PageHeader, EmptyState } from "@/components/ui";
import Link from "next/link";
import { Rocket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProvisioningPage() {
  await requireAdmin();
  const jobs = await listProvisioningJobs();
  const fmt = (d: Date | null) => (d ? d.toLocaleString() : "—");

  const badge = (s: string) => {
    const m: Record<string, string> = { COMPLETED: "badge badge-emerald", FAILED: "badge badge-amber", RUNNING: "badge badge-info", QUEUED: "badge" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div className="grid gap-5">
      <PageHeader title="Provisioning" description="Deployment jobs for tenant workspaces." />
      {jobs.length === 0 ? (
        <EmptyState icon={<Rocket size={20} />} title="No provisioning jobs" body="Jobs appear here when you provision a tenant." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Tenant</th><th>Status</th><th>Step</th><th>Retries</th><th>Error</th><th>Started</th><th>Completed</th></tr></thead>
              <tbody>{jobs.map((j) => (
                <tr key={j.id}>
                  <td><Link href={`/admin/tenants/${j.tenantId}`} className="font-medium text-brand-600 hover:underline">{j.tenant.companyName}</Link></td>
                  <td>{badge(j.status)}</td>
                  <td className="text-ink-500">{j.currentStep}</td>
                  <td className="tabular-nums">{j.retryCount}</td>
                  <td className="max-w-[260px] truncate text-[12px] text-error-600" title={j.errorMessage ?? ""}>{j.errorMessage || "—"}</td>
                  <td className="tabular-nums text-ink-500">{fmt(j.startedAt)}</td>
                  <td className="tabular-nums text-ink-500">{fmt(j.completedAt)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}