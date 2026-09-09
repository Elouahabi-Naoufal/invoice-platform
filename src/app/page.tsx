import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { requireUser, getActiveCompanyId } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";
import { listCompanies } from "@/server/companies-clients";
import { StatusBadge, EmptyState } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

export default async function Dashboard() {
  try { await requireUser(); } catch { redirect("/login"); }
  const companies = await listCompanies();
  if (companies.length === 0) {
    return (
      <EmptyState
        title="Welcome — create your company"
        body="Set up your first company profile (legal identity, tax, bank) and you can issue your first invoice in minutes."
        action={<Link href="/companies?new=1" className="btn-accent"><Plus size={15} /> Create company</Link>}
      />
    );
  }
  const activeId = await getActiveCompanyId();
  const active = companies.find((c) => c.id === activeId) ?? companies[0];
  const { items: rows } = await listInvoices({ companyId: active.id, pageSize: 100 });
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const outstanding = live.filter((r) => r.status === "ISSUED").reduce((a, r) => a + r.remaining, 0);
  const overdueCount = live.filter((r) => r.display === "OVERDUE").length;
  const outstandingCount = live.filter((r) => r.status === "ISSUED").length;
  const month = new Date().toISOString().slice(0, 7);
  const paidMonth = live
    .flatMap((r) => r.payments.map((p) => ({ ...p, cur: r.currency })))
    .filter((p) => new Date(p.paymentDate).toISOString().slice(0, 7) === month);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-3xl">
      <h1 className="page-title">{greet}</h1>
      <p className="text-[13px] text-ink-500 mt-0.5 mb-6">Your business overview · {active.legalName}</p>

      <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <div className="card p-5">
          <div className="meta mb-1">Outstanding</div>
          <div className="text-[22px] font-semibold tracking-tight tabular-nums">{formatMoney(outstanding, active.defaultCurrency)}</div>
          <div className="meta mt-1">{outstandingCount} open invoice{outstandingCount === 1 ? "" : "s"}{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}</div>
        </div>
        <div className="card p-5">
          <div className="meta mb-1">Collected this month</div>
          <div className="text-[22px] font-semibold tracking-tight tabular-nums">
            {paidMonth.length === 0 ? `0 ${active.defaultCurrency}` : formatMoney(paidMonth.reduce((a, p) => a + p.amountMinor, 0), active.defaultCurrency)}
          </div>
          <div className="meta mt-1">{paidMonth.length} payment{paidMonth.length === 1 ? "" : "s"}</div>
        </div>
        <div className="card flex flex-col justify-between p-5">
          <div className="meta mb-1">Next step</div>
          <Link href="/invoices/new" className="btn-accent mt-2"><Plus size={15} /> New invoice</Link>
        </div>
      </div>

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="section-title">Recent invoices</h2>
        <Link href="/invoices" className="flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-950">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Create your first invoice and start tracking your business payments."
          action={<Link href="/invoices/new" className="btn-accent"><Plus size={15} /> Create invoice</Link>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <tbody>
              {rows.slice(0, 8).map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">
                    <Link href={`/invoices/${r.id}`} className="hover:text-brand-600">{r.invoiceNumber ?? <span className="text-ink-400">Draft</span>}</Link>
                  </td>
                  <td className="text-ink-500">{(r.client as { companyName?: string; name?: string } | null)?.companyName ?? (r.client as { name?: string } | null)?.name ?? "—"}</td>
                  <td className="num font-medium tabular-nums">{formatMoney(r.totalTTC, r.currency)}</td>
                  <td className="text-right"><StatusBadge value={r.display} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
