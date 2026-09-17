-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COMPANY',
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'MA',
    "ice" TEXT,
    "clientIF" TEXT,
    "clientRC" TEXT,
    "isAssujetti" BOOLEAN NOT NULL DEFAULT true,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Client" ("address", "city", "clientIF", "clientRC", "companyName", "country", "createdAt", "defaultCurrency", "email", "ice", "id", "isAssujetti", "name", "notes", "ownerId", "phone", "type", "updatedAt") SELECT "address", "city", "clientIF", "clientRC", "companyName", "country", "createdAt", "defaultCurrency", "email", "ice", "id", "isAssujetti", "name", "notes", "ownerId", "phone", "type", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE INDEX "Client_ownerId_idx" ON "Client"("ownerId");
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT,
    "clientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "docType" TEXT NOT NULL DEFAULT 'FACTURE',
    "linkedInvoiceId" TEXT,
    "correctionReason" TEXT,
    "validUntil" DATETIME,
    "quoteStatus" TEXT,
    "convertedInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "invoiceLocale" TEXT NOT NULL DEFAULT 'fr',
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "paymentTerms" TEXT NOT NULL DEFAULT 'CUSTOM',
    "paymentMode" TEXT,
    "taxMention" TEXT,
    "amountInWords" TEXT,
    "poNumber" TEXT,
    "clientRef" TEXT,
    "projectRef" TEXT,
    "notes" TEXT,
    "footerText" TEXT,
    "invDiscountBps" INTEGER NOT NULL DEFAULT 0,
    "invDiscountFixedMinor" INTEGER NOT NULL DEFAULT 0,
    "sellerSnapshot" TEXT,
    "buyerSnapshot" TEXT,
    "linesSnapshot" TEXT,
    "subtotalHT" INTEGER NOT NULL DEFAULT 0,
    "totalTVA" INTEGER NOT NULL DEFAULT 0,
    "totalTTC" INTEGER NOT NULL DEFAULT 0,
    "taxBreakdown" TEXT,
    "publicToken" TEXT,
    "publicTokenExpiresAt" DATETIME,
    "sentAt" DATETIME,
    "sentTo" TEXT,
    "whatsappStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "whatsappSentAt" DATETIME,
    "whatsappSentTo" TEXT,
    "whatsappMessageId" TEXT,
    "whatsappError" TEXT,
    "whatsappLastAttemptAt" DATETIME,
    "viewedAt" DATETIME,
    "finalizedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_linkedInvoiceId_fkey" FOREIGN KEY ("linkedInvoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amountInWords", "buyerSnapshot", "cancelReason", "cancelledAt", "clientId", "clientRef", "companyId", "convertedInvoiceId", "correctionReason", "createdAt", "currency", "docType", "dueDate", "finalizedAt", "footerText", "id", "invDiscountBps", "invDiscountFixedMinor", "invoiceLocale", "invoiceNumber", "issueDate", "linesSnapshot", "linkedInvoiceId", "notes", "ownerId", "paymentMode", "paymentTerms", "poNumber", "projectRef", "publicToken", "publicTokenExpiresAt", "quoteStatus", "sellerSnapshot", "sentAt", "sentTo", "status", "subtotalHT", "taxBreakdown", "taxMention", "totalTTC", "totalTVA", "updatedAt", "validUntil", "viewedAt", "whatsappError", "whatsappLastAttemptAt", "whatsappMessageId", "whatsappSentAt", "whatsappSentTo", "whatsappStatus") SELECT "amountInWords", "buyerSnapshot", "cancelReason", "cancelledAt", "clientId", "clientRef", "companyId", "convertedInvoiceId", "correctionReason", "createdAt", "currency", "docType", "dueDate", "finalizedAt", "footerText", "id", "invDiscountBps", "invDiscountFixedMinor", "invoiceLocale", "invoiceNumber", "issueDate", "linesSnapshot", "linkedInvoiceId", "notes", "ownerId", "paymentMode", "paymentTerms", "poNumber", "projectRef", "publicToken", "publicTokenExpiresAt", "quoteStatus", "sellerSnapshot", "sentAt", "sentTo", "status", "subtotalHT", "taxBreakdown", "taxMention", "totalTTC", "totalTVA", "updatedAt", "validUntil", "viewedAt", "whatsappError", "whatsappLastAttemptAt", "whatsappMessageId", "whatsappSentAt", "whatsappSentTo", "whatsappStatus" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");
CREATE INDEX "Invoice_ownerId_status_idx" ON "Invoice"("ownerId", "status");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

