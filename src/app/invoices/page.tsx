import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { requireUser, getActiveCompanyId } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";
import { listCompanies } from "@/server/companies-clients";
import { StatusBadge, EmptyState } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

const STATUSES = ["", "DRAFT", "ISSUED", "CANCELLED"];

export default async function InvoicesPage({ searchParams }: { searchParams: { status?: string; q?: string; from?: string; to?: string; page?: string } }) {
  try { await requireUser(); } catch { redirect("/login"); }
  const companies = await listCompanies();
  const activeId = await getActiveCompanyId();
  const companyId = activeId ?? companies[0]?.id;
  if (!companyId) redirect("/companies?new=1");

  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const { items: rows, total, pages } = await listInvoices({
    status: searchParams.status || undefined,
    companyId,
    q: searchParams.q || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
    page,
  });

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...searchParams, ...patch });
    Object.entries(patch).forEach(([k, v]) => { if (!v) p.delete(k); });
    p.delete("page");
    return `/invoices?${p.toString()}`;
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="page-title">Invoices</h1>
        <Link href="/invoices/new" className="btn-accent"><Plus size={15} /> New invoice</Link>
      </div>

      <form className="card mb-3 flex flex-wrap items-center gap-2 p-3" action="/invoices" method="get">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400 dark:text-stone-500" />
          <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Search number, reference, notes…" className="input pl-8" />
        </div>
        <input type="date" name="from" defaultValue={searchParams.from ?? ""} className="input w-auto" aria-label="From" />
        <input type="date" name="to" defaultValue={searchParams.to ?? ""} className="input w-auto" aria-label="To" />
        <button className="btn-outline btn-sm">Filter</button>
        <div className="ml-auto flex gap-1">
          {STATUSES.map((s) => (
            <Link
              key={s || "all"}
              href={qs({ status: s })}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${(!searchParams.status && !s) || searchParams.status === s ? "bg-ink-950 text-white" : "text-ink-500 dark:text-stone-400 hover:bg-ink-100 dark:hover:bg-white/10"}`}
            >
              {s || "All"}
            </Link>
          ))}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No invoices found"
          body="Try adjusting your search or filters — or create your first invoice."
          action={<Link href="/invoices/new" className="btn-accent"><Plus size={15} /> Create invoice</Link>}
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Client</th><th>Issued</th><th>Due</th><th className="num">Amount</th><th className="num">Balance</th><th className="text-right">Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/invoices/${r.id}`} className="font-medium hover:text-brand-600">
                        {r.invoiceNumber ?? <span className="text-ink-400 dark:text-stone-500">Draft</span>}
                      </Link>
                      <div className="meta">{r.docType}</div>
                    </td>
                    <td className="text-ink-700 dark:text-stone-300">{(r.client as { companyName?: string; name?: string } | null)?.companyName ?? (r.client as { name?: string } | null)?.name ?? "—"}</td>
                    <td className="text-ink-500 dark:text-stone-400">{new Date(r.issueDate).toLocaleDateString()}</td>
                    <td className="text-ink-500 dark:text-stone-400">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="num font-medium tabular-nums">{formatMoney(r.totalTTC, r.currency)}</td>
                    <td className="num tabular-nums text-ink-500 dark:text-stone-400">{formatMoney(r.remaining, r.currency)}</td>
                    <td className="text-right"><StatusBadge value={r.display} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
