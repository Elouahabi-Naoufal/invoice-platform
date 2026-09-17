import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActor, getActiveCompanyId } from "@/server/auth";
import { listCompanies } from "@/server/companies-clients";
import { buildReports } from "@/server/reports";
import { formatMoney } from "@/domain/invoice";
import { buildQueryString } from "@/lib/query";
import { EmptyState } from "@/components/ui";

function parseDate(v?: string): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { companyId?: string; from?: string; to?: string };
}) {
  let ownerId = "";
  try {
    ownerId = (await requireActor()).ownerId;
  } catch {
    redirect("/login");
  }
  const companies = await listCompanies();
  const activeId = await getActiveCompanyId();
  const companyId = searchParams.companyId || activeId || companies[0]?.id;
  const from = parseDate(searchParams.from);
  const to = parseDate(searchParams.to);

  const data = await buildReports(ownerId, { companyId, from, to });
  const fmt = (m: number, c: string) => formatMoney(m, c);
  const qs = (patch: Record<string, string>) =>
    buildQueryString("/reports", { companyId, from: searchParams.from, to: searchParams.to }, patch);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="meta mt-1">Revenue, TVA and aged receivables — computed from issued invoices, grouped by currency.</p>
        </div>
        <a href={`/api/exports/reports?${companyId ? `companyId=${companyId}&` : ""}${searchParams.from ? `from=${searchParams.from}&` : ""}${searchParams.to ? `to=${searchParams.to}` : ""}`} className="btn-outline btn-sm">
          Download CSV
        </a>
      </div>

      <form className="card mb-4 flex flex-wrap items-end gap-2 p-3" method="get" action="/reports">
        <div>
          <label className="label">Company</label>
          <select name="companyId" defaultValue={companyId ?? ""} className="input min-w-[200px]">
            {companies.map((c) => <option key={c.id} value={c.id}>{c.legalName}</option>)}
          </select>
        </div>
        <div><label className="label">From</label><input type="date" name="from" defaultValue={searchParams.from ?? ""} className="input w-auto" /></div>
        <div><label className="label">To</label><input type="date" name="to" defaultValue={searchParams.to ?? ""} className="input w-auto" /></div>
        <button className="btn-outline btn-sm">Apply</button>
      </form>

      {data.invoiceCount === 0 ? (
        <EmptyState title="No issued invoices in range" body="Adjust the date range or issue invoices to see reports here." />
      ) : (
        <div className="grid gap-4">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Revenue summary</span></div>
            <table className="tbl">
              <thead><tr><th>Currency</th><th className="num">Invoices</th><th className="num">Invoiced</th><th className="num">Collected</th><th className="num">Outstanding</th><th className="num">Overdue</th></tr></thead>
              <tbody>
                {data.currency.map((c) => (
                  <tr key={c.currency}>
                    <td className="font-medium">{c.currency}</td>
                    <td className="num tabular-nums">{c.count}</td>
                    <td className="num tabular-nums">{fmt(c.invoiced, c.currency)}</td>
                    <td className="num tabular-nums">{fmt(c.collected, c.currency)}</td>
                    <td className="num tabular-nums">{fmt(c.outstanding, c.currency)}</td>
                    <td className="num tabular-nums text-error-600">{fmt(c.overdue, c.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">TVA summary</span></div>
              <table className="tbl">
                <thead><tr><th>Currency</th><th>Rate</th><th className="num">Taxable</th><th className="num">TVA</th></tr></thead>
                <tbody>
                  {data.tax.map((t) => (
                    <tr key={`${t.currency}-${t.rateBps}`}>
                      <td className="font-medium">{t.currency}</td>
                      <td>{t.rateBps / 100}%</td>
                      <td className="num tabular-nums">{fmt(t.taxable, t.currency)}</td>
                      <td className="num tabular-nums">{fmt(t.tax, t.currency)}</td>
                    </tr>
                  ))}
                  {data.tax.length === 0 && <tr><td colSpan={4} className="text-ink-500">No TVA recorded.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Aged receivables</span></div>
              <table className="tbl">
                <thead><tr><th>Currency</th><th className="num">Current</th><th className="num">1–30</th><th className="num">31–60</th><th className="num">61–90</th><th className="num">90+</th></tr></thead>
                <tbody>
                  {data.aging.map((a) => (
                    <tr key={a.currency}>
                      <td className="font-medium">{a.currency}</td>
                      <td className="num tabular-nums">{fmt(a.current, a.currency)}</td>
                      <td className="num tabular-nums">{fmt(a.d1_30, a.currency)}</td>
                      <td className="num tabular-nums">{fmt(a.d31_60, a.currency)}</td>
                      <td className="num tabular-nums">{fmt(a.d61_90, a.currency)}</td>
                      <td className="num tabular-nums text-error-600">{fmt(a.d90plus, a.currency)}</td>
                    </tr>
                  ))}
                  {data.aging.length === 0 && <tr><td colSpan={6} className="text-ink-500">Nothing outstanding.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Revenue by client</span></div>
              <table className="tbl">
                <thead><tr><th>Client</th><th>Cur.</th><th className="num">Invoiced</th><th className="num">Collected</th><th className="num">Outstanding</th></tr></thead>
                <tbody>
                  {data.byClient.map((c) => (
                    <tr key={`${c.clientId}-${c.currency}`}>
                      <td className="font-medium">{c.name}</td>
                      <td>{c.currency}</td>
                      <td className="num tabular-nums">{fmt(c.invoiced, c.currency)}</td>
                      <td className="num tabular-nums">{fmt(c.collected, c.currency)}</td>
                      <td className="num tabular-nums">{fmt(c.outstanding, c.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card overflow-hidden">
              <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Revenue by product / service</span></div>
              <table className="tbl">
                <thead><tr><th>Description</th><th>Cur.</th><th className="num">Qty</th><th className="num">Net HT</th></tr></thead>
                <tbody>
                  {data.byProduct.map((p) => (
                    <tr key={`${p.description}-${p.currency}`}>
                      <td className="font-medium">{p.description}</td>
                      <td>{p.currency}</td>
                      <td className="num tabular-nums">{p.quantityMilli / 1000}</td>
                      <td className="num tabular-nums">{fmt(p.netHT, p.currency)}</td>
                    </tr>
                  ))}
                  {data.byProduct.length === 0 && <tr><td colSpan={4} className="text-ink-500">No lines.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <p className="meta mt-4">
        Showing issued invoices only. <Link href={qs({})} className="hover:underline">Reset filters</Link>
      </p>
    </div>
  );
}
