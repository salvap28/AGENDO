-- Table already exists, just ensure indexes exist
-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyInsightsCache_userId_date_key" ON "WeeklyInsightsCache"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeeklyInsightsCache_userId_date_idx" ON "WeeklyInsightsCache"("userId", "date");

