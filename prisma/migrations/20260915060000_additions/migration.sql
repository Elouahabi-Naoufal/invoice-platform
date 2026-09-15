ALTER TABLE "Invoice" ADD COLUMN "portalShared" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Member" ADD COLUMN "inviteToken" TEXT;
CREATE UNIQUE INDEX "Member_inviteToken_key" ON "Member"("inviteToken");
ALTER TABLE "RecurringTemplate" ADD COLUMN "lines" TEXT NOT NULL DEFAULT '[]';
CREATE TABLE "AvoirInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "avoirId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvoirInvoice_avoirId_fkey" FOREIGN KEY ("avoirId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AvoirInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AvoirInvoice_ownerId_idx" ON "AvoirInvoice"("ownerId");
CREATE INDEX "AvoirInvoice_avoirId_idx" ON "AvoirInvoice"("avoirId");
CREATE INDEX "AvoirInvoice_invoiceId_idx" ON "AvoirInvoice"("invoiceId");
