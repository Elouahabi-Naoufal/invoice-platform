-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" TEXT,
    "passwordEnc" TEXT,
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

-- CreateIndex
CREATE UNIQUE INDEX "EmailSettings_ownerId_key" ON "EmailSettings"("ownerId");

-- CreateIndex
CREATE INDEX "EmailSettings_ownerId_idx" ON "EmailSettings"("ownerId");

