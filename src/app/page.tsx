import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Plus, Wallet, ArrowDownLeft, AlertTriangle, Users, BarChart3, MessageCircle } from "lucide-react";
import { requireActor, getActiveCompanyId } from "@/server/auth";
import { listInvoices } from "@/server/invoice-ops";
import { listCompanies } from "@/server/companies-clients";
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

  const quick = [
    { href: "/invoices/new", label: "New invoice", sub: "Create and send", icon: Plus, tone: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" },
    { href: "/clients?new=1", label: "Add client", sub: "Grow your list", icon: Users, tone: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500" },
    { href: "/reports", label: "Reports", sub: "Revenue & tax", icon: BarChart3, tone: "bg-info-50 text-info-600 dark:bg-info-500/15 dark:text-info-500" },
    { href: "/settings/whatsapp", label: "WhatsApp", sub: "Sending channel", icon: MessageCircle, tone: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500" },
  ];

  return (
    <div>
      <PageHeader
        title={greet}
        description={`Business overview · ${active.legalName}`}
        actions={<Link href="/invoices/new" className="btn-accent"><Plus size={15} /> New invoice</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href} className="card group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-ink-400 hover:shadow-card dark:hover:border-white/20">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded transition-transform group-hover:scale-105 ${q.tone}`}><Icon size={18} /></span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink-950 dark:text-white">{q.label}</span>
                <span className="meta block truncate">{q.sub}</span>
              </span>
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
            <EmptyState
              icon={<Plus size={20} />}
              bare
              title="No invoices yet"
              body="Create your first invoice and start tracking payments and reminders."
              action={<Link href="/invoices/new" className="btn-accent"><Plus size={16} /> Create invoice</Link>}
            />
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
