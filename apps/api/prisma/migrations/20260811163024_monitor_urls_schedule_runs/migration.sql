/*
  Warnings:

  - You are about to drop the column `url` on the `monitor` table. All the data in the column will be lost.
  - Added the required column `prompt` to the `monitor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startAt` to the `monitor` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "monitor_url" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "monitorId" TEXT NOT NULL,
    CONSTRAINT "monitor_url_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monitor_run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "summary" TEXT,
    "monitorId" TEXT NOT NULL,
    CONSTRAINT "monitor_run_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "monitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monitor_run_result" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "error" TEXT,
    "runId" TEXT NOT NULL,
    "monitorUrlId" TEXT,
    CONSTRAINT "monitor_run_result_runId_fkey" FOREIGN KEY ("runId") REFERENCES "monitor_run" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "monitor_run_result_monitorUrlId_fkey" FOREIGN KEY ("monitorUrlId") REFERENCES "monitor_url" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "monitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_monitor" ("createdAt", "id", "intervalSeconds", "isActive", "name", "updatedAt", "userId") SELECT "createdAt", "id", "intervalSeconds", "isActive", "name", "updatedAt", "userId" FROM "monitor";
DROP TABLE "monitor";
ALTER TABLE "new_monitor" RENAME TO "monitor";
CREATE INDEX "monitor_userId_idx" ON "monitor"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "monitor_url_monitorId_idx" ON "monitor_url"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "monitor_url_monitorId_url_key" ON "monitor_url"("monitorId", "url");

-- CreateIndex
CREATE INDEX "monitor_run_monitorId_startedAt_idx" ON "monitor_run"("monitorId", "startedAt");

-- CreateIndex
CREATE INDEX "monitor_run_result_runId_idx" ON "monitor_run_result"("runId");

-- CreateIndex
CREATE INDEX "monitor_run_result_monitorUrlId_idx" ON "monitor_run_result"("monitorUrlId");
