/**
 * Reporting engine — server-only (not a "use server" module).
 * All totals are computed from ISSUED invoices (cancelled excluded from revenue).
 * Money is integer minor units; never mix currencies in one figure.
 */
import { prisma } from "@/lib/prisma";
import { divRoundHalfUp } from "@/domain/invoice";
import { expenseVat } from "@/domain/charges";
import { parseJsonArray, safeJsonParse } from "@/lib/safe";
import { minorToPlain, toCsv } from "@/lib/csv";

export interface ReportFilters {
  companyId?: string;
  from?: Date;
  to?: Date;
}

interface InvoiceRow {
  id: string;
  status: string;
  currency: string;
  totalTTC: number;
  issueDate: Date;
  dueDate: Date | null;
  taxBreakdown: string | null;
  linesSnapshot: string | null;
  clientId: string | null;
  client: { companyName: string | null; name: string } | null;
  buyerSnapshot: string | null;
  payments: { amountMinor: number }[];
}

function paidOf(inv: { payments: { amountMinor: number }[] }): number {
  return inv.payments.reduce((a, p) => a + p.amountMinor, 0);
}

export interface CurrencySummary {
  currency: string;
  invoiced: number;
  collected: number;
  outstanding: number;
  overdue: number;
  count: number;
}

export interface TaxSummaryRow {
  currency: string;
  rateBps: number;
  taxable: number;
  tax: number;
}

export interface AgingRow {
  currency: string;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90plus: number;
  total: number;
}

export interface ClientSummaryRow {
  clientId: string;
  name: string;
  currency: string;
  invoiced: number;
  collected: number;
  outstanding: number;
}

export interface ProductSummaryRow {
  description: string;
  currency: string;
  quantityMilli: number;
  netHT: number;
}

export interface ReportData {
  currency: CurrencySummary[];
  tax: TaxSummaryRow[];
  aging: AgingRow[];
  byClient: ClientSummaryRow[];
  byProduct: ProductSummaryRow[];
  invoiceCount: number;
}

