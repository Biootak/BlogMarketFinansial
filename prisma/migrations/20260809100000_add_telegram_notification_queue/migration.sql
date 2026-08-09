-- CreateTable
CREATE TABLE "TelegramNotification" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "replyMarkup" JSONB,
    "dedupeKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramNotification_dedupeKey_key" ON "TelegramNotification"("dedupeKey");

-- CreateIndex
CREATE INDEX "TelegramNotification_status_idx" ON "TelegramNotification"("status");

-- CreateIndex
CREATE INDEX "TelegramNotification_status_nextAttemptAt_idx" ON "TelegramNotification"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "TelegramNotification_createdAt_idx" ON "TelegramNotification"("createdAt" DESC);
