-- DropIndex
DROP INDEX "EmailSettings_ownerId_idx";

-- DropIndex
DROP INDEX "EmailSettings_ownerId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "EmailSettings";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OVERDUE',
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
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
CREATE INDEX "Reminder_sentAt_scheduledAt_idx" ON "Reminder"("sentAt", "scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

