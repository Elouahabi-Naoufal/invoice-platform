# Invoice Platform — Reality Check (Stripe / Zoho / Invoice Ninja / Odoo as reference)

Target: **v1 = minimal, but correct real-world domain model.** 10 well-designed features > 30 superficial ones.

## What real systems do that naive CRUD misses

1. **Lifecycle:** `draft → issued(open) → paid`, with `void/cancelled/uncollectible` as terminal persisted states.
   `sent/viewed/partially-paid/overdue` are **derived** from `sentAt/viewedAt/payments/dueDate`, not stored as status.
   Stripe: `draft/open/paid/void/uncollectible`, immutable after finalize, number assigned at finalize.
2. **Numbering:** drafts consume NO number. Finalize allocates atomically per series. Never reuse, never renumber.
   Invoice Ninja: per-entity counters, optional shared invoice/credit counter (legal in FR/BE/DE).
3. **Immutability:** issued invoice = legal document. No edit of seller/buyer/number/lines/amounts. Correction = cancel/void + credit note / replacement draft.
4. **Snapshots:** finalize copies seller + buyer + company legal data into invoice. Later profile edits must not mutate history.
5. **Payments:** partial payments are normal. `Payment(invoiceId, amountMinor, date, method, ref)` → derive `paid/remaining/status`.
6. **Tax:** per-line rate (0/7/10/14/20 + exempt), HT-explicit prices. Discount before tax. Zoho: line vs transaction discount, tax-inclusive vs exclusive setting.
7. **PDF = presentation, not logic.** Shared calculator feeds both web preview and PDF.

## Classification

### MUST HAVE V1
- Persisted status: `DRAFT | ISSUED | CANCELLED` (+ `VOID` aliased to CANCELLED with reason). Derived: `SENT, VIEWED, PARTIAL, PAID, OVERDUE`.
- Timestamps: `issueDate, dueDate, finalizedAt, sentAt, viewedAt, cancelledAt, createdAt, updatedAt` — distinct concepts.
- `Payment` model (amountMinor, currency mirror, paymentDate, method CASH/BANK_TRANSFER/CARD/CHECK/OTHER, reference, notes). Derive paid/remaining.
- Snapshot fields on Invoice: `sellerSnapshot JSON, buyerSnapshot JSON` (+ `sellerCompanyId, buyerClientId` as nullable FK with `SetNull` — history survives deletion).
- Numbering: `NumberingSeries(companyId, prefix, year, lastNo)` atomic transaction. Format `PREFIX-YYYY-NNNN`. Drafts: `invoiceNumber=null`.
- Immutability guard in application layer: only DRAFT editable; ISSUED allows send/view/pay/cancel/duplicate only.
- Lines: `description, quantity (milli-units int), unit (piece/hour/day/kg/service), unitPriceMinor HT, discountPctBps, taxRateBps, taxExempt bool`.
- Calc order (documented in code): `gross → line discount → subtotalHT → invoice discount (pct then fixed) → taxable per rate → TVA per rate (rounded per line-group) → TTC`. Integer minor units, half-up.
- Single `currency ISO4217` per invoice (MAD/EUR/USD/GBP...). Never `DH/€` stored. Company/client have defaultCurrency, invoice currency authoritative.
- Seller Morocco-first: `legalName*, tradeName, address*, city, phone, email, ICE, IF, RC, patente, bankName, accountHolder, rib, iban, swift` — only legalName+address required, rest optional/configurable.
- Public share: `publicToken` high-entropy (nanoid 32), nullable, rotatable/revokable, access log via InvoiceEvent(viewed).
- Shared calculator `calcInvoice()` used by preview + PDF + API. Tests for rounding.
- `InvoiceEvent(type, actorId?, metadata, createdAt)` for created/finalized/sent/viewed/payment/cancelled/duplicated.
- Delete rule: only DRAFT deletable. ISSUED/CANCELLED → cancel, never hard-delete. Company with invoices → block or soft-archive.
- Duplicate → new DRAFT, copied lines/terms/notes, new ID, no number, fresh dates.
- Dashboard per-currency: invoiced / paid / outstanding / overdue grouped by currency. Never sum mixed currencies.
- One professional PDF template, multi-page safe, page numbers, tax breakdown, legal footer.

### SHOULD HAVE V1 (small, high value)
- Invoice-level discount (pct + fixed minor), payment terms enum (ON_RECEIPT/7/15/30/60/CUSTOM) deriving dueDate.
- References: `poNumber, clientRef, projectRef`.
- `invoiceLocale` per invoice (`fr` default, `en`), app locale independent. RTL-ready structure, AR later.
- Email send log: `to, cc, subject, message, sentAt, providerId`; sensible defaults; don't mark SENT on provider failure.
- Unit free-text + qty decimals via milli-units.

### V2
- Product/service library, quotes/devis, recurring, full credit-note ledger (negative invoice linked to original, shared counter option), reminders automation, online payment gateway, multi-user roles/approvals, email templates configurable, multiple PDF templates, accounting export (CSV/Factur-X), expiry on public links.

### OUT OF SCOPE
- Stock, payroll, full general ledger, government e-invoicing clearance, multi-currency lines in one invoice.
