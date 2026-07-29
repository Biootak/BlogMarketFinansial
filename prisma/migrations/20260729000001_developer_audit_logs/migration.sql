-- 20260729_developer_audit_logs.sql
--
-- 2026-07-29: Developer Portal hardening — رفع ۳ ریسک بحرانی:
--   1. Audit log برای تغییرات کلیدهای API (CREATE/VIEW/DELETE/TOGGLE)
--   2. Webhook delivery log با وضعیت ارسال (200/4xx/5xx) + retry
--   3. API call log برای نمایش «فعالیت اخیر API» در داشبورد مشتری
--   4. Scopes روی ApiKey: read:accounts, write:transfers, ...
--   5. lastIp روی ApiKey: تشخیص استفاده از IP غیرعادی
--
-- همهٔ تغییرات backward-compatible:
--   - ستون‌های جدید nullable یا دارای default
--   - جداول جدید مستقل از schema فعلی
--   - بدون backfill اجباری

-- ── 1. گسترش ApiKey ──────────────────────────────────────────────────────

ALTER TABLE "ApiKey"
  ADD COLUMN IF NOT EXISTS "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "ApiKey"
  ADD COLUMN IF NOT EXISTS "lastIp" TEXT;

-- ایندکس برای گزارش‌دهی
CREATE INDEX IF NOT EXISTS "ApiKey_scopes_idx"
  ON "ApiKey" USING GIN ("scopes");

-- ── 2. ApiKeyAudit ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ApiKeyAudit" (
  "id" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKeyAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApiKeyAudit_userId_createdAt_idx"
  ON "ApiKeyAudit"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ApiKeyAudit_apiKeyId_idx"
  ON "ApiKeyAudit"("apiKeyId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ApiKeyAudit_apiKeyId_fkey'
  ) THEN
    ALTER TABLE "ApiKeyAudit"
      ADD CONSTRAINT "ApiKeyAudit_apiKeyId_fkey"
      FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 3. WebhookDeliveryStatus enum ─────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebhookDeliveryStatus') THEN
    CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');
  END IF;
END $$;

-- ── 4. WebhookDelivery ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
  "id" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "responseCode" INTEGER,
  "responseBody" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "durationMs" INTEGER,
  "error" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_createdAt_idx"
  ON "WebhookDelivery"("webhookId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx"
  ON "WebhookDelivery"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_webhookId_fkey'
  ) THEN
    ALTER TABLE "WebhookDelivery"
      ADD CONSTRAINT "WebhookDelivery_webhookId_fkey"
      FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 5. ApiCallLog (Recent API Activity widget) ───────────────────────────

CREATE TABLE IF NOT EXISTS "ApiCallLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "apiKeyId" TEXT,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiCallLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApiCallLog_userId_createdAt_idx"
  ON "ApiCallLog"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ApiCallLog_apiKeyId_idx"
  ON "ApiCallLog"("apiKeyId");

-- ── 6. Rate limit: شمارنده ساده برای ساخت کلید/وب‌هوک ───────────────────
-- نگه‌داری تعداد attempt در یک ساعت گذشته

CREATE TABLE IF NOT EXISTS "ApiRateLimit" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL, -- 'create_api_key' | 'create_webhook'
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ApiRateLimit_userId_action_window_idx"
  ON "ApiRateLimit"("userId", "action", "windowStart" DESC);

-- پاک‌سازی خودکار رکوردهای قدیمی (cron job) — در middleware هم check می‌شود
