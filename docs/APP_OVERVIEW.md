# Invora — Application Overview (context for ChatGPT)

## 1. What it is
Invora is a self-hosted **invoicing and finance web app for Moroccan businesses**, built by **Orbit Labs**. One owner account manages one or more **companies** (legal entities). It handles invoices, quotes, credit notes, payments, recurring invoices, payment reminders, reports and exports. Documents are sent to clients over **WhatsApp only** (no email). It follows Moroccan rules: ICE, IF, RC, patente, TVA, and the mandatory mentions of article 145 CGI.

## 2. Tech stack
- Next.js 14 (App Router) + React 18 + TypeScript
- Prisma ORM + SQLite (single file `app.db`)
- Tailwind CSS (Inter font, minimal radii)
- `@react-pdf/renderer` for invoice PDFs
- `whatsapp-web.js` + Chromium for WhatsApp sending (QR-linked session)
- `jose` (JWT sessions) + `bcryptjs` (passwords)
- Vitest for tests
- Docker image deployed per business (own container, domain, database, WhatsApp session)

## 3. Core concepts and rules
- **Owner account:** exactly one per deployment. Can invite **team members** with roles `OWNER | ADMIN | VIEWER`.
- **Company (legal entity):** legal identity (name, trade name, legal form, capital, address), Moroccan identifiers (ICE, IF, RC + city, patente, CNSS), tax regime (`COMMUN | AE_HORS_CHAMP | EXONERE_ART92`), bank details (RIB/IBAN/SWIFT), logo, signature, accent color, numbering prefixes (`FAC`, `AV`, `DEV`), default currency and TVA.
- **Client:** `PERSON` or `COMPANY`; contact, address, ICE/IF/RC, `isAssujetti` (B2B/B2C), default currency, phone (used for WhatsApp).
- **Document types:** `FACTURE` (invoice), `DEVIS` (quote), `AVOIR` (credit note), `RECTIFICATIVE` (corrected invoice).
- **Lifecycle:** persisted `DRAFT → ISSUED → CANCELLED`; derived display statuses `SENT / VIEWED / PARTIALLY_PAID / PAID / OVERDUE`.
- **Numbering:** allocated atomically at finalization, per company + prefix + year (`FAC-2026-0001`). Gapless, never reused. `AVOIR` and `DEVIS` have their own series. Drafts have no number.
- **Immutability & snapshots:** once ISSUED, an invoice cannot be edited. Seller, buyer and lines are frozen as JSON snapshots; logo/signature are embedded as bytes, so later profile changes never alter history.
- **Payments:** partial payments allowed; overpayment blocked; `remaining = totalTTC − paid`.
- **Money:** integer minor units (centimes), prices entered HT, per-line TVA rates (0/7/10/14/20 + exempt), line and invoice-level discounts (percentage + fixed).
- **Sending:** WhatsApp only. The owner links their phone once via QR; invoices are sent as PDF documents with a configurable message template and public link.
- **Automation:** recurring invoices auto-generate and reminders auto-send on schedule, via a background worker.
- **Public links:** each issued invoice has a high-entropy public token (view/PDF, revocable and expirable); each client can have a private portal token.

## 4. Public pages (no login)
| Route | What it contains |
|---|---|
| `/home` | Public landing: Invora logo/name, tagline, feature grid (invoices, payments, WhatsApp sending, reports, multi-company, Morocco-ready), Sign in / Create account buttons, footer. |
| `/privacy` | Privacy policy (Orbit Labs; data collected, use, retention 10 years, security, rights, cookies). |
| `/terms` | Terms of service (acceptance, service, accounts, acceptable use, data, third-party WhatsApp, liability, Moroccan law). |
| `/login` | Sign-in form (email, password) with brand mark, link to register, footer links. |
| `/login/register` | Create the single owner account (display name, email, password ≥ 8). |
| `/invite/[token]` | Accept a team invite: shows the organization and role, lets the invitee set a name + password and create their login. |
| `/i/[token]` | Public invoice view: number, total/paid/remaining, Download PDF, WhatsApp share button. Logs a "viewed" event. |
| `/portal/client/[token]` | Private per-client portal: lists only that client's shared issued invoices with links to view the PDF. |

## 5. Authenticated pages (app)
| Route | What it contains |
|---|---|
| `/` | **Dashboard**: greeting, active company; metrics (Outstanding per currency, Collected this month per currency, count of open/overdue); recent invoices table; quick "New invoice". |
| `/invoices` | Invoice list for the active company: search (number/notes/PO), date range, type filters (FACTURE/DEVIS/AVOIR/RECTIFICATIVE), status filters (DRAFT/ISSUED/CANCELLED); table (number, client, issued, due, amount, balance, status); pagination. |
| `/invoices/new` | Invoice builder (multi-step): seller company, client (search/create), doc type, dates, terms, currency, payment mode, PO, notes, discount % and fixed discount, line items (description, qty, unit, unit price HT, discount, TVA, exempt), catalog picker, live PDF preview; Save draft. Supports `?linked=<id>` (credit note / rectificative) and `?edit=<id>`. |
| `/invoices/[id]` | Invoice detail: header (number, status, type), actions, full invoice preview (HTML), payment summary + payment history, tax breakdown, activity timeline. |
| `/reports` | Reports for a company and date range: revenue summary per currency (invoiced/collected/outstanding/overdue), TVA summary per rate, aged receivables (current/1–30/31–60/61–90/90+), revenue by client, revenue by product; Download CSV. |
| `/clients` | Client list + create/edit form (type, name, company, email, phone, address, city, ICE, IF, RC, assujetti, currency, notes). |
| `/companies` | Company cards (logo, name, city, currency, ICE) + full create/edit form: identity, legal identifiers, contact, invoice defaults (prefixes, currency, TVA, accent), bank, logo/signature upload. |
| `/products` | Product/service catalog: list + form (name, description, unit, unit price HT, TVA, exempt, optional company); used to fill invoice lines. |
| `/recurring` | Recurring invoice templates: name, company, client, doc type, currency, terms, period (days), start date, lines, auto-send channel (None/WhatsApp); table shows next run, last generated, status, errors; actions: Pause/Activate, Generate now. |
| `/relances` | Reminders: schedule a WhatsApp reminder on an issued invoice (type, date); overdue invoices list; scheduled reminders table with status (Sent/Pending/Failed) and actions (Send now, delete). |
| `/lettrage` | Credit-note reconciliation: link an AVOIR to an issued invoice with an amount; list of reconciliations; remove. |
| `/portal` | Client portal management: per-client private portal link (generate/copy/revoke), and a table of issued invoices with a "Shared in portal" toggle. |
| `/exports` | Exports hub: accounting CSV (date range) and UBL e-invoice links, plus explanation. |
| `/members` | Team: invite by email + role (VIEWER read-only / ADMIN manage); table of members (email, role, invited, status, invite link); revoke. |
| `/settings` | **Settings hub** with tabs (General, WhatsApp, Security, Automation, Data): account (display name), sending-channel status, cards linking to each section. |
| `/settings/whatsapp` | WhatsApp: connection status, QR pairing, Connect/Disconnect/Reset session, and the message template with validated placeholders. |
| `/settings/security` | Change password (min 8; login is rate-limited). |
| `/settings/automation` | Explains the background worker; "Run automation now" button; configuration notes (`CRON_SECRET`, `SCHEDULER_ENABLED`, `SCHEDULER_INTERVAL_MS`). |
| `/settings/data` | Data & backup: export links (invoices CSV, reports CSV), archiving (10 years), numbering rules. |

