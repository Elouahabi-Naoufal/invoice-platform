import { requireAdmin } from "@/server/hub-auth";
import { hubPrisma } from "@/lib/hub-prisma";
import { notFound } from "next/navigation";
import TenantActions from "@/components/TenantActions";
import SupportAccessButton from "@/components/SupportAccessButton";
import SendWelcomeButton from "@/components/SendWelcomeButton";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const tenant = await hubPrisma.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();

  const fmt = (d: Date) => d.toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const statusBadge = (s: string) => {
    const m: Record<string, string> = { PENDING: "badge badge-amber", APPROVED: "badge badge-emerald", REJECTED: "badge badge-amber" };
    return <span className={m[s] ?? "badge"}>{s}</span>;
  };

  return (
    <div>
      <a href="/admin" className="mb-4 inline-flex items-center gap-1 text-[13px] text-brand-600 hover:text-brand-700">&larr; Back to dashboard</a>
      <h1 className="page-title mb-5">{tenant.companyName}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="section-title mb-3">Details</h2>
          <dl className="grid gap-2 text-[13px]">
            <div className="flex justify-between"><dt className="text-ink-500">Email</dt><dd>{tenant.email}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Phone</dt><dd>{tenant.phone || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Subdomain</dt><dd><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{tenant.subdomain}.invora.app</code></dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Status</dt><dd>{statusBadge(tenant.status)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Registered</dt><dd className="tabular-nums">{fmt(tenant.createdAt)}</dd></div>
            {tenant.approvedAt && <div className="flex justify-between"><dt className="text-ink-500">Approved</dt><dd className="tabular-nums">{fmt(tenant.approvedAt)}</dd></div>}
            {tenant.deploymentId && <div className="flex justify-between"><dt className="text-ink-500">Deployment ID</dt><dd><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{tenant.deploymentId}</code></dd></div>}
            {tenant.supportKey && <div className="flex justify-between"><dt className="text-ink-500">Support key</dt><dd><code className="rounded bg-ink-100 px-1 text-[12px] dark:bg-white/10">{tenant.supportKey}</code></dd></div>}
          </dl>
        </div>

        {tenant.status === "PENDING" ? (
          <div className="card p-5">
            <h2 className="section-title mb-3">Actions</h2>
            <TenantActions id={tenant.id} />
          </div>
        ) : tenant.status === "APPROVED" ? (
          <div className="card p-5">
            <h2 className="section-title mb-3">Support</h2>
            <SupportAccessButton tenantId={tenant.id} adminId={admin.id} />
            <div className="mt-3 border-t border-ink-100 pt-3 dark:border-white/10">
              <h2 className="section-title mb-2">Welcome notification</h2>
              <SendWelcomeButton id={tenant.id} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}