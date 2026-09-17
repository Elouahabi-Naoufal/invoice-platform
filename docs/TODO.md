# Roadmap / TODO

Living list of what's next. Done items move to the app overview.

## Fixed recently
- [x] Reminders: **-1h** display — was rendering in UTC; container now sets `TZ` (default `Africa/Casablanca`, overridable per deployment).
- [x] Reminders "do nothing": due reminders now send **immediately** on creation (not only on the 5-min worker), and the failure reason shows in the list.
- [x] Reminder reliability: a reminder can only send if WhatsApp is **enabled for that invoice's company** and the session is connected — the list now shows the exact error.

## Removed
- The finance module was removed on request (Expenses, Payroll, Money accounts/ledger, Contracts, P&L + VAT report, Dashboard net-profit + charts, employee↔team link). Only **Settings → Rates & charges** remains, as a standalone rate calculator.
- Removed endpoints: `/expenses`, `/payroll`, `/accounts`, `/contracts`, `/api/exports/expenses`, `/api/exports/payroll`.

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