## 6. API endpoints (route handlers)
| Method + route | Purpose |
|---|---|
| `GET /api/cron` | Secret-protected trigger for recurring generation + due reminders (also run by the in-app worker). |
| `GET /api/exports/csv` | Invoices CSV (date range). |
| `GET /api/exports/reports` | Reports CSV (company + date range). |
| `GET /api/invoices/[id]/pdf` | Authenticated owner-only invoice PDF. |
| `GET /api/i/[token]/pdf` | Public token-scoped invoice PDF (ISSUED, not expired). |
| `GET /api/invoices/[id]/ubl` | EN 16931 / UBL 2.1 XML export. |
| `POST /api/invoices/[id]/send-whatsapp` | Send the invoice PDF over WhatsApp. |
| `GET /api/whatsapp/status` | Connection phase, QR, account. |
| `POST /api/whatsapp/connect` / `disconnect` / `reset` | Manage the linked WhatsApp session. |
| `GET`/`PUT /api/whatsapp/settings` | Per-company enable flag + message template. |
| `GET /api/uploads/[...path]` | Serves uploaded logos/signatures (authenticated). |

## 7. Data model (Prisma)
- **User** — owner account (email, passwordHash, displayName).
- **Company** — seller profile + Moroccan identifiers + bank + logo/signature + prefixes + accent + taxRegime.
- **NumberingSeries** — per company/prefix/year counter.
- **Client** — buyer (person/company, ICE/IF/RC, phone, currency, portalToken).
- **Invoice** — status, docType, linkedInvoiceId, dates, snapshots (seller/buyer/lines), totals, taxBreakdown, publicToken (+ expiry), portalShared, WhatsApp status fields, sentAt/viewedAt/finalizedAt/cancelledAt.
- **InvoiceLine** — description, quantityMilli, unit, unitPriceMinor, discountBps, taxRateBps, taxExempt.
- **Payment** — amountMinor, currency, date, method, reference.
- **InvoiceEvent** — activity log (created/finalized/sent/viewed/payment/paid/cancelled/duplicated/reminder_sent/whatsapp_sent/whatsapp_failed).
- **Product** — catalog item.
- **RecurringTemplate** — schedule (periodDays, startDate, nextRunAt), lines JSON, autoSend, sendChannel, lastGeneratedInvoiceId, lastError.
- **Reminder** — invoice, type, channel (WHATSAPP), scheduledAt, sentAt, attempts, lastError.
- **Member** — team member (ownerId, userId, email, role, inviteToken, acceptedAt, revokedAt).
- **AvoirInvoice** — credit-note reconciliation (avoirId, invoiceId, amountMinor).

## 8. Roles & permissions
- `OWNER`: full control.
- `ADMIN`: manage invoices and data (no member management).
- `VIEWER`: read-only; write actions are rejected server-side.
Members act on the owner's data (resolved via `Member.ownerId`).

## 9. Automation
A background worker in the container calls `/api/cron` every few minutes. It:
1. **Recurring invoices:** generates and finalizes invoices for templates whose `nextRunAt` is due, advances the schedule, and optionally sends them over WhatsApp.
2. **Reminders:** sends due WhatsApp reminders and marks them Sent/Failed.
Enabled when `CRON_SECRET` is set.

## 10. Exports & compliance
- **PDF:** A4, multi-page, logo/signature, seller/buyer legal identifiers, per-line TVA, tax breakdown, amount in words, legal footer.
- **UBL 2.1 (EN 16931):** correct type codes (380/381/384), line extension amounts, TaxTotal/TaxSubtotal, LegalMonetaryTotal.
- **CSV:** invoices and reports for accounting.
- Retention: 10 years (art. 211 CGI).

## 11. Environment variables
`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `PORT`, `NODE_ENV`, `CRON_SECRET`, `SCHEDULER_ENABLED`, `SCHEDULER_INTERVAL_MS`, `WHATSAPP_SESSION_DIR`, `WHATSAPP_CLIENT_ID`, `WHATSAPP_CHROME_PATH`, `WHATSAPP_HEADLESS`, `WHATSAPP_READY_TIMEOUT_MS`.

## 12. Deployment model
One deployment per business (own container, domain, database, secrets and WhatsApp session). Team members are invited inside a single business; separate businesses get separate deployments.
