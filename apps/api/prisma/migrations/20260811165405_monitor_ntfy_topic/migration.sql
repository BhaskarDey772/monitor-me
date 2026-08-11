/*
  Warnings:

  - Added the required column `ntfyTopic` to the `monitor` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_monitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "scheduleKind" TEXT NOT NULL DEFAULT 'preset',
    "intervalSeconds" INTEGER,
    "cronExpression" TEXT,
    "startAt" DATETIME NOT NULL,
    "ntfyTopic" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "monitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_monitor" ("createdAt", "cronExpression", "id", "intervalSeconds", "isActive", "name", "prompt", "scheduleKind", "startAt", "updatedAt", "userId") SELECT "createdAt", "cronExpression", "id", "intervalSeconds", "isActive", "name", "prompt", "scheduleKind", "startAt", "updatedAt", "userId" FROM "monitor";
DROP TABLE "monitor";
ALTER TABLE "new_monitor" RENAME TO "monitor";
CREATE UNIQUE INDEX "monitor_ntfyTopic_key" ON "monitor"("ntfyTopic");
CREATE INDEX "monitor_userId_idx" ON "monitor"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
