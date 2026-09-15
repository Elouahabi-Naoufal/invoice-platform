# WhatsApp invoice sending

Invoices can be sent as WhatsApp PDF documents using a persistent `whatsapp-web.js`
session. The flow is explicit and auditable: only `ISSUED` invoices are sendable,
provider confirmation is required before `SENT` is stored, and every attempt is
logged in `InvoiceEvent`.

## Setup

1. Install dependencies and run migrations:
   ```bash
   npm install
   npx prisma migrate dev
   ```
2. Make Chromium available to the server runtime:
   - Local development: `/usr/bin/chromium` is used automatically when present.
   - Docker: the production image installs Chromium and sets
     `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
   - Custom installs: set `WHATSAPP_CHROME_PATH`.
3. Persist the session volume in production:
   - Session files live in `WHATSAPP_SESSION_DIR` (default `./data/whatsapp`).
   - `/app/data` is already a Docker volume; do not store the session in ephemeral storage.
4. Open `/settings/whatsapp`. If you have no company yet, create one first under
   Companies — WhatsApp sending is configured per company.
5. Click **Connect**, then scan the QR code from WhatsApp → Linked devices.
6. Enable sending and save the company message template.

Relevant variables in `.env.example`:

```env
WHATSAPP_SESSION_DIR="./data/whatsapp"
WHATSAPP_CLIENT_ID="invoice-platform"
WHATSAPP_CHROME_PATH=""
WHATSAPP_HEADLESS="true"
WHATSAPP_READY_TIMEOUT_MS="120000"
```

## Sending flow

1. Open an issued invoice.
2. Click **WhatsApp PDF**.
3. Confirm or edit the recipient phone number.
4. The server:
   - validates ownership and `ISSUED` status;
   - requires WhatsApp to be enabled for the invoice company;
   - normalizes the recipient to international digits;
   - renders the message from the company template;
   - renders the same frozen-snapshot PDF used by email/public download;
   - checks that the number is registered on WhatsApp;
   - sends the PDF as a document with the rendered caption;
   - stores `SENT`, provider message ID, recipient, timestamp, and `whatsapp_sent`.

Duplicate sends are blocked: a second request for a `SENT` invoice returns
`alreadySent` without contacting WhatsApp. A fresh `SENDING` row blocks another
attempt for 10 minutes; stale `SENDING` rows can be retried.

## Message template

Placeholders:

```text
{docType} {number} {amount} {currency} {seller} {buyer} {url} {dueDate}
```

Templates are validated on save. Unknown placeholders are rejected. Rendered
messages are capped at 1000 characters.

## Status model

Invoice fields:

- `whatsappStatus`: `NOT_SENT | SENDING | SENT | FAILED`
- `whatsappSentAt`, `whatsappSentTo`, `whatsappMessageId`
- `whatsappError`, `whatsappLastAttemptAt`

Events:

- `whatsapp_sent`
- `whatsapp_failed`

Connection state is runtime state plus a persisted LocalAuth session. Settings
and invoice pages never receive session credentials; only connection phase,
account ID, QR image, and sanitized errors are exposed to authenticated users.

## Operations

- **Disconnect** closes the browser but keeps the saved session.
- **Reset session** deletes saved session files and forces a fresh QR.
- If a QR expires, wait for the next QR event; the UI polls automatically.
- If authentication fails repeatedly, reset the session and relink.
- If the process restarts, reconnect once; LocalAuth restores the session when
  its volume is intact.

## Limitations

- `whatsapp-web.js` drives WhatsApp Web through Chromium and requires a
  long-running server process with persistent storage.
- It is not the official WhatsApp Business Platform API. For high-volume or
  regulated messaging, use the official API instead.
- Delivery receipts beyond provider acceptance are not tracked in v1.
