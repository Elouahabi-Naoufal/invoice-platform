-- AlterTable
ALTER TABLE "Client" ADD COLUMN "portalToken" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "publicTokenExpiresAt" DATETIME;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "userId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "nextRunAt" DATETIME,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "sendChannel" TEXT NOT NULL DEFAULT 'NONE',
    "lastError" TEXT,
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
CREATE INDEX "RecurringTemplate_active_nextRunAt_idx" ON "RecurringTemplate"("active", "nextRunAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Client_portalToken_key" ON "Client"("portalToken");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "Reminder_sentAt_scheduledAt_idx" ON "Reminder"("sentAt", "scheduledAt");

