import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Wallet, ArrowDownLeft, AlertTriangle, FileText, Users, BarChart3, MessageCircle, TrendingUp } from "lucide-react";
import { requireActor, getActiveCompanyId } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";
import { listCompanies } from "@/server/companies-clients";
import { buildProfitAndLoss } from "@/server/reports";
import { StatusBadge, EmptyState, PageHeader, StatCard, SectionCard } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";

export default async function Dashboard() {
  let ownerId = "";
  try { ownerId = (await requireActor()).ownerId; } catch { redirect("/login"); }
  const companies = await listCompanies();
  if (companies.length === 0) {
    return (
      <EmptyState
        title="Welcome — create your company"
        body="Set up your first company profile (legal identity, tax, bank) and you can issue your first invoice in minutes."
        icon={<Plus size={22} />}
        action={<Link href="/companies?new=1" className="btn-accent"><Plus size={16} /> Create company</Link>}
      />
    );
  }
  const activeId = await getActiveCompanyId();
  const active = companies.find((c) => c.id === activeId) ?? companies[0];
  const { items: rows } = await listInvoices({ companyId: active.id, pageSize: 100 });
  const live = rows.filter((r) => r.status !== "CANCELLED");
  const month = new Date().toISOString().slice(0, 7);

  const outstandingByCurrency = new Map<string, number>();
  const overdueByCurrency = new Map<string, number>();
  let outstandingCount = 0;
  let overdueCount = 0;
  for (const r of live) {
    if (r.status !== "ISSUED") continue;
    outstandingByCurrency.set(r.currency, (outstandingByCurrency.get(r.currency) ?? 0) + r.remaining);
    outstandingCount += 1;
    if (r.display === "OVERDUE") {
      overdueByCurrency.set(r.currency, (overdueByCurrency.get(r.currency) ?? 0) + r.remaining);
      overdueCount += 1;
    }
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
    [...m.entries()].filter(([, v]) => v !== 0).map(([c, v]) => formatMoney(v, c)).join(" · ") || formatMoney(0, active.defaultCurrency);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const pnl = await buildProfitAndLoss(ownerId, { companyId: active.id, from: yearStart, baseCurrency: active.defaultCurrency });
  const profitRow = pnl.find((p) => p.currency === active.defaultCurrency) ?? pnl[0];
  const netProfit = profitRow?.netProfit ?? 0;
  const netCurrency = profitRow?.currency ?? active.defaultCurrency;

  const quick = [
    { href: "/invoices/new", label: "New invoice", icon: Plus },
    { href: "/clients?new=1", label: "Add client", icon: Users },
    { href: "/reports", label: "Reports", icon: BarChart3 },
    { href: "/settings/whatsapp", label: "WhatsApp", icon: MessageCircle },
  ];

  return (
    <div>
      <PageHeader
        title={greet}
        description={`Business overview · ${active.legalName}`}
        actions={<Link href="/invoices/new" className="btn-accent"><Plus size={15} /> New invoice</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone={netProfit < 0 ? "error" : "success"}
          icon={<TrendingUp size={20} />}
          label="Net profit · this year"
          value={moneyList(new Map([[netCurrency, netProfit]]))}
          sub="revenue − expenses − payroll"
          href="/reports"
        />
        <StatCard
          tone="brand"
          icon={<Wallet size={20} />}
          label="Outstanding"
          value={moneyList(outstandingByCurrency)}
          sub={`${outstandingCount} open invoice${outstandingCount === 1 ? "" : "s"}`}
          href="/invoices?status=ISSUED"
        />
        <StatCard
          tone="success"
          icon={<ArrowDownLeft size={20} />}
          label="Collected this month"
          value={moneyList(paidByCurrency)}
          sub={`${paymentCount} payment${paymentCount === 1 ? "" : "s"}`}
        />
        <StatCard
          tone={overdueCount > 0 ? "error" : "neutral"}
          icon={<AlertTriangle size={20} />}
          label="Overdue"
          value={moneyList(overdueByCurrency)}
          sub={`${overdueCount} invoice${overdueCount === 1 ? "" : "s"} past due`}
          href="/relances"
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href} className="card flex items-center gap-2.5 px-4 py-3 text-[13px] font-medium transition-colors hover:border-ink-400 dark:hover:border-white/20">
              <span className="grid h-8 w-8 place-items-center rounded bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-gray-300"><Icon size={16} /></span>
              {q.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <SectionCard
          title="Recent invoices"
          action={<Link href="/invoices" className="flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700">View all <ArrowRight size={14} /></Link>}
        >
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="meta mb-4">Create your first invoice and start tracking payments.</p>
              <Link href="/invoices/new" className="btn-accent"><Plus size={16} /> Create invoice</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
