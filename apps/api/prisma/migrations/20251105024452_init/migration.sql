/*
  Warnings:

  - You are about to drop the `CoffeeLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SleepLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkoutLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `completed` on the `Block` table. All the data in the column will be lost.
  - You are about to drop the column `coffeeCups` on the `DailyMetric` table. All the data in the column will be lost.
  - You are about to drop the column `energy` on the `DailyMetric` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `DailyMetric` table. All the data in the column will be lost.
  - You are about to drop the column `sleepHours` on the `DailyMetric` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CoffeeLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SleepLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "WorkoutLog";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Block" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Block_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Block" ("color", "createdAt", "date", "end", "id", "start", "title", "userId") SELECT "color", "createdAt", "date", "end", "id", "start", "title", "userId" FROM "Block";
DROP TABLE "Block";
ALTER TABLE "new_Block" RENAME TO "Block";
CREATE INDEX "Block_userId_date_idx" ON "Block"("userId", "date");
CREATE TABLE "new_DailyMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sleepHrs" REAL,
    "caffeine" INTEGER,
    "mood" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyMetric" ("createdAt", "date", "id", "mood", "userId") SELECT "createdAt", "date", "id", "mood", "userId" FROM "DailyMetric";
DROP TABLE "DailyMetric";
ALTER TABLE "new_DailyMetric" RENAME TO "DailyMetric";
CREATE UNIQUE INDEX "DailyMetric_userId_date_key" ON "DailyMetric"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WeightLog_userId_date_idx" ON "WeightLog"("userId", "date");
