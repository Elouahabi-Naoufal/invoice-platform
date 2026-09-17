-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Rate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PERCENT',
    "percentBps" INTEGER NOT NULL DEFAULT 0,
    "fixedMinor" INTEGER NOT NULL DEFAULT 0,
    "capMinor" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Rate" ("active", "capMinor", "createdAt", "fixedMinor", "id", "kind", "name", "notes", "ownerId", "percentBps", "updatedAt") SELECT "active", "capMinor", "createdAt", "fixedMinor", "id", "kind", "name", "notes", "ownerId", "percentBps", "updatedAt" FROM "Rate";
DROP TABLE "Rate";
ALTER TABLE "new_Rate" RENAME TO "Rate";
CREATE INDEX "Rate_ownerId_idx" ON "Rate"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