export async function buildReports(ownerId: string, filters: ReportFilters = {}): Promise<ReportData> {
  const where: Record<string, unknown> = { ownerId, status: "ISSUED" };
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.from || filters.to) {
    where.issueDate = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  const invoices = (await prisma.invoice.findMany({
    where: where as never,
    include: { payments: true, client: true },
    orderBy: { issueDate: "asc" },
  })) as unknown as InvoiceRow[];

  const now = new Date();
  const currencyMap = new Map<string, CurrencySummary>();
  const taxMap = new Map<string, TaxSummaryRow>();
  const agingMap = new Map<string, AgingRow>();
  const clientMap = new Map<string, ClientSummaryRow>();
  const productMap = new Map<string, ProductSummaryRow>();

  const ensureCurrency = (c: string) => {
    let row = currencyMap.get(c);
    if (!row) {
      row = { currency: c, invoiced: 0, collected: 0, outstanding: 0, overdue: 0, count: 0 };
      currencyMap.set(c, row);
    }
    return row;
  };
  const ensureAging = (c: string) => {
    let row = agingMap.get(c);
    if (!row) {
      row = { currency: c, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
      agingMap.set(c, row);
    }
    return row;
  };

  for (const inv of invoices) {
    const paid = paidOf(inv);
    const remaining = inv.totalTTC - paid;
    const cs = ensureCurrency(inv.currency);
    cs.invoiced += inv.totalTTC;
    cs.collected += paid;
    cs.outstanding += Math.max(0, remaining);
    cs.count += 1;

    if (remaining > 0 && inv.dueDate && inv.dueDate < now) {
      cs.overdue += remaining;
      const days = Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000);
      const ag = ensureAging(inv.currency);
      if (days <= 30) ag.d1_30 += remaining;
      else if (days <= 60) ag.d31_60 += remaining;
      else if (days <= 90) ag.d61_90 += remaining;
      else ag.d90plus += remaining;
      ag.total += remaining;
    } else if (remaining > 0) {
      const ag = ensureAging(inv.currency);
      ag.current += remaining;
      ag.total += remaining;
    }

    for (const b of parseJsonArray<{ rateBps: number; taxable: number; tax: number }>(inv.taxBreakdown)) {
      const key = `${inv.currency}:${b.rateBps}`;
      const row = taxMap.get(key) ?? { currency: inv.currency, rateBps: b.rateBps, taxable: 0, tax: 0 };
      row.taxable += b.taxable;
      row.tax += b.tax;
      taxMap.set(key, row);
    }

    const name = inv.client?.companyName || inv.client?.name || buyerName(inv.buyerSnapshot) || "—";
    const ckey = `${inv.clientId ?? name}:${inv.currency}`;
    const crow = clientMap.get(ckey) ?? { clientId: inv.clientId ?? name, name, currency: inv.currency, invoiced: 0, collected: 0, outstanding: 0 };
    crow.invoiced += inv.totalTTC;
    crow.collected += paid;
    crow.outstanding += Math.max(0, remaining);
    clientMap.set(ckey, crow);

    for (const l of parseJsonArray<{ description: string; quantityMilli: number; unitPriceMinor: number; discountBps: number }>(inv.linesSnapshot)) {
      const gross = divRoundHalfUp(l.quantityMilli * l.unitPriceMinor, 1000);
      const net = gross - divRoundHalfUp(gross * l.discountBps, 10000);
      const pkey = `${l.description}:${inv.currency}`;
      const prow = productMap.get(pkey) ?? { description: l.description, currency: inv.currency, quantityMilli: 0, netHT: 0 };
      prow.quantityMilli += l.quantityMilli;
      prow.netHT += net;
      productMap.set(pkey, prow);
    }
  }

  const byNet = <T extends { netHT?: number; invoiced?: number }>(a: T, b: T) => (b.netHT ?? b.invoiced ?? 0) - (a.netHT ?? a.invoiced ?? 0);

  return {
    currency: [...currencyMap.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    tax: [...taxMap.values()].sort((a, b) => a.currency.localeCompare(b.currency) || a.rateBps - b.rateBps),
    aging: [...agingMap.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    byClient: [...clientMap.values()].sort(byNet),
    byProduct: [...productMap.values()].sort(byNet),
    invoiceCount: invoices.length,
  };
}

function buyerName(snapshot: string | null): string {
  const b = safeJsonParse<{ companyName?: string; name?: string }>(snapshot, {});
  return b.companyName || b.name || "";
}

/** Flat CSV of the report (all sections), semicolon-separated for Excel/FR. */
export interface PnLRow {
  currency: string;
  revenueHT: number;
  vatCollected: number;
  expensesHT: number;
  expenseCharges: number;
  vatDeductible: number;
  payrollCost: number;
  netProfit: number;
  vatDue: number;
}

/**
 * Profit & Loss + VAT, per currency.
 * Revenue (HT + TVA) comes from issued invoices; costs (expenses + payroll)
 * are held in the company's base currency.
 */
export async function buildProfitAndLoss(
  ownerId: string,
  opts: { from?: Date; to?: Date; companyId?: string; baseCurrency?: string } = {}
): Promise<PnLRow[]> {
  const { from, to, companyId, baseCurrency = "MAD" } = opts;
  const range = from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;

  const invoices = await prisma.invoice.findMany({
    where: { ownerId, status: "ISSUED", ...(companyId ? { companyId } : {}), ...(range ? { issueDate: range } : {}) },
    select: { currency: true, taxBreakdown: true },
  });
  const expenses = await prisma.expense.findMany({
    where: { ownerId, ...(range ? { date: range } : {}) },
    select: { amountHTMinor: true, taxRateBps: true, taxExempt: true, totalMinor: true, currency: true },
  });
  const payslips = await prisma.payslip.findMany({ where: { ownerId }, select: { period: true, employerCostMinor: true, currency: true } });

  const rows = new Map<string, PnLRow>();
  const ensure = (c: string): PnLRow => {
    let row = rows.get(c);
    if (!row) {
      row = { currency: c, revenueHT: 0, vatCollected: 0, expensesHT: 0, expenseCharges: 0, vatDeductible: 0, payrollCost: 0, netProfit: 0, vatDue: 0 };
      rows.set(c, row);
    }
    return row;
  };

  for (const inv of invoices) {
    const row = ensure(inv.currency);
    for (const b of parseJsonArray<{ taxable: number; tax: number }>(inv.taxBreakdown)) {
      row.revenueHT += b.taxable;
      row.vatCollected += b.tax;
    }
  }

  const base = ensure(baseCurrency);
  void base;
  for (const e of expenses) {
    const row = ensure(e.currency);
    const vat = expenseVat(e.amountHTMinor, e.taxRateBps, e.taxExempt);
    const charges = Math.max(0, e.totalMinor - e.amountHTMinor - vat);
    row.expensesHT += e.amountHTMinor;
    row.expenseCharges += charges;
    row.vatDeductible += vat;
  }
  const inRange = (period: string) => {
    if (!from && !to) return true;
    const p = `${period}-01`;
    if (from && p < from.toISOString().slice(0, 10)) return false;
    if (to && p > to.toISOString().slice(0, 10)) return false;
    return true;
  };
  for (const p of payslips) if (inRange(p.period)) ensure(p.currency).payrollCost += p.employerCostMinor;

  for (const row of rows.values()) {
    row.netProfit = row.revenueHT - row.expensesHT - row.expenseCharges - row.payrollCost;
    row.vatDue = row.vatCollected - row.vatDeductible;
  }
  return [...rows.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export interface DashboardCharts {
  monthly: { label: string; incomeMinor: number; expenseMinor: number }[];
  expensesByCategory: { label: string; valueMinor: number }[];
  incomeByClient: { label: string; valueMinor: number }[];
}

/**
 * Dashboard chart data for one company/currency:
 * money in (payments received) vs money out (expenses + payroll) over 6 months,
 * expenses by category, and revenue by client.
 */
export async function buildDashboardCharts(
  ownerId: string,
  opts: { companyId?: string; currency: string }
): Promise<DashboardCharts> {
  const { companyId, currency } = opts;
  const now = new Date();
  const months: { key: string; label: string; start: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleString("en", { month: "short" }), start: d });
  }
  const since = months[0]!.start;

  const [payments, expenses, payslips, invoices] = await Promise.all([
    prisma.payment.findMany({
      where: { invoice: { ownerId, currency, ...(companyId ? { companyId } : {}) }, paymentDate: { gte: since } },
      select: { amountMinor: true, paymentDate: true },
    }),
    prisma.expense.findMany({
      where: { ownerId, currency, date: { gte: since } },
      select: { totalMinor: true, date: true, category: true },
    }),
    prisma.payslip.findMany({ where: { ownerId, currency }, select: { period: true, employerCostMinor: true } }),
    prisma.invoice.findMany({
      where: { ownerId, status: "ISSUED", currency, ...(companyId ? { companyId } : {}) },
      select: { subtotalHT: true, client: { select: { name: true, companyName: true } } },
    }),
  ]);

  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  const monthly = months.map((m) => ({ label: m.label, incomeMinor: 0, expenseMinor: 0 }));
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  for (const p of payments) {
    const i = monthIndex.get(monthKey(p.paymentDate));
    if (i != null) monthly[i]!.incomeMinor += p.amountMinor;
  }
  for (const e of expenses) {
    const i = monthIndex.get(monthKey(e.date));
    if (i != null) monthly[i]!.expenseMinor += e.totalMinor;
  }
  for (const p of payslips) {
    const i = monthIndex.get(p.period);
    if (i != null) monthly[i]!.expenseMinor += p.employerCostMinor;
  }

  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category?.trim() || "Uncategorized";
    byCategory.set(key, (byCategory.get(key) ?? 0) + e.totalMinor);
  }
  const expensesByCategory = [...byCategory.entries()]
    .map(([label, valueMinor]) => ({ label, valueMinor }))
    .sort((a, b) => b.valueMinor - a.valueMinor)
    .slice(0, 6);

  const byClient = new Map<string, number>();
  for (const inv of invoices) {
    const key = inv.client?.companyName || inv.client?.name || "—";
    byClient.set(key, (byClient.get(key) ?? 0) + inv.subtotalHT);
  }
  const incomeByClient = [...byClient.entries()]
    .map(([label, valueMinor]) => ({ label, valueMinor }))
    .sort((a, b) => b.valueMinor - a.valueMinor)
    .slice(0, 5);

  return { monthly, expensesByCategory, incomeByClient };
}

export function reportsToCsv(data: ReportData): string {
  const rows: unknown[][] = [];
  for (const c of data.currency) rows.push(["summary", c.currency, c.count + " invoices", minorToPlain(c.invoiced), minorToPlain(c.collected), minorToPlain(c.outstanding)]);
  for (const t of data.tax) rows.push(["tax", t.currency, `TVA ${t.rateBps / 100}%`, minorToPlain(t.taxable), minorToPlain(t.tax), ""]);
  for (const a of data.aging) rows.push(["aging", a.currency, "receivables", "", "", minorToPlain(a.total)]);
  for (const cl of data.byClient) rows.push(["client", cl.currency, cl.name, minorToPlain(cl.invoiced), minorToPlain(cl.collected), minorToPlain(cl.outstanding)]);
  for (const p of data.byProduct) rows.push(["product", p.currency, p.description, minorToPlain(p.netHT), "", ""]);
  return toCsv(rows, ["section", "currency", "key", "invoiced_or_taxable", "collected_or_tax", "outstanding"]);
}
