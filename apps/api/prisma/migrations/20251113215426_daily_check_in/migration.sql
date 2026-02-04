-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sleepHrs" REAL,
    "caffeine" INTEGER,
    "energyLevel" INTEGER,
    "mood" TEXT,
    "stress" TEXT,
    "focus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyMetric" ("caffeine", "createdAt", "date", "id", "mood", "sleepHrs", "userId") SELECT "caffeine", "createdAt", "date", "id", "mood", "sleepHrs", "userId" FROM "DailyMetric";
DROP TABLE "DailyMetric";
ALTER TABLE "new_DailyMetric" RENAME TO "DailyMetric";
CREATE UNIQUE INDEX "DailyMetric_userId_date_key" ON "DailyMetric"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
