# Roadmap / TODO

Living list of what's next. Done items move to the app overview.

## Fixed recently
- [x] Reminders: **-1h** display — was rendering in UTC; container now sets `TZ` (default `Africa/Casablanca`, overridable per deployment).
- [x] Reminders "do nothing": due reminders now send **immediately** on creation (not only on the 5-min worker), and the failure reason shows in the list.
- [x] Reminder reliability: a reminder can only send if WhatsApp is **enabled for that invoice's company** and the session is connected — the list now shows the exact error.

## Finance (next)
- [ ] **P&L / income statement** — income (invoiced + collected) minus expenses minus payroll cost, per period and per company.
- [ ] **VAT report** — TVA **collectée** (sales, from invoices) − TVA **déductible** (expenses + payroll where applicable) = TVA to pay, per period.
- [ ] **Money accounts / bank ledger** — define accounts (bank, cash), record money in/out, show balances, and link entries to invoices/payments/expenses (real reconciliation, replacing the current metadata-only "lettrage").
- [ ] **Contracts** — per client: agreed terms (rate, period, VAT, billing day), optionally generating recurring invoices; contract value vs invoiced to date.
- [ ] Expenses: use the company currency (currently assumed MAD), and add expense CSV export.
- [ ] Integrate expenses + payroll cost into the **Reports** page and dashboard (net, not just outstanding).
- [ ] **Billable expenses → invoice**: create a draft invoice from selected billable expenses.
- [ ] Payslips: mark as **PAID** (records an expense), and a payroll CSV export.
- [ ] Rates: allow editing (currently add/remove), and per-company visibility.

## Product / UX
- [ ] In-app reminders of what's due (notifications), separate from client reminders.
- [ ] Bulk actions on invoices (mark sent, export selection).
- [ ] Saved filters / date-range presets on lists.
- [ ] Translations (real FR/AR/EN string catalog) — currently only direction toggles.
- [ ] Public invoice page: online "mark as paid / payment instructions" block (no gateway).

## Infra / hardening
- [ ] Optional nightly DB backup to a mounted path.
- [ ] Multi-user roles already enforced; add audit view for company changes.
- [ ] E-invoicing (DGI) structured export prep.
