import { requireActor } from "@/server/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { listRates } from "@/server/rates";
import { ExpenseForm, ExpenseRowDelete, InvoiceFromBillable } from "@/components/ExpenseForm";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { formatMoney } from "@/domain/invoice";
import { Receipt } from "lucide-react";

function parseCharges(raw: string | null): { name: string; amountMinor: number }[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? (v as { name: string; amountMinor: number }[]) : [];
  } catch {
    return [];
  }
}

export default async function ExpensesPage() {
  let ownerId = "";
  try { ownerId = (await requireActor()).ownerId; } catch { redirect("/login"); }
  const [expenses, rates] = await Promise.all([
    safeFindMany(() => prisma.expense.findMany({ where: { ownerId }, orderBy: { date: "desc" }, take: 200 }), []),
    listRates(),
  ]);

  const byCurrency = new Map<string, number>();
  let billable = 0;
  for (const e of expenses) {
    const cur = "MAD";
    byCurrency.set(cur, (byCurrency.get(cur) ?? 0) + e.totalMinor);
    if (e.billable) billable += 1;
  }
  const total = [...byCurrency.entries()].map(([c, v]) => formatMoney(v, c)).join(" · ") || formatMoney(0, "MAD");

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track what the company spends. Add your own charges/rates and mark expenses as billable."
        actions={
          <div className="flex gap-2">
            <InvoiceFromBillable />
            <a href="/api/exports/expenses" className="btn-outline btn-sm">CSV</a>
          </div>
        }
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <StatCard tone="warning" icon={<Receipt size={20} />} label="Total expenses" value={total} sub={`${expenses.length} record${expenses.length === 1 ? "" : "s"}`} />
        <StatCard tone="neutral" label="Billable" value={String(billable)} sub="can be re-invoiced to a client" />
      </div>

      <div className="card mb-4 p-5">
        <h2 className="section-title mb-3">Record an expense</h2>
        <ExpenseForm rates={JSON.parse(JSON.stringify(rates))} />
      </div>

      {expenses.length === 0 ? (
        <EmptyState title="No expenses yet" body="Record rent, utilities, supplies, salaries and other costs to see your real net." />
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th className="num">HT</th><th className="num">Charges</th><th className="num">Total</th><th></th></tr></thead>
            <tbody>
              {expenses.map((e) => {
                const charges = parseCharges(e.charges);
                const chargesTotal = charges.reduce((a, c) => a + c.amountMinor, 0);
                return (
                  <tr key={e.id}>
                    <td className="tabular-nums text-ink-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="font-medium">{e.description}{e.supplier ? <span className="meta block">{e.supplier}</span> : null}</td>
                    <td className="text-ink-500">{e.category ?? "—"}</td>
                    <td className="num tabular-nums">{formatMoney(e.amountHTMinor, "MAD")}</td>
                    <td className="num tabular-nums text-ink-500">{chargesTotal ? formatMoney(chargesTotal, "MAD") : "—"}</td>
                    <td className="num font-medium tabular-nums">{formatMoney(e.totalMinor, "MAD")}</td>
                    <td className="text-right"><ExpenseRowDelete id={e.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
