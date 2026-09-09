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
INSERT INTO "new_Client" ("address", "city", "companyName", "country", "createdAt", "defaultCurrency", "email", "ice", "id", "name", "notes", "ownerId", "phone", "type", "updatedAt") SELECT "address", "city", "companyName", "country", "createdAt", "defaultCurrency", "email", "ice", "id", "name", "notes", "ownerId", "phone", "type", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE INDEX "Client_ownerId_idx" ON "Client"("ownerId");
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
    "invoiceLocale" TEXT NOT NULL DEFAULT 'fr',
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
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Company" ("accountHolder", "address", "archived", "bankName", "city", "country", "createdAt", "defaultCurrency", "defaultTaxBps", "email", "footerNotes", "iban", "ice", "id", "identifiantFiscal", "invoiceLocale", "invoicePrefix", "legalName", "logoPath", "ownerId", "patente", "phone", "rc", "rib", "swift", "tradeName", "updatedAt", "website") SELECT "accountHolder", "address", "archived", "bankName", "city", "country", "createdAt", "defaultCurrency", "defaultTaxBps", "email", "footerNotes", "iban", "ice", "id", "identifiantFiscal", "invoiceLocale", "invoicePrefix", "legalName", "logoPath", "ownerId", "patente", "phone", "rc", "rib", "swift", "tradeName", "updatedAt", "website" FROM "Company";
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
    "sentAt" DATETIME,
    "sentTo" TEXT,
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
INSERT INTO "new_Invoice" ("buyerSnapshot", "cancelReason", "cancelledAt", "clientId", "clientRef", "companyId", "createdAt", "currency", "dueDate", "finalizedAt", "footerText", "id", "invDiscountBps", "invDiscountFixedMinor", "invoiceLocale", "invoiceNumber", "issueDate", "linesSnapshot", "notes", "ownerId", "paymentTerms", "poNumber", "projectRef", "publicToken", "sellerSnapshot", "sentAt", "sentTo", "status", "subtotalHT", "taxBreakdown", "totalTTC", "totalTVA", "updatedAt", "viewedAt") SELECT "buyerSnapshot", "cancelReason", "cancelledAt", "clientId", "clientRef", "companyId", "createdAt", "currency", "dueDate", "finalizedAt", "footerText", "id", "invDiscountBps", "invDiscountFixedMinor", "invoiceLocale", "invoiceNumber", "issueDate", "linesSnapshot", "notes", "ownerId", "paymentTerms", "poNumber", "projectRef", "publicToken", "sellerSnapshot", "sentAt", "sentTo", "status", "subtotalHT", "taxBreakdown", "totalTTC", "totalTVA", "updatedAt", "viewedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "Invoice_publicToken_key" ON "Invoice"("publicToken");
CREATE INDEX "Invoice_ownerId_status_idx" ON "Invoice"("ownerId", "status");
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
