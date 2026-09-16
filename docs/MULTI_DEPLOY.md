# Multi-business deployment (one instance per business)

This platform is designed to be deployed **once per business**. Each business gets
its own container, domain, database and secrets, so nothing is shared.

## What is isolated automatically

| Concern | Isolation |
|---|---|
| Login / owner account | Per deployment (`ALLOW_MULTIUSER` unset = exactly one owner) |
| Invoices, clients, companies, products, payments, reports | Scoped to the owner in the database |
| Email connection (SMTP) | Stored per owner, encrypted at rest (AES-256-GCM) |
| WhatsApp session | One linked device per deployment, stored in that deployment's `/app/data` volume |
| Database | Its own SQLite file in `/app/data/app.db` |
| Secrets | Unique `JWT_SECRET`, `CRON_SECRET`, `EMAIL_ENCRYPTION_KEY` per deployment |

Because WhatsApp is a single session per deployment, **each business scans its own
QR with its own phone**. No business can see or affect another's WhatsApp.

## Provisioning a new business (Dokploy)

1. **Clone the application** in Dokploy (duplicate the `invoice-platform` app, or
   create a new app pointing at the same Git repo/branch).
2. **New domain** — e.g. `invoice.clientname.com`, pointed at the new app.
3. **New volume** — keep the default `/app/data` volume for this app only.
   Never mount two apps onto the same volume: that would share the database and
   the WhatsApp session.
4. **Unique environment variables** (generate fresh values per business):
   ```
   DATABASE_URL="file:/app/data/app.db"
   JWT_SECRET="<random 48+ chars>"
   CRON_SECRET="<random 32+ chars>"
   EMAIL_ENCRYPTION_KEY="<random 64 hex chars>"
   NEXT_PUBLIC_APP_URL="https://invoice.clientname.com"
   PORT="3007"
   NODE_ENV="production"
   SCHEDULER_ENABLED="true"
   SCHEDULER_INTERVAL_MS="300000"
   ```
   Do **not** reuse secrets between businesses.
5. **Deploy.** On first start the container runs migrations and the automation
   worker starts (it needs `CRON_SECRET`).

## Onboarding the business owner

1. Open the domain → **Create the owner account** (registration is single-owner,
   so this can only be done once per deployment).
2. **Companies** → add the business identity (ICE, IF, RC, patente, bank, logo,
   signature, prefixes).
3. **Settings → Email** → connect the business mailbox (app password for
   Gmail/Outlook) and send a test.
4. **Settings → WhatsApp** → Connect, scan the QR with the business's phone.
5. **Settings → Automation** → confirm, optionally run once.
6. Add clients/products, then issue the first invoice.

## Security checklist per deployment

- HTTPS only (Dokploy/Traefik handles certificates).
- Restrict SSH/Dokploy access to the operator.
- Back up `/app/data` (contains the database and the WhatsApp session). Keep
  backups encrypted.
- If a phone or session is ever compromised: **Settings → WhatsApp → Reset
  session**, and unlink the device from the phone.
- Revoke and re-enter the email app password if it leaks.

## When NOT to use this model

If you ever want a single shared server for many businesses (SaaS), WhatsApp must
first be made per-owner (separate session/QR/status per business) — the current
code shares one WhatsApp session per server process. Until that change is made,
use one deployment per business.
