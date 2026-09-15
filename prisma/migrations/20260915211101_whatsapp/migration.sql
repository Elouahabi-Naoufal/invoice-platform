-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'MA',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "defaultTaxBps" INTEGER NOT NULL DEFAULT 2000,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'FAC',
    "avoirPrefix" TEXT NOT NULL DEFAULT 'AV',
    "devisPrefix" TEXT NOT NULL DEFAULT 'DEV',
    "invoiceLocale" TEXT NOT NULL DEFAULT 'fr',
    "accentColor" TEXT NOT NULL DEFAULT '#1D4ED8',
    "footerNotes" TEXT,
    "ice" TEXT,
    "identifiantFiscal" TEXT,
    "rc" TEXT,
    "rcCity" TEXT,
    "patente" TEXT,
    "legalForm" TEXT,
    "capitalSocial" INTEGER,
    "cnss" TEXT,
    "taxRegime" TEXT NOT NULL DEFAULT 'COMMUN',
    "bankName" TEXT,
    "accountHolder" TEXT,
    "rib" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "logoPath" TEXT,
    "signaturePath" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappTemplate" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("accentColor", "accountHolder", "address", "archived", "avoirPrefix", "bankName", "capitalSocial", "city", "cnss", "country", "createdAt", "defaultCurrency", "defaultTaxBps", "devisPrefix", "email", "footerNotes", "iban", "ice", "id", "identifiantFiscal", "invoiceLocale", "invoicePrefix", "legalForm", "legalName", "logoPath", "ownerId", "patente", "phone", "rc", "rcCity", "rib", "signaturePath", "swift", "taxRegime", "tradeName", "updatedAt", "website") SELECT "accentColor", "accountHolder", "address", "archived", "avoirPrefix", "bankName", "capitalSocial", "city", "cnss", "country", "createdAt", "defaultCurrency", "defaultTaxBps", "devisPrefix", "email", "footerNotes", "iban", "ice", "id", "identifiantFiscal", "invoiceLocale", "invoicePrefix", "legalForm", "legalName", "logoPath", "ownerId", "patente", "phone", "rc", "rcCity", "rib", "signaturePath", "swift", "taxRegime", "tradeName", "updatedAt", "website" FROM "Company";
DROP TABLE "Company";
ALTER TABLE "new_Company" RENAME TO "Company";
CREATE INDEX "Company_ownerId_idx" ON "Company"("ownerId");
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
    "portalShared" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Invoice" ("amountInWords", "buyerSnapshot", "cancelReason", "cancelledAt", "clientId", "clientRef", "companyId", "convertedInvoiceId", "correctionReason", "createdAt", "currency", "docType", "dueDate", "finalizedAt", "footerText", "id", "invDiscountBps", "invDiscountFixedMinor", "invoiceLocale", "invoiceNumber", "issueDate", "linesSnapshot", "linkedInvoiceId", "notes", "ownerId", "paymentMode", "paymentTerms", "poNumber", "portalShared", "projectRef", "publicToken", "quoteStatus", "sellerSnapshot", "sentAt", "sentTo", "status", "subtotalHT", "taxBreakdown", "taxMention", "totalTTC", "totalTVA", "updatedAt", "validUntil", "viewedAt") SELECT "amountInWords", "buyerSnapshot", "cancelReason", "cancelledAt", "clientId", "clientRef", "companyId", "convertedInvoiceId", "correctionReason", "createdAt", "currency", "docType", "dueDate", "finalizedAt", "footerText", "id", "invDiscountBps", "invDiscountFixedMinor", "invoiceLocale", "invoiceNumber", "issueDate", "linesSnapshot", "linkedInvoiceId", "notes", "ownerId", "paymentMode", "paymentTerms", "poNumber", "portalShared", "projectRef", "publicToken", "quoteStatus", "sellerSnapshot", "sentAt", "sentTo", "status", "subtotalHT", "taxBreakdown", "taxMention", "totalTTC", "totalTVA", "updatedAt", "validUntil", "viewedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");
CREATE INDEX "Invoice_ownerId_status_idx" ON "Invoice"("ownerId", "status");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");
CREATE TABLE "new_PaymentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amountMinor" INTEGER,
    "expiresAt" DATETIME,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentLink_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaymentLink" ("amountMinor", "createdAt", "expiresAt", "id", "invoiceId", "ownerId", "token", "usedAt") SELECT "amountMinor", "createdAt", "expiresAt", "id", "invoiceId", "ownerId", "token", "usedAt" FROM "PaymentLink";
DROP TABLE "PaymentLink";
ALTER TABLE "new_PaymentLink" RENAME TO "PaymentLink";
CREATE UNIQUE INDEX "PaymentLink_token_key" ON "PaymentLink"("token");
CREATE INDEX "PaymentLink_ownerId_idx" ON "PaymentLink"("ownerId");
CREATE INDEX "PaymentLink_token_idx" ON "PaymentLink"("token");
CREATE TABLE "new_RecurringTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "clientId" TEXT,
    "docType" TEXT NOT NULL DEFAULT 'FACTURE',
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "paymentTerms" TEXT NOT NULL DEFAULT 'D30',
    "periodDays" INTEGER NOT NULL DEFAULT 30,
    "startDate" DATETIME NOT NULL,
    "lines" TEXT NOT NULL,
    "lastGeneratedAt" DATETIME,
    "lastGeneratedInvoiceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringTemplate_lastGeneratedInvoiceId_fkey" FOREIGN KEY ("lastGeneratedInvoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RecurringTemplate" ("active", "clientId", "companyId", "createdAt", "currency", "docType", "id", "lastGeneratedAt", "lastGeneratedInvoiceId", "lines", "name", "ownerId", "paymentTerms", "periodDays", "startDate", "updatedAt") SELECT "active", "clientId", "companyId", "createdAt", "currency", "docType", "id", "lastGeneratedAt", "lastGeneratedInvoiceId", "lines", "name", "ownerId", "paymentTerms", "periodDays", "startDate", "updatedAt" FROM "RecurringTemplate";
DROP TABLE "RecurringTemplate";
ALTER TABLE "new_RecurringTemplate" RENAME TO "RecurringTemplate";
CREATE INDEX "RecurringTemplate_ownerId_idx" ON "RecurringTemplate"("ownerId");
CREATE INDEX "RecurringTemplate_ownerId_active_idx" ON "RecurringTemplate"("ownerId", "active");
CREATE TABLE "new_Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OVERDUE',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "sentAt" DATETIME,
    "scheduledAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Reminder" ("attempts", "channel", "createdAt", "id", "invoiceId", "lastError", "ownerId", "scheduledAt", "sentAt", "type") SELECT "attempts", "channel", "createdAt", "id", "invoiceId", "lastError", "ownerId", "scheduledAt", "sentAt", "type" FROM "Reminder";
DROP TABLE "Reminder";
ALTER TABLE "new_Reminder" RENAME TO "Reminder";
CREATE INDEX "Reminder_ownerId_scheduledAt_idx" ON "Reminder"("ownerId", "scheduledAt");
CREATE INDEX "Reminder_invoiceId_idx" ON "Reminder"("invoiceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
