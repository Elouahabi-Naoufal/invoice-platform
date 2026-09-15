CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'piece',
    "unitPriceMinor" INTEGER NOT NULL,
    "taxRateBps" INTEGER NOT NULL DEFAULT 2000,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "Product_ownerId_idx" ON "Product"("ownerId");
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");
