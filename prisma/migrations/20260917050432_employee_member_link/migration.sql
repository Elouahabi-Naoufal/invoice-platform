-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "memberId" TEXT,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "grossSalaryMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("active", "createdAt", "currency", "fullName", "grossSalaryMinor", "id", "notes", "ownerId", "position", "updatedAt") SELECT "active", "createdAt", "currency", "fullName", "grossSalaryMinor", "id", "notes", "ownerId", "position", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_memberId_key" ON "Employee"("memberId");
CREATE INDEX "Employee_ownerId_idx" ON "Employee"("ownerId");
CREATE INDEX "Employee_memberId_idx" ON "Employee"("memberId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

