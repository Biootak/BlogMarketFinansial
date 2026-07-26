-- Migration: Subscription & Plan tracking
-- Adds:
--   - SubscriptionEvent model
-- The current plan is derived from the most recent paid SubscriptionEvent whose
-- validUntil is in the future (or no validUntil). This avoids a User schema change.

CREATE TABLE IF NOT EXISTS "SubscriptionEvent" (
  "id"            TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "kind"          TEXT NOT NULL,
  "fromPlan"      TEXT,
  "toPlan"        TEXT NOT NULL,
  "amount"        BIGINT NOT NULL DEFAULT 0,
  "currency"      TEXT NOT NULL DEFAULT 'AFN',
  "invoiceNo"     TEXT,
  "status"        TEXT NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT,
  "meta"          JSONB,
  "validUntil"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionEvent_invoiceNo_key"
  ON "SubscriptionEvent"("invoiceNo");

CREATE INDEX IF NOT EXISTS "SubscriptionEvent_userId_createdAt_idx"
  ON "SubscriptionEvent"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SubscriptionEvent_status_idx"
  ON "SubscriptionEvent"("status");
