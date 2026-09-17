-- CreateTable
CREATE TABLE "HubSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HubSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "SuperAdmin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HubSession_adminId_idx" ON "HubSession"("adminId");
