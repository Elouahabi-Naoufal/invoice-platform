import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, FileText } from "lucide-react";
import { requireUser, getActiveCompanyId } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";
import { listCompanies } from "@/server/companies-clients";
import { StatusBadge, EmptyState, PageHeader } from "@/components/ui";
import InvoiceRow from "@/components/InvoiceRow";
import { formatMoney } from "@/domain/invoice";
import { buildQueryString } from "@/lib/query";

const STATUSES = ["", "DRAFT", "ISSUED", "CANCELLED"];
const TYPES = ["", "FACTURE", "DEVIS", "AVOIR", "RECTIFICATIVE"];

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string; docType?: string; q?: string; from?: string; to?: string; page?: string; company?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const companies = await listCompanies();
  if (companies.length === 0) redirect("/companies?new=1");
  const activeId = await getActiveCompanyId();
  const companyParam = searchParams.company ?? "";
  const companyId = companyParam === "all" ? undefined : (companyParam || activeId || companies[0]?.id);

  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const { items: rows, total, pages } = await listInvoices({
    status: searchParams.status || undefined,
    docType: searchParams.docType || undefined,
    companyId,
    q: searchParams.q || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
    page,
  });

  const qs = (patch: Record<string, string>) => buildQueryString("/invoices", { ...searchParams }, patch, ["page"]);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={`${total} document${total === 1 ? "" : "s"} for the active company`}
        actions={<Link href="/invoices/new" className="btn-accent"><Plus size={15} /> New invoice</Link>}
      />

      <div className="card mb-4 p-3">
        <form className="flex flex-wrap items-center gap-2" action="/invoices" method="get">
          <select name="company" defaultValue={companyParam === "all" ? "all" : (companyParam || companyId || "all")} className="input w-auto min-w-[170px]" aria-label="Company">
            <option value="all">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
          </select>
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search number, reference, notes…" className="input pl-8" />
          </div>
          <input type="date" name="from" defaultValue={searchParams.from ?? ""} className="input w-auto" aria-label="From" />
          <input type="date" name="to" defaultValue={searchParams.to ?? ""} className="input w-auto" aria-label="To" />
          {searchParams.docType ? <input type="hidden" name="docType" value={searchParams.docType} /> : null}
          {searchParams.status ? <input type="hidden" name="status" value={searchParams.status} /> : null}
          <button className="btn-outline btn-sm">Apply</button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-100 pt-3 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Type</span>
            {TYPES.map((t) => {
              const on = (!searchParams.docType && !t) || searchParams.docType === t;
              return (
                <Link key={t || "alltypes"} href={qs({ docType: t })} className={`rounded px-2.5 py-1 text-[12px] font-medium ${on ? "bg-brand-500 text-white" : "text-ink-500 hover:bg-ink-100 dark:text-gray-400 dark:hover:bg-white/10"}`}>
                  {t || "All"}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Status</span>
            {STATUSES.map((s) => {
              const on = (!searchParams.status && !s) || searchParams.status === s;
              return (
                <Link key={s || "all"} href={qs({ status: s })} className={`rounded px-2.5 py-1 text-[12px] font-medium ${on ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950" : "text-ink-500 hover:bg-ink-100 dark:text-gray-400 dark:hover:bg-white/10"}`}>
                  {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No invoices found"
          body="Try adjusting your search or filters — or create your first invoice."
          icon={<FileText size={22} />}
          action={<Link href="/invoices/new" className="btn-accent"><Plus size={15} /> Create invoice</Link>}
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Invoice</th><th>Client</th><th>Issued</th><th>Due</th>
                    <th className="num">Amount</th><th className="num">Balance</th><th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <InvoiceRow key={r.id} id={r.id}>
                      <td>
                        <span className="font-medium text-brand-600">{r.invoiceNumber ?? <span className="text-ink-400">Draft</span>}</span>
                        <div className="meta">{r.docType}</div>
                      </td>
                      <td className="text-ink-700 dark:text-gray-200">{(r.client as { companyName?: string; name?: string } | null)?.companyName ?? (r.client as { name?: string } | null)?.name ?? "—"}</td>
                      <td className="text-ink-500">{new Date(r.issueDate).toLocaleDateString()}</td>
                      <td className="text-ink-500">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}</td>
                      <td className="num font-medium tabular-nums">{formatMoney(r.totalTTC, r.currency)}</td>
                      <td className="num tabular-nums text-ink-500">{formatMoney(r.remaining, r.currency)}</td>
                      <td className="text-right"><StatusBadge value={r.display} /></td>
                    </InvoiceRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="meta">{total} invoice{total === 1 ? "" : "s"} · page {page} of {pages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={qs({}) + `&page=${page - 1}`} className="btn-outline btn-sm">Previous</Link>}
              {page < pages && <Link href={qs({}) + `&page=${page + 1}`} className="btn-outline btn-sm">Next</Link>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
