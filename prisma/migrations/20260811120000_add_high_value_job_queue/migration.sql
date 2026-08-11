-- CreateTable
CREATE TABLE "HighValueJob" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "triggeredBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HighValueJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HighValueJob_operation_targetId_key" ON "HighValueJob"("operation", "targetId");

-- CreateIndex
CREATE INDEX "HighValueJob_status_nextAttemptAt_idx" ON "HighValueJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "HighValueJob_operation_status_idx" ON "HighValueJob"("operation", "status");

-- CreateIndex
CREATE INDEX "HighValueJob_createdAt_idx" ON "HighValueJob"("createdAt" DESC);
