# Invoice Platform — v1 (real invoicing, not CRUD demo)

Fresh project at `50_100/invoice-platform`. Stack: Next.js 14 + React 18 + Prisma SQLite + Zod + @react-pdf/renderer.

> **Why Next 14 + React 18, not 16?** `@react-pdf/renderer@3` declares `peer react ^16||^17||^18`
> — installing under React 19 fails with ERESOLVE (verified). Next 15 needs React 19.
> So v1 pins Next 14.2 + React 18.3 for a working PDF pipeline. Upgrade path: `@react-pdf` v4
> (React 19) or replace PDF with pdf-lib/puppeteer, then bump Next. No business logic depends on the Next version.

## Why this isn't a naive invoice CRUD
See `docs/REALITY_CHECK.md` (Stripe/Zoho/Invoice Ninja references) + `docs/DOMAIN.md`.

- Persisted `DRAFT|ISSUED|CANCELLED`; derived `SENT/VIEWED/PARTIAL/PAID/OVERDUE`
- Drafts have NO number; finalize allocates `PREFIX-YYYY-NNNN` atomically per company+year (`NumberingSeries`)
- Issued = immutable; correction = cancel + duplicate-to-draft (credit-note ledger = V2)
- Seller/buyer/lines snapshots frozen at finalize — history never mutates
- Partial payments via `Payment` model; overpay blocked; totals derived
- HT-explicit, per-line TVA (0/7/10/14/20 + exempt), line + invoice discounts, deterministic order, integer minor units, half-up
- One ISO4217 currency per invoice; dashboard grouped per currency
- Shared `calcInvoice()` feeds web preview + PDF — they can never disagree
- Public link = high-entropy `publicToken`, revokable (null it), view logged in `InvoiceEvent`
- Only DRAFT deletable; company with invoices can't be hard-deleted (SetNull + archive)

## Run
```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run test   # 8 domain tests
npm run dev    # :3001
```
