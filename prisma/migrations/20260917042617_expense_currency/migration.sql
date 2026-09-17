-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT,
    "clientId" TEXT,
    "invoiceId" TEXT,
    "supplier" TEXT,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountHTMinor" INTEGER NOT NULL DEFAULT 0,
    "taxRateBps" INTEGER NOT NULL DEFAULT 2000,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "charges" TEXT,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Expense" ("amountHTMinor", "billable", "category", "charges", "clientId", "companyId", "createdAt", "date", "description", "id", "invoiceId", "notes", "ownerId", "paymentMethod", "reference", "supplier", "taxExempt", "taxRateBps", "totalMinor", "updatedAt") SELECT "amountHTMinor", "billable", "category", "charges", "clientId", "companyId", "createdAt", "date", "description", "id", "invoiceId", "notes", "ownerId", "paymentMethod", "reference", "supplier", "taxExempt", "taxRateBps", "totalMinor", "updatedAt" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
CREATE INDEX "Expense_ownerId_date_idx" ON "Expense"("ownerId", "date");
CREATE INDEX "Expense_companyId_idx" ON "Expense"("companyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

