CREATE TABLE "RecurringTemplate" (
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
    "lastGeneratedAt" DATETIME,
    "lastGeneratedInvoiceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "RecurringTemplate_ownerId_idx" ON "RecurringTemplate"("ownerId");
CREATE INDEX "RecurringTemplate_ownerId_active_idx" ON "RecurringTemplate"("ownerId", "active");
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OVERDUE',
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "sentAt" DATETIME,
    "scheduledAt" DATETIME NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Reminder_ownerId_scheduledAt_idx" ON "Reminder"("ownerId", "scheduledAt");
CREATE INDEX "Reminder_invoiceId_idx" ON "Reminder"("invoiceId");
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amountMinor" INTEGER,
    "expiresAt" DATETIME,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PaymentLink_ownerId_idx" ON "PaymentLink"("ownerId");
CREATE UNIQUE INDEX "PaymentLink_token_key" ON "PaymentLink"("token");
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" DATETIME,
    "revokedAt" DATETIME
);
CREATE UNIQUE INDEX "Member_ownerId_email_key" ON "Member"("ownerId", "email");
CREATE INDEX "Member_ownerId_idx" ON "Member"("ownerId");
