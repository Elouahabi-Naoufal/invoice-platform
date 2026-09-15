ALTER TABLE "Company" ADD COLUMN "devisPrefix" TEXT NOT NULL DEFAULT 'DEV';
ALTER TABLE "Invoice" ADD COLUMN "validUntil" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "quoteStatus" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "convertedInvoiceId" TEXT;
