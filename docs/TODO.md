# Roadmap / TODO

Living list of what's next. Done items move to the app overview.

## Fixed recently
- [x] Reminders: **-1h** display — was rendering in UTC; container now sets `TZ` (default `Africa/Casablanca`, overridable per deployment).
- [x] Reminders "do nothing": due reminders now send **immediately** on creation (not only on the 5-min worker), and the failure reason shows in the list.
- [x] Reminder reliability: a reminder can only send if WhatsApp is **enabled for that invoice's company** and the session is connected — the list now shows the exact error.

## Finance
- [x] **P&L / income statement** — on the Reports page (revenue HT − expenses − charges − payroll = net profit).
- [x] **VAT report** — on the Reports page (collectée − déductible = TVA due).
- [x] **Money accounts / bank ledger** — `/accounts`: define bank/cash accounts, record money in/out, live balances.
- [x] **Contracts** — `/contracts`: agreed value vs invoiced to date, with progress.
- [x] Expenses CSV export (`/api/exports/expenses`).
- [x] **Billable expenses → invoice**: one click creates draft invoice(s), grouped by company + client.
- [x] Payslips: **Mark paid** + payroll CSV export (`/api/exports/payroll`).
- [ ] Rates: allow **editing** (currently add/remove).
- [ ] Expenses: use the **company currency** (currently assumed MAD) and link VAT to the VAT report precisely.
- [ ] Put **net profit** on the Dashboard (currently only on Reports).
- [ ] Auto-create ledger entries from invoices/payments/expenses (link by id) for true reconciliation.

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
