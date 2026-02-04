-- CreateTable
CREATE TABLE "SentNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notificationId" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SentNotification_notificationId_key" ON "SentNotification"("notificationId");

-- CreateIndex
CREATE INDEX "SentNotification_notificationId_idx" ON "SentNotification"("notificationId");






