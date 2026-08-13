-- Migration: add_transaction_audit_trail
-- تاریخچه غیرقابل‌ویرایش وضعیت تراکنش‌ها (TransactionStatusLog)
-- رویدادهای غیرتراکنشی فینتک (FintechEventLog)

-- ─── TransactionStatusLog ───────────────────────────────────────────────────
CREATE TABLE "TransactionStatusLog" (
    "id"         TEXT         NOT NULL,
    "txnId"      TEXT         NOT NULL,
    "fromStatus" TEXT,
    "toStatus"   TEXT         NOT NULL,
    "actorId"    TEXT,
    "actorRole"  TEXT,
    "ip"         TEXT,
    "note"       TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionStatusLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TransactionStatusLog"
    ADD CONSTRAINT "TransactionStatusLog_txnId_fkey"
    FOREIGN KEY ("txnId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "TransactionStatusLog_txnId_createdAt_idx"
    ON "TransactionStatusLog"("txnId", "createdAt" DESC);

CREATE INDEX "TransactionStatusLog_actorId_idx"
    ON "TransactionStatusLog"("actorId");

CREATE INDEX "TransactionStatusLog_toStatus_idx"
    ON "TransactionStatusLog"("toStatus");

-- ─── FintechEventLog ─────────────────────────────────────────────────────────
CREATE TABLE "FintechEventLog" (
    "id"         TEXT         NOT NULL,
    "eventType"  TEXT         NOT NULL,
    "entityType" TEXT         NOT NULL,
    "entityId"   TEXT         NOT NULL,
    "exchangeId" TEXT,
    "actorId"    TEXT,
    "actorRole"  TEXT,
    "ip"         TEXT,
    "before"     JSONB,
    "after"      JSONB,
    "note"       TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FintechEventLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FintechEventLog_entityType_entityId_createdAt_idx"
    ON "FintechEventLog"("entityType", "entityId", "createdAt" DESC);

CREATE INDEX "FintechEventLog_exchangeId_createdAt_idx"
    ON "FintechEventLog"("exchangeId", "createdAt" DESC);

CREATE INDEX "FintechEventLog_actorId_idx"
    ON "FintechEventLog"("actorId");

CREATE INDEX "FintechEventLog_eventType_createdAt_idx"
    ON "FintechEventLog"("eventType", "createdAt" DESC);
