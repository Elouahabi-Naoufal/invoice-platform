import { requireAdmin } from "@/server/admin-session";
import { listProvisioningJobs } from "@/server/admin-queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProvisioningPage() {
  await requireAdmin();
  const jobs = await listProvisioningJobs();
  const fmt = (d: Date | null) => (d ? d.toLocaleString() : "—");

  return (
    <div>
      <h1 className="page-title mb-6">Provisioning</h1>
      <div className="card overflow-hidden">
        {jobs.length === 0 ? <p className="p-4 text-sm text-ink-500">No provisioning jobs yet.</p> : (
          <table className="tbl">
            <thead><tr><th>Tenant</th><th>Status</th><th>Step</th><th>Retries</th><th>Error</th><th>Started</th><th>Completed</th></tr></thead>
            <tbody>{jobs.map((j) => (
              <tr key={j.id}>
                <td><Link href={`/admin/tenants/${j.tenantId}`} className="text-brand-600 hover:underline">{j.tenant.companyName}</Link></td>
                <td>{j.status}</td>
                <td>{j.currentStep}</td>
                <td className="tabular-nums">{j.retryCount}</td>
                <td className="text-red-600 text-[12px]">{j.errorMessage || "—"}</td>
                <td className="tabular-nums text-ink-500">{fmt(j.startedAt)}</td>
                <td className="tabular-nums text-ink-500">{fmt(j.completedAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}