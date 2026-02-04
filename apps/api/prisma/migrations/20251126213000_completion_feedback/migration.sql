-- Baseline migration to record the CompletionFeedback table added via db push
-- (data already present; this file is for migration history only).

CREATE TABLE "CompletionFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "blockId" TEXT,
    "instanceDate" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feeling" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "interrupted" BOOLEAN NOT NULL,
    "interruptionReason" TEXT,
    "timeDelta" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompletionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CompletionFeedback_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CompletionFeedback_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CompletionFeedback_userId_instanceDate_idx" ON "CompletionFeedback"("userId", "instanceDate");
CREATE INDEX "CompletionFeedback_taskId_idx" ON "CompletionFeedback"("taskId");
CREATE INDEX "CompletionFeedback_blockId_idx" ON "CompletionFeedback"("blockId");
