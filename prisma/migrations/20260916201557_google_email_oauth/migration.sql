-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "authType" TEXT NOT NULL DEFAULT 'SMTP',
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "passwordEnc" TEXT,
    "oauthRefreshTokenEnc" TEXT,
    "googleEmail" TEXT,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "replyTo" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTestAt" DATETIME,
    "lastTestOk" BOOLEAN,
    "lastTestError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailSettings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmailSettings" ("createdAt", "enabled", "fromAddress", "fromName", "host", "id", "lastTestAt", "lastTestError", "lastTestOk", "ownerId", "passwordEnc", "port", "replyTo", "secure", "updatedAt", "username") SELECT "createdAt", "enabled", "fromAddress", "fromName", "host", "id", "lastTestAt", "lastTestError", "lastTestOk", "ownerId", "passwordEnc", "port", "replyTo", "secure", "updatedAt", "username" FROM "EmailSettings";
DROP TABLE "EmailSettings";
ALTER TABLE "new_EmailSettings" RENAME TO "EmailSettings";
CREATE UNIQUE INDEX "EmailSettings_ownerId_key" ON "EmailSettings"("ownerId");
CREATE INDEX "EmailSettings_ownerId_idx" ON "EmailSettings"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

