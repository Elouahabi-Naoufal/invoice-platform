import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { RecurringForm, RecurringActions } from "@/components/RecurringForm";
import { EmptyState } from "@/components/ui";
import Link from "next/link";
import { Plus } from "lucide-react";
import { listCompanies, listClients } from "@/server/companies-clients";

export default async function RecurringPage({ searchParams }: { searchParams: { new?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const u = await prisma.user.findFirst({ where: { email: (await requireUser()).email } as never });
  if (!u) redirect("/login");
  const templates = await safeFindMany(() => prisma.recurringTemplate.findMany({ where: { ownerId: u.id }, include: { company: { select: { legalName: true } }, client: { select: { name: true, companyName: true } } }, orderBy: { createdAt: "desc" } }), []);
  const companies = await listCompanies();
  const clients = await listClients();
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div><h1 className="page-title">Recurring invoices</h1><p className="meta mt-1">Templates generate draft factures on your schedule — period, client and lines are all yours.</p></div>
        <Link href="/recurring?new=1" className="btn-accent"><Plus size={15} /> New template</Link>
      </div>
      {searchParams.new !== undefined && (
        <div className="card mb-4 p-5"><h2 className="font-semibold mb-3">New recurring template</h2><RecurringForm companies={companies as never} clients={clients as never} onDone={() => {}} /></div>
      )}
      {templates.length === 0 && searchParams.new === undefined ? (
        <EmptyState title="No templates" body="Create a template with name, period, client and lines — generate an invoice in one click." action={<Link href="/recurring?new=1" className="btn-accent"><Plus size={15} /> New template</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Name</th><th>Client</th><th>Period</th><th>Last</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}<span className="meta block">{t.docType} · {t.currency} · {t.paymentTerms}</span></td>
                  <td className="text-ink-500">{(t.client as { companyName?: string; name?: string } | null)?.companyName ?? (t.client as { name?: string } | null)?.name ?? (t.clientId ?? "—")}</td>
                  <td className="tabular-nums">{t.periodDays} days</td>
                  <td className="tabular-nums text-ink-500">{t.lastGeneratedAt ? new Date(t.lastGeneratedAt).toLocaleDateString() : "—"}</td>
                  <td>{t.active ? <span className="badge badge-emerald">Active</span> : <span className="badge">Paused</span>}</td>
                  <td className="text-right"><RecurringActions id={t.id} active={t.active} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
