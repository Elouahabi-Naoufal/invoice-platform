import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Wallet, ArrowDownLeft, FileText } from "lucide-react";
import { requireUser, getActiveCompanyId } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";
import { listCompanies } from "@/server/companies-clients";
import { StatusBadge, EmptyState } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

function Metric({ icon, label, value, sub, tint }: {
  icon: React.ReactNode; label: string; value: string; sub: string; tint: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tint}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="meta block">{label}</span>
        <span className="block truncate text-2xl font-semibold text-ink-950 tabular-nums dark:text-white">{value}</span>
        <span className="meta block truncate">{sub}</span>
      </span>
    </div>
  );
}

export default async function Dashboard() {
  try { await requireUser(); } catch { redirect("/login"); }
  const companies = await listCompanies();
  if (companies.length === 0) {
    return (
      <EmptyState
        title="Welcome — create your company"
        body="Set up your first company profile (legal identity, tax, bank) and you can issue your first invoice in minutes."
        action={<Link href="/companies?new=1" className="btn-accent"><Plus size={16} /> Create company</Link>}
      />
    );
  }
  const activeId = await getActiveCompanyId();
  const active = companies.find((c) => c.id === activeId) ?? companies[0];
  const { items: rows } = await listInvoices({ companyId: active.id, pageSize: 100 });
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const outstandingCount = live.filter((r) => r.status === "ISSUED").length;
  const overdueCount = live.filter((r) => r.display === "OVERDUE").length;
  const month = new Date().toISOString().slice(0, 7);
  // Never sum across currencies: group every figure by its currency.
  const outstandingByCurrency = new Map<string, number>();
  for (const r of live.filter((r) => r.status === "ISSUED")) {
    outstandingByCurrency.set(r.currency, (outstandingByCurrency.get(r.currency) ?? 0) + r.remaining);
  }
  const paidByCurrency = new Map<string, number>();
  let paymentCount = 0;
  for (const r of live) {
    for (const p of r.payments) {
      if (new Date(p.paymentDate).toISOString().slice(0, 7) !== month) continue;
      paidByCurrency.set(r.currency, (paidByCurrency.get(r.currency) ?? 0) + p.amountMinor);
      paymentCount += 1;
    }
  }
  const moneyList = (m: Map<string, number>) =>
    [...m.entries()]
      .filter(([, v]) => v !== 0)
      .map(([c, v]) => formatMoney(v, c))
      .join(" · ") || formatMoney(0, active.defaultCurrency);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">{greet}</h1>
        <p className="meta mt-1">Your business overview · {active.legalName}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <Metric
          icon={<Wallet size={22} className="text-brand-600 dark:text-brand-400" />}
          tint="bg-brand-50 dark:bg-brand-500/15"
          label="Outstanding"
          value={moneyList(outstandingByCurrency)}
          sub={`${outstandingCount} open · ${overdueCount} overdue`}
        />
        <Metric
          icon={<ArrowDownLeft size={22} className="text-success-600 dark:text-success-500" />}
          tint="bg-success-50 dark:bg-success-500/15"
          label="Collected this month"
          value={moneyList(paidByCurrency)}
          sub={`${paymentCount} payments`}
        />
        <div className="card flex items-center gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-100 dark:bg-white/10">
            <FileText size={22} className="text-ink-500" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="meta block">Invoicing</span>
            <Link href="/invoices/new" className="btn-accent btn-sm mt-1.5"><Plus size={14} /> New invoice</Link>
          </span>
        </div>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4 dark:border-white/10">
          <h2 className="section-title">Recent invoices</h2>
          <Link href="/invoices" className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            View all <ArrowRight size={15} />
          </Link>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="meta mb-4">Create your first invoice and start tracking payments.</p>
            <Link href="/invoices/new" className="btn-accent"><Plus size={16} /> Create invoice</Link>
          </div>
        ) : (
          <table className="tbl">
            <tbody>
              {rows.slice(0, 8).map((r) => (
                <tr key={r.id}>
                  <td className="font-medium text-ink-950 dark:text-white">
                    <Link href={`/invoices/${r.id}`} className="hover:text-brand-600">{r.invoiceNumber ?? <span className="text-ink-400">Draft</span>}</Link>
                    <div className="meta">{(r.client as { companyName?: string; name?: string } | null)?.companyName ?? (r.client as { name?: string } | null)?.name ?? "—"}</div>
                  </td>
                  <td className="meta">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="num font-semibold text-ink-950 tabular-nums dark:text-white">{formatMoney(r.totalTTC, r.currency)}</td>
                  <td className="text-right"><StatusBadge value={r.display} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
