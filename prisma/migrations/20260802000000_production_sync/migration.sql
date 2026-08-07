-- ============================================================
-- production_sync — 2026-08-02
-- Migration جامع idempotent برای همگام‌سازی DB production
-- پوشش: تمام migration های 20260620 تا 20260801
-- همه دستورات IF NOT EXISTS / IF EXISTS هستند — اجرای مجدد بی‌ضرر است.
-- ============================================================

-- ── 1. Enum additions ──────────────────────────────────────────

-- Role: SUPER_ADMIN → OWNER + مقادیر جدید
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPER_ADMIN'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
    ALTER TYPE "Role" RENAME VALUE 'SUPER_ADMIN' TO 'OWNER';
  END IF;
END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='OWNER'       AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Role')) THEN ALTER TYPE "Role" ADD VALUE 'OWNER'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='CUSTOMER'    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Role')) THEN ALTER TYPE "Role" ADD VALUE 'CUSTOMER'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='TEST_CUSTOMER' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Role')) THEN ALTER TYPE "Role" ADD VALUE 'TEST_CUSTOMER'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='MERCHANT'    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Role')) THEN ALTER TYPE "Role" ADD VALUE 'MERCHANT'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='EXCHANGE'    AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Role')) THEN ALTER TYPE "Role" ADD VALUE 'EXCHANGE'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='SUPPORT'     AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Role')) THEN ALTER TYPE "Role" ADD VALUE 'SUPPORT'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='SUPERADMIN'  AND enumtypid=(SELECT oid FROM pg_type WHERE typname='Role')) THEN ALTER TYPE "Role" ADD VALUE 'SUPERADMIN'; END IF; END $$;

-- PostStatus: SCHEDULED
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='SCHEDULED' AND enumtypid=(SELECT oid FROM pg_type WHERE typname='PostStatus')) THEN ALTER TYPE "PostStatus" ADD VALUE 'SCHEDULED'; END IF; END $$;

-- ── 2. User columns ────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "imageWidth"             INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "imageHeight"            INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nationalIdHash"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycSubmittedAt"         TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycReviewedAt"          TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycRejectReason"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycDocUrl"              TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled"       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecret"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorSecretEnc"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyVoice"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monthlyActivityReport"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "exchangePartnerId"      TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion"           INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "User_exchangePartnerId_idx" ON "User"("exchangePartnerId");
CREATE INDEX IF NOT EXISTS "User_monthlyActivityReport_idx" ON "User"("monthlyActivityReport") WHERE "monthlyActivityReport" = true;

-- ── 3. Profile columns ────────────────────────────────────────
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "avatarWidth"   INTEGER;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "avatarHeight"  INTEGER;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "bgImageWidth"  INTEGER;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "bgImageHeight" INTEGER;

-- ── 4. Post columns ───────────────────────────────────────────
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "featuredImageWidth"  INTEGER;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "featuredImageHeight" INTEGER;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "scheduledAt"         TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Post_scheduledAt_idx" ON "Post"("scheduledAt");

-- ── 5. Category / Tag image dimensions ───────────────────────
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "thumbnailWidth"  INTEGER;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "thumbnailHeight" INTEGER;
ALTER TABLE "Tag"      ADD COLUMN IF NOT EXISTS "thumbnailWidth"  INTEGER;
ALTER TABLE "Tag"      ADD COLUMN IF NOT EXISTS "thumbnailHeight" INTEGER;

-- ── 6. ExchangeRate registry fields ──────────────────────────
ALTER TABLE "ExchangeRate"
  ADD COLUMN IF NOT EXISTS "symbol"        TEXT,
  ADD COLUMN IF NOT EXISTS "displayNameFa" TEXT,
  ADD COLUMN IF NOT EXISTS "group"         TEXT,
  ADD COLUMN IF NOT EXISTS "unit"          TEXT,
  ADD COLUMN IF NOT EXISTS "divisor"       INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "decimals"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "priority"      INTEGER NOT NULL DEFAULT 99,
  ADD COLUMN IF NOT EXISTS "provider"      TEXT    NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "tgjuKey"       TEXT,
  ADD COLUMN IF NOT EXISTS "active"        BOOLEAN NOT NULL DEFAULT true;

UPDATE "ExchangeRate" SET "symbol" = "currency"     WHERE "symbol" IS NULL;
UPDATE "ExchangeRate" SET "displayNameFa" = "name"  WHERE "displayNameFa" IS NULL;

DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT "id", "symbol", ROW_NUMBER() OVER (PARTITION BY "symbol" ORDER BY "createdAt") AS rn
    FROM "ExchangeRate" WHERE "symbol" IS NOT NULL
  LOOP
    IF rec.rn > 1 THEN
      UPDATE "ExchangeRate" SET "symbol" = rec.symbol || '_' || (rec.rn-1)::TEXT WHERE "id" = rec.id;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_symbol_key"          ON "ExchangeRate"("symbol");
CREATE INDEX        IF NOT EXISTS "ExchangeRate_active_priority_idx" ON "ExchangeRate"("active", "priority");
CREATE INDEX        IF NOT EXISTS "ExchangeRate_symbol_idx"          ON "ExchangeRate"("symbol");

-- ── 7. VerificationToken OTP fields ───────────────────────────
ALTER TABLE "VerificationToken" ALTER COLUMN "token" TYPE VARCHAR(255);
ALTER TABLE "VerificationToken" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VerificationToken" ADD COLUMN IF NOT EXISTS "intent"   TEXT    NOT NULL DEFAULT 'register';

CREATE INDEX IF NOT EXISTS "VerificationToken_email_idx"   ON "VerificationToken"("email");
CREATE INDEX IF NOT EXISTS "VerificationToken_expires_idx" ON "VerificationToken"("expires");

DELETE FROM "VerificationToken" v
USING "VerificationToken" dup
WHERE v."email" = dup."email" AND v."intent" = dup."intent"
  AND v."id" <> dup."id" AND v."expires" < dup."expires";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='VerificationToken_email_intent_key')
    AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='VerificationToken_email_intent_key') THEN
    ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_email_intent_key" UNIQUE ("email","intent");
  END IF;
END $$;

-- ── 8. SystemSettings columns ─────────────────────────────────
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "logoUrl"            TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "maintenanceMessage" TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "siteUrl"            TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "contactEmail"       TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "contactPhone"       TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "contactAddress"     TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "telegram"           TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "instagram"          TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "whatsapp"           TEXT;
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "twitter"            TEXT;

-- ── 9. PageView daily buckets ─────────────────────────────────
ALTER TABLE "PageView" DROP CONSTRAINT IF EXISTS "PageView_page_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PageView_page_date_key" ON "PageView"("page","date");

-- ── 10. Task ──────────────────────────────────────────────────
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='TaskStatus') THEN CREATE TYPE "TaskStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='TaskPriority') THEN CREATE TYPE "TaskPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT'); END IF; END $$;

CREATE TABLE IF NOT EXISTS "Task" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "status"      "TaskStatus"   NOT NULL DEFAULT 'PENDING',
    "priority"    "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate"     TIMESTAMP(3),
    "userId"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Task') THEN
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL;
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "status" "TaskStatus"   NOT NULL DEFAULT 'PENDING';
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Task_userId_idx"  ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "Task_status_idx"  ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Task_userId_fkey') THEN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END IF; END $$;

-- ── 11. Audit / Like indexes ──────────────────────────────────
DROP INDEX IF EXISTS "Like_userId_postId_commentId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_postId_key"    ON "Like"("userId","postId");
CREATE UNIQUE INDEX IF NOT EXISTS "Like_userId_commentId_key" ON "Like"("userId","commentId");
CREATE INDEX IF NOT EXISTS "Account_userId_idx"           ON "Account"("userId");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx"   ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Session_userId_idx"           ON "Session"("userId");

-- ── 12. BackupConfig + BackupRun ──────────────────────────────
CREATE TABLE IF NOT EXISTS "BackupConfig" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "intervalHours" INTEGER NOT NULL DEFAULT 24,
  "retentionCount" INTEGER NOT NULL DEFAULT 7,
  "includeAuditLog" BOOLEAN NOT NULL DEFAULT true,
  "includeSocialLinks" BOOLEAN NOT NULL DEFAULT true,
  "includeSystemSettings" BOOLEAN NOT NULL DEFAULT true,
  "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT false,
  "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
  "notifyEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupConfig_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='BackupConfig') THEN
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL DEFAULT 'singleton';
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "intervalHours" INTEGER NOT NULL DEFAULT 24;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "retentionCount" INTEGER NOT NULL DEFAULT 7;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "includeAuditLog" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "includeSocialLinks" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "includeSystemSettings" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "notifyEmail" TEXT;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "BackupConfig" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "BackupRun" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "totalRows" INTEGER NOT NULL,
  "sections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "reason" TEXT NOT NULL DEFAULT 'manual',
  "actor" TEXT,
  "checksum" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BackupRun_filename_key" UNIQUE ("filename")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='BackupRun') THEN
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "filename" TEXT NOT NULL;
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "sizeBytes" INTEGER NOT NULL;
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "totalRows" INTEGER NOT NULL;
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "sections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "reason" TEXT NOT NULL DEFAULT 'manual';
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "actor" TEXT;
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "checksum" TEXT;
    ALTER TABLE "BackupRun" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "BackupRun_createdAt_idx" ON "BackupRun"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "BackupRun_reason_idx"    ON "BackupRun"("reason");

-- ── 13. ApprovalRequest + ApprovalStep ────────────────────────
CREATE TABLE IF NOT EXISTS "ApprovalRequest" (
    "id" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL,
    "description" TEXT, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending',
    "currentStep" INTEGER NOT NULL DEFAULT 0, "totalSteps" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB, "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ApprovalRequest') THEN
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "type" TEXT NOT NULL, "title" TEXT NOT NULL;
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "description" TEXT, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL;
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "requesterId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "currentStep" INTEGER NOT NULL DEFAULT 0, "totalSteps" INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "payload" JSONB, "decidedAt" TIMESTAMP(3);
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "ApprovalStep" (
    "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "stepIndex" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL, "approverId" TEXT, "status" TEXT NOT NULL DEFAULT 'pending',
    "comment" TEXT, "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ApprovalStep') THEN
    ALTER TABLE "ApprovalStep" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "stepIndex" INTEGER NOT NULL;
    ALTER TABLE "ApprovalStep" ADD COLUMN IF NOT EXISTS "approverRole" TEXT NOT NULL, "approverId" TEXT, "status" TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE "ApprovalStep" ADD COLUMN IF NOT EXISTS "comment" TEXT, "decidedAt" TIMESTAMP(3);
    ALTER TABLE "ApprovalStep" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ApprovalRequest_status_idx"              ON "ApprovalRequest"("status");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_type_status_idx"         ON "ApprovalRequest"("type","status");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_requesterId_idx"         ON "ApprovalRequest"("requesterId");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_entityType_entityId_idx" ON "ApprovalRequest"("entityType","entityId");
CREATE INDEX IF NOT EXISTS "ApprovalRequest_createdAt_idx"           ON "ApprovalRequest"("createdAt" DESC);

-- ── 14. Developer Portal: ApiKey extensions + audit tables ────
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ApiKey" ADD COLUMN IF NOT EXISTS "lastIp" TEXT;
CREATE INDEX IF NOT EXISTS "ApiKey_scopes_idx" ON "ApiKey" USING GIN ("scopes");

CREATE TABLE IF NOT EXISTS "ApiKeyAudit" (
  "id" TEXT NOT NULL, "apiKeyId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL, "ip" TEXT, "userAgent" TEXT, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiKeyAudit_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ApiKeyAudit') THEN
    ALTER TABLE "ApiKeyAudit" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "apiKeyId" TEXT NOT NULL, "userId" TEXT NOT NULL;
    ALTER TABLE "ApiKeyAudit" ADD COLUMN IF NOT EXISTS "action" TEXT NOT NULL, "ip" TEXT, "userAgent" TEXT, "metadata" JSONB;
    ALTER TABLE "ApiKeyAudit" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ApiKeyAudit_userId_createdAt_idx" ON "ApiKeyAudit"("userId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ApiKeyAudit_apiKeyId_idx"         ON "ApiKeyAudit"("apiKeyId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ApiKeyAudit_apiKeyId_fkey') THEN
  ALTER TABLE "ApiKeyAudit" ADD CONSTRAINT "ApiKeyAudit_apiKeyId_fkey"
    FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='WebhookDeliveryStatus') THEN
  CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING','SUCCESS','FAILED','RETRYING');
END IF; END $$;

CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
  "id" TEXT NOT NULL, "webhookId" TEXT NOT NULL, "event" TEXT NOT NULL,
  "payload" JSONB NOT NULL, "responseCode" INTEGER, "responseBody" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "durationMs" INTEGER, "error" TEXT, "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='WebhookDelivery') THEN
    ALTER TABLE "WebhookDelivery" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "webhookId" TEXT NOT NULL, "event" TEXT NOT NULL;
    ALTER TABLE "WebhookDelivery" ADD COLUMN IF NOT EXISTS "payload" JSONB NOT NULL, "responseCode" INTEGER, "responseBody" TEXT;
    ALTER TABLE "WebhookDelivery" ADD COLUMN IF NOT EXISTS "attempt" INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE "WebhookDelivery" ADD COLUMN IF NOT EXISTS "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING';
    ALTER TABLE "WebhookDelivery" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER, "error" TEXT, "deliveredAt" TIMESTAMP(3);
    ALTER TABLE "WebhookDelivery" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_createdAt_idx" ON "WebhookDelivery"("webhookId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WebhookDelivery_status_idx"              ON "WebhookDelivery"("status");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='WebhookDelivery_webhookId_fkey') THEN
  ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey"
    FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "ApiCallLog" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "apiKeyId" TEXT,
  "method" TEXT NOT NULL, "path" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL, "durationMs" INTEGER NOT NULL,
  "ip" TEXT, "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiCallLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ApiCallLog') THEN
    ALTER TABLE "ApiCallLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "apiKeyId" TEXT;
    ALTER TABLE "ApiCallLog" ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL, "path" TEXT NOT NULL;
    ALTER TABLE "ApiCallLog" ADD COLUMN IF NOT EXISTS "statusCode" INTEGER NOT NULL, "durationMs" INTEGER NOT NULL;
    ALTER TABLE "ApiCallLog" ADD COLUMN IF NOT EXISTS "ip" TEXT, "userAgent" TEXT;
    ALTER TABLE "ApiCallLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ApiCallLog_userId_createdAt_idx" ON "ApiCallLog"("userId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ApiCallLog_apiKeyId_idx"         ON "ApiCallLog"("apiKeyId");

CREATE TABLE IF NOT EXISTS "ApiRateLimit" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "action" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL, "count" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ApiRateLimit_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ApiRateLimit') THEN
    ALTER TABLE "ApiRateLimit" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "action" TEXT NOT NULL;
    ALTER TABLE "ApiRateLimit" ADD COLUMN IF NOT EXISTS "windowStart" TIMESTAMP(3) NOT NULL, "count" INTEGER NOT NULL DEFAULT 1;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ApiRateLimit_userId_action_windowStart_idx"
  ON "ApiRateLimit"("userId","action","windowStart" DESC);

-- ── 15. ExchangeService + ServiceClick ────────────────────────
CREATE TABLE IF NOT EXISTS "ExchangeService" (
    "id" TEXT NOT NULL, "exchangeId" TEXT NOT NULL, "serviceKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true, "description" TEXT, "ctaHref" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0, "leadTimeMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeService_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ExchangeService') THEN
    ALTER TABLE "ExchangeService" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "exchangeId" TEXT NOT NULL, "serviceKey" TEXT NOT NULL;
    ALTER TABLE "ExchangeService" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true, "description" TEXT, "ctaHref" TEXT;
    ALTER TABLE "ExchangeService" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0, "leadTimeMin" INTEGER;
    ALTER TABLE "ExchangeService" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "ExchangeService" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeService_exchangeId_serviceKey_key" ON "ExchangeService"("exchangeId","serviceKey");
CREATE INDEX        IF NOT EXISTS "ExchangeService_exchangeId_isActive_order_idx" ON "ExchangeService"("exchangeId","isActive","order");
CREATE INDEX        IF NOT EXISTS "ExchangeService_serviceKey_isActive_idx"       ON "ExchangeService"("serviceKey","isActive");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ExchangeService_exchangeId_fkey') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Exchange') THEN
      ALTER TABLE "ExchangeService" ADD CONSTRAINT "ExchangeService_exchangeId_fkey"
        FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

ALTER TABLE "ServiceRequest" ADD COLUMN IF NOT EXISTS "targetExchangeId" TEXT;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='ServiceRequest' AND column_name='status') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='ServiceRequest_targetExchangeId_status_idx') THEN
      EXECUTE 'CREATE INDEX "ServiceRequest_targetExchangeId_status_idx" ON "ServiceRequest"("targetExchangeId","status")';
    END IF;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ServiceRequest_targetExchangeId_createdAt_idx" ON "ServiceRequest"("targetExchangeId","createdAt" DESC);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ServiceRequest_targetExchangeId_fkey') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Exchange') THEN
      ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_targetExchangeId_fkey"
        FOREIGN KEY ("targetExchangeId") REFERENCES "Exchange"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ServiceClick" (
    "id" TEXT NOT NULL, "exchangeId" TEXT, "serviceKey" TEXT NOT NULL,
    "source" TEXT NOT NULL, "userId" TEXT, "ipAddress" TEXT,
    "userAgent" TEXT, "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceClick_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ServiceClick') THEN
    ALTER TABLE "ServiceClick" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "exchangeId" TEXT, "serviceKey" TEXT NOT NULL;
    ALTER TABLE "ServiceClick" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL, "userId" TEXT, "ipAddress" TEXT;
    ALTER TABLE "ServiceClick" ADD COLUMN IF NOT EXISTS "userAgent" TEXT, "referer" TEXT;
    ALTER TABLE "ServiceClick" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ServiceClick_serviceKey_createdAt_idx" ON "ServiceClick"("serviceKey","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ServiceClick_exchangeId_createdAt_idx" ON "ServiceClick"("exchangeId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ServiceClick_source_createdAt_idx"     ON "ServiceClick"("source","createdAt" DESC);

-- ── 16. CustomerRequest + CustomerRequestStatusLog ────────────
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='CustomerRequestType') THEN
  CREATE TYPE "CustomerRequestType" AS ENUM ('ACCOUNT_NEW','ACCOUNT_UNFREEZE','TRANSFER_INITIATE','LIMIT_INCREASE','OTHER');
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='CustomerRequestStatus') THEN
  CREATE TYPE "CustomerRequestStatus" AS ENUM ('PENDING','IN_REVIEW','APPROVED','REJECTED','CANCELLED');
END IF; END $$;

CREATE TABLE IF NOT EXISTS "CustomerRequest" (
    "id" TEXT NOT NULL, "trackingCode" TEXT NOT NULL,
    "customerId" TEXT NOT NULL, "exchangeId" TEXT NOT NULL, "userId" TEXT NOT NULL,
    "type" "CustomerRequestType" NOT NULL, "status" "CustomerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB, "note" TEXT, "resolution" TEXT, "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='CustomerRequest') THEN
    ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "trackingCode" TEXT NOT NULL;
    ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL, "exchangeId" TEXT NOT NULL, "userId" TEXT NOT NULL;
    ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "type" "CustomerRequestType" NOT NULL, "status" "CustomerRequestStatus" NOT NULL DEFAULT 'PENDING';
    ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "payload" JSONB, "note" TEXT, "resolution" TEXT, "reviewedById" TEXT;
    ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
    ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "CustomerRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerRequest_trackingCode_key"               ON "CustomerRequest"("trackingCode");
CREATE INDEX        IF NOT EXISTS "CustomerRequest_customerId_createdAt_idx"       ON "CustomerRequest"("customerId","createdAt" DESC);
CREATE INDEX        IF NOT EXISTS "CustomerRequest_customerId_status_idx"          ON "CustomerRequest"("customerId","status");
CREATE INDEX        IF NOT EXISTS "CustomerRequest_exchangeId_status_createdAt_idx" ON "CustomerRequest"("exchangeId","status","createdAt" DESC);
CREATE INDEX        IF NOT EXISTS "CustomerRequest_status_createdAt_idx"           ON "CustomerRequest"("status","createdAt" DESC);
CREATE INDEX        IF NOT EXISTS "CustomerRequest_type_status_idx"                ON "CustomerRequest"("type","status");
CREATE INDEX        IF NOT EXISTS "CustomerRequest_userId_idx"                     ON "CustomerRequest"("userId");

CREATE TABLE IF NOT EXISTS "CustomerRequestStatusLog" (
    "id" TEXT NOT NULL, "requestId" TEXT NOT NULL,
    "fromStatus" "CustomerRequestStatus", "toStatus" "CustomerRequestStatus" NOT NULL,
    "actorId" TEXT, "actorRole" TEXT, "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerRequestStatusLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='CustomerRequestStatusLog') THEN
    ALTER TABLE "CustomerRequestStatusLog" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "requestId" TEXT NOT NULL;
    ALTER TABLE "CustomerRequestStatusLog" ADD COLUMN IF NOT EXISTS "fromStatus" "CustomerRequestStatus", "toStatus" "CustomerRequestStatus" NOT NULL;
    ALTER TABLE "CustomerRequestStatusLog" ADD COLUMN IF NOT EXISTS "actorId" TEXT, "actorRole" TEXT, "note" TEXT;
    ALTER TABLE "CustomerRequestStatusLog" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "CustomerRequestStatusLog_requestId_createdAt_idx"
    ON "CustomerRequestStatusLog"("requestId","createdAt" DESC);

-- ── 17. Beneficiary: customerId ──────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='Beneficiary' AND column_name='userId' AND is_nullable='NO') THEN
    ALTER TABLE "Beneficiary" ALTER COLUMN "userId" DROP NOT NULL;
  END IF;
END $$;
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Beneficiary_customerId_fkey') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Customer') THEN
      ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Beneficiary_customerId_identifier_key"
  ON "Beneficiary"("customerId","identifier") WHERE "customerId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Beneficiary_customerId_createdAt_idx"
    ON "Beneficiary"("customerId","createdAt" DESC);

-- Customer: shareWithExchange
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Customer') THEN
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "shareWithExchange" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- ── 18. Communication (Announcement, Campaign, CampaignRecipient) ──
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL,
    "channels" TEXT NOT NULL DEFAULT 'inapp', "audience" TEXT NOT NULL DEFAULT 'all',
    "audienceFilter" TEXT, "scheduledAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Announcement') THEN
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "title" TEXT NOT NULL, "body" TEXT NOT NULL;
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "channels" TEXT NOT NULL DEFAULT 'inapp', "audience" TEXT NOT NULL DEFAULT 'all';
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "audienceFilter" TEXT, "scheduledAt" TIMESTAMP(3), "publishedAt" TIMESTAMP(3);
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3), "status" TEXT NOT NULL DEFAULT 'draft';
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "createdById" TEXT NOT NULL;
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Announcement_status_idx"      ON "Announcement"("status");
CREATE INDEX IF NOT EXISTS "Announcement_scheduledAt_idx" ON "Announcement"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Announcement_createdAt_idx"   ON "Announcement"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "Campaign" (
    "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'email', "subject" TEXT, "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft', "audience" TEXT NOT NULL DEFAULT 'all',
    "audienceFilter" TEXT, "scheduledAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3), "statsSent" INTEGER NOT NULL DEFAULT 0,
    "statsOpened" INTEGER NOT NULL DEFAULT 0, "statsClicked" INTEGER NOT NULL DEFAULT 0,
    "statsBounced" INTEGER NOT NULL DEFAULT 0, "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Campaign') THEN
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT;
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'email', "subject" TEXT, "body" TEXT NOT NULL;
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft', "audience" TEXT NOT NULL DEFAULT 'all';
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "audienceFilter" TEXT, "scheduledAt" TIMESTAMP(3), "startedAt" TIMESTAMP(3);
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3), "statsSent" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "statsOpened" INTEGER NOT NULL DEFAULT 0, "statsClicked" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "statsBounced" INTEGER NOT NULL DEFAULT 0, "createdById" TEXT NOT NULL;
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Campaign_status_idx"      ON "Campaign"("status");
CREATE INDEX IF NOT EXISTS "Campaign_scheduledAt_idx" ON "Campaign"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Campaign_createdAt_idx"   ON "Campaign"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "CampaignRecipient" (
    "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending', "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3), "clickedAt" TIMESTAMP(3), "errorMessage" TEXT,
    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='CampaignRecipient') THEN
    ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "userId" TEXT NOT NULL;
    ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending', "sentAt" TIMESTAMP(3);
    ALTER TABLE "CampaignRecipient" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMP(3), "clickedAt" TIMESTAMP(3), "errorMessage" TEXT;
  END IF;
END $$;
CREATE INDEX  IF NOT EXISTS "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId","status");
CREATE INDEX  IF NOT EXISTS "CampaignRecipient_userId_idx"            ON "CampaignRecipient"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_userId_key" ON "CampaignRecipient"("campaignId","userId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CampaignRecipient_campaignId_fkey') THEN
  ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- ── 19. SupportTicket + TicketMessage ─────────────────────────
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL, "subject" TEXT NOT NULL, "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open', "priority" TEXT NOT NULL DEFAULT 'normal',
    "category" TEXT NOT NULL DEFAULT 'general', "requesterId" TEXT NOT NULL,
    "requesterRole" TEXT, "assignedToId" TEXT, "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3), "closedAt" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0, "tags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='SupportTicket') THEN
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "subject" TEXT NOT NULL, "description" TEXT NOT NULL;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'open', "priority" TEXT NOT NULL DEFAULT 'normal';
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'general', "requesterId" TEXT NOT NULL;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "requesterRole" TEXT, "assignedToId" TEXT, "firstResponseAt" TIMESTAMP(3);
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3), "closedAt" TIMESTAMP(3);
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "messageCount" INTEGER NOT NULL DEFAULT 0, "tags" TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "TicketMessage" (
    "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
    "authorRole" TEXT, "body" TEXT NOT NULL, "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='TicketMessage') THEN
    ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "authorId" TEXT NOT NULL;
    ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "authorRole" TEXT, "body" TEXT NOT NULL, "isInternal" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "TicketMessage" ADD COLUMN IF NOT EXISTS "attachments" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx"       ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx"     ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedToId_idx" ON "SupportTicket"("assignedToId");
CREATE INDEX IF NOT EXISTS "SupportTicket_requesterId_idx"  ON "SupportTicket"("requesterId");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx"    ON "SupportTicket"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "TicketMessage_authorId_idx"           ON "TicketMessage"("authorId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='TicketMessage_ticketId_fkey') THEN
  ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- ── 20. BackgroundJob ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BackgroundJob" (
    "id" TEXT NOT NULL, "type" TEXT NOT NULL, "queue" TEXT NOT NULL DEFAULT 'default',
    "payload" JSONB, "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 0, "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3, "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT, "errorStack" TEXT, "result" JSONB, "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='BackgroundJob') THEN
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL, "type" TEXT NOT NULL, "queue" TEXT NOT NULL DEFAULT 'default';
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "payload" JSONB, "status" TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0, "attempts" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "maxAttempts" INTEGER NOT NULL DEFAULT 3, "scheduledAt" TIMESTAMP(3);
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "failedAt" TIMESTAMP(3);
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT, "errorStack" TEXT, "result" JSONB, "triggeredBy" TEXT;
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "BackgroundJob" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "BackgroundJob_status_idx"       ON "BackgroundJob"("status");
CREATE INDEX IF NOT EXISTS "BackgroundJob_queue_status_idx" ON "BackgroundJob"("queue","status");
CREATE INDEX IF NOT EXISTS "BackgroundJob_type_idx"         ON "BackgroundJob"("type");
CREATE INDEX IF NOT EXISTS "BackgroundJob_scheduledAt_idx"  ON "BackgroundJob"("scheduledAt");
CREATE INDEX IF NOT EXISTS "BackgroundJob_createdAt_idx"    ON "BackgroundJob"("createdAt" DESC);

-- ── 21. TransferProvider (اگر fintech_core اجرا نشده) ────────
CREATE TABLE IF NOT EXISTS "TransferProvider" (
    "id"              TEXT    NOT NULL,
    "exchangeId"      TEXT    NOT NULL,
    "name"            TEXT    NOT NULL,
    "spreadPercent"   DECIMAL(10,4) NOT NULL DEFAULT 0,
    "flatFeeToman"    DECIMAL(20,2) NOT NULL DEFAULT 0,
    "speedMinutes"    INTEGER NOT NULL DEFAULT 60,
    "features"        TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
    "active"          BOOLEAN NOT NULL DEFAULT true,
    "description"     TEXT,
    "logoUrl"         TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferProvider_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='TransferProvider') THEN
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "id" TEXT    NOT NULL;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT    NOT NULL;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "name" TEXT    NOT NULL;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "spreadPercent" DECIMAL(10,4) NOT NULL DEFAULT 0;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "flatFeeToman" DECIMAL(20,2) NOT NULL DEFAULT 0;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "speedMinutes" INTEGER NOT NULL DEFAULT 60;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "features" TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "TransferProvider" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "TransferProvider_exchangeId_active_idx" ON "TransferProvider"("exchangeId","active");

-- ── 22. Fintech core tables (اگر fintech_core اجرا نشده) ─────
-- Exchange, ExchangeStaff, Customer, Transaction, FintechAccount, LedgerEntry
-- از آنجا که fintech_core یک placeholder migration است (بدون SQL واقعی)،
-- همه جداول را اینجا idempotent می‌سازیم.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='KycStatus') THEN
    CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED','PENDING','APPROVED','REJECTED','EXPIRED');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='KycLevel') THEN
    CREATE TYPE "KycLevel" AS ENUM ('NONE','BASIC','VERIFIED','ENHANCED');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ExchangeStatus') THEN
    CREATE TYPE "ExchangeStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED','CLOSED');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='TransactionStatus') THEN
    CREATE TYPE "TransactionStatus" AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','REVERSED','OTP_PENDING');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='TransactionType') THEN
    CREATE TYPE "TransactionType" AS ENUM ('TRANSFER','EXCHANGE','DEPOSIT','WITHDRAWAL','FEE','REVERSAL','REWARD');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='AccountType') THEN
    CREATE TYPE "AccountType" AS ENUM ('CHECKING','SAVINGS','TRADING','ESCROW','FLOAT');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='AccountStatus') THEN
    CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE','FROZEN','CLOSED');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ExchangeStaffRole') THEN
    CREATE TYPE "ExchangeStaffRole" AS ENUM ('OWNER','MANAGER','STAFF','VIEWER');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='QuoteStatus') THEN
    CREATE TYPE "QuoteStatus" AS ENUM ('PENDING','APPROVED','REJECTED','EXPIRED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Exchange" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL,
    "licenseNo"     TEXT,
    "city"          TEXT,
    "address"       TEXT,
    "phone"         TEXT,
    "email"         TEXT,
    "logoUrl"       TEXT,
    "status"        "ExchangeStatus" NOT NULL DEFAULT 'PENDING',
    "requireKyc"    BOOLEAN NOT NULL DEFAULT true,
    "dailyLimitAf"  INTEGER NOT NULL DEFAULT 0,
    "platformFee"   DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exchange_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Exchange') THEN
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "licenseNo" TEXT;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "city" TEXT;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "address" TEXT;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "phone" TEXT;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "email" TEXT;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "status" "ExchangeStatus" NOT NULL DEFAULT 'PENDING';
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "requireKyc" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "dailyLimitAf" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "platformFee" DECIMAL(5,2) NOT NULL DEFAULT 0;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Exchange" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Exchange_slug_key" ON "Exchange"("slug");
CREATE INDEX        IF NOT EXISTS "Exchange_status_idx" ON "Exchange"("status");

CREATE TABLE IF NOT EXISTS "ExchangeStaff" (
    "id"          TEXT NOT NULL,
    "exchangeId"  TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "role"        "ExchangeStaffRole" NOT NULL DEFAULT 'STAFF',
    "title"       TEXT,
    "permissions" JSONB,
    "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt"   TIMESTAMP(3),
    CONSTRAINT "ExchangeStaff_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ExchangeStaff') THEN
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT NOT NULL;
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "role" "ExchangeStaffRole" NOT NULL DEFAULT 'STAFF';
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "title" TEXT;
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "permissions" JSONB;
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "ExchangeStaff" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeStaff_exchangeId_userId_key" ON "ExchangeStaff"("exchangeId","userId");
CREATE INDEX        IF NOT EXISTS "ExchangeStaff_exchangeId_idx"        ON "ExchangeStaff"("exchangeId");
CREATE INDEX        IF NOT EXISTS "ExchangeStaff_userId_idx"            ON "ExchangeStaff"("userId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ExchangeStaff_exchangeId_fkey') THEN
  ALTER TABLE "ExchangeStaff" ADD CONSTRAINT "ExchangeStaff_exchangeId_fkey"
    FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ExchangeStaff_userId_fkey') THEN
  ALTER TABLE "ExchangeStaff" ADD CONSTRAINT "ExchangeStaff_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- اضافه کردن FK های ExchangeService بعد از Exchange
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ExchangeService_exchangeId_fkey') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ExchangeService') THEN
      ALTER TABLE "ExchangeService" ADD CONSTRAINT "ExchangeService_exchangeId_fkey"
        FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "KycRecord" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "exchangeId"  TEXT,
    "status"      "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "level"       "KycLevel" NOT NULL DEFAULT 'NONE',
    "docType"     TEXT,
    "docUrl"      TEXT,
    "selfieUrl"   TEXT,
    "notes"       TEXT,
    "reviewedBy"  TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt"  TIMESTAMP(3),
    "expiresAt"   TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KycRecord_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='KycRecord') THEN
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "status" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "level" "KycLevel" NOT NULL DEFAULT 'NONE';
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "docType" TEXT;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "docUrl" TEXT;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "selfieUrl" TEXT;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "notes" TEXT;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "KycRecord" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "KycRecord_userId_key"             ON "KycRecord"("userId");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='KycRecord' AND column_name='status') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='KycRecord_status_idx') THEN
      EXECUTE 'CREATE INDEX "KycRecord_status_idx" ON "KycRecord"("status")';
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='KycRecord' AND column_name='status')
    AND EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_name='KycRecord' AND column_name='exchangeId') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='KycRecord_exchangeId_status_idx') THEN
      EXECUTE 'CREATE INDEX "KycRecord_exchangeId_status_idx" ON "KycRecord"("exchangeId","status")';
    END IF;
  END IF;
END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='KycRecord_userId_fkey') THEN
  ALTER TABLE "KycRecord" ADD CONSTRAINT "KycRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "Customer" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "exchangeId"       TEXT,
    "fullName"         TEXT NOT NULL,
    "phone"            TEXT NOT NULL,
    "phoneVerified"    BOOLEAN NOT NULL DEFAULT false,
    "kycStatus"        "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "kycLevel"         "KycLevel" NOT NULL DEFAULT 'NONE',
    "shareWithExchange" BOOLEAN NOT NULL DEFAULT false,
    "dailyLimitAf"     INTEGER NOT NULL DEFAULT 0,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Customer') THEN
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "fullName" TEXT NOT NULL;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "kycLevel" "KycLevel" NOT NULL DEFAULT 'NONE';
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "shareWithExchange" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "dailyLimitAf" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_userId_key"    ON "Customer"("userId");
CREATE INDEX        IF NOT EXISTS "Customer_phone_idx"     ON "Customer"("phone");
CREATE INDEX        IF NOT EXISTS "Customer_exchangeId_idx" ON "Customer"("exchangeId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Customer_userId_fkey') THEN
  ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- FK های CustomerRequest بعد از Customer و Exchange
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CustomerRequest_customerId_fkey') THEN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='CustomerRequest') THEN
    ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CustomerRequest_exchangeId_fkey') THEN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='CustomerRequest') THEN
    ALTER TABLE "CustomerRequest" ADD CONSTRAINT "CustomerRequest_exchangeId_fkey"
      FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='CustomerRequestStatusLog_requestId_fkey') THEN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='CustomerRequestStatusLog') THEN
    ALTER TABLE "CustomerRequestStatusLog" ADD CONSTRAINT "CustomerRequestStatusLog_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "CustomerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "FintechAccount" (
    "id"         TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "currency"   TEXT NOT NULL DEFAULT 'AFN',
    "balance"    DECIMAL(20,2) NOT NULL DEFAULT 0,
    "type"       "AccountType" NOT NULL DEFAULT 'CHECKING',
    "status"     "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "exchangeId" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FintechAccount_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='FintechAccount') THEN
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "customerId" TEXT NOT NULL;
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'AFN';
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "balance" DECIMAL(20,2) NOT NULL DEFAULT 0;
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "type" "AccountType" NOT NULL DEFAULT 'CHECKING';
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT;
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "FintechAccount" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "FintechAccount_customerId_idx"  ON "FintechAccount"("customerId");
CREATE INDEX IF NOT EXISTS "FintechAccount_status_idx"      ON "FintechAccount"("status");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FintechAccount_customerId_fkey') THEN
  ALTER TABLE "FintechAccount" ADD CONSTRAINT "FintechAccount_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

CREATE TABLE IF NOT EXISTS "Transaction" (
    "id"              TEXT NOT NULL,
    "txnRef"          TEXT NOT NULL,
    "type"            "TransactionType" NOT NULL DEFAULT 'TRANSFER',
    "status"          "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "senderId"        TEXT,
    "recipientId"     TEXT,
    "senderAccountId" TEXT,
    "recipientAccountId" TEXT,
    "amount"          DECIMAL(20,2) NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'AFN',
    "fee"             DECIMAL(20,2) NOT NULL DEFAULT 0,
    "exchangeId"      TEXT,
    "idempotencyKey"  TEXT,
    "meta"            JSONB,
    "completedAt"     TIMESTAMP(3),
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Transaction') THEN
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "txnRef" TEXT NOT NULL;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "type" "TransactionType" NOT NULL DEFAULT 'TRANSFER';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "senderAccountId" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "recipientAccountId" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(20,2) NOT NULL;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'AFN';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "fee" DECIMAL(20,2) NOT NULL DEFAULT 0;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "meta" JSONB;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_txnRef_key"         ON "Transaction"("txnRef");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
CREATE INDEX        IF NOT EXISTS "Transaction_senderId_idx"       ON "Transaction"("senderId");
CREATE INDEX        IF NOT EXISTS "Transaction_recipientId_idx"    ON "Transaction"("recipientId");
CREATE INDEX        IF NOT EXISTS "Transaction_status_idx"         ON "Transaction"("status");
CREATE INDEX        IF NOT EXISTS "Transaction_createdAt_idx"      ON "Transaction"("createdAt" DESC);

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id"             TEXT NOT NULL,
    "accountId"      TEXT NOT NULL,
    "transactionId"  TEXT,
    "direction"      TEXT NOT NULL,
    "amount"         DECIMAL(20,2) NOT NULL,
    "currency"       TEXT NOT NULL DEFAULT 'AFN',
    "runningBalance" DECIMAL(20,2) NOT NULL,
    "description"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='LedgerEntry') THEN
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "accountId" TEXT NOT NULL;
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL;
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(20,2) NOT NULL;
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'AFN';
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "runningBalance" DECIMAL(20,2) NOT NULL;
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "LedgerEntry" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId","createdAt" DESC);

-- TransactionOtp
CREATE TABLE IF NOT EXISTS "TransactionOtp" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "txnId"       TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "usedAt"      TIMESTAMP(3),
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionOtp_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='TransactionOtp') THEN
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "txnId" TEXT NOT NULL;
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL;
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3) NOT NULL;
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "TransactionOtp" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "TransactionOtp_txnId_idx" ON "TransactionOtp"("txnId");

-- ExchangeQuote
CREATE TABLE IF NOT EXISTS "ExchangeQuote" (
    "id"             TEXT NOT NULL,
    "exchangeId"     TEXT NOT NULL,
    "currencyCode"   TEXT NOT NULL,
    "currencyPair"   TEXT NOT NULL,
    "buyRate"        DECIMAL(20,6) NOT NULL,
    "sellRate"       DECIMAL(20,6) NOT NULL,
    "minAmount"      DECIMAL(20,2) NOT NULL DEFAULT 0,
    "maxAmount"      DECIMAL(20,2),
    "status"         "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt"      TIMESTAMP(3),
    "publishedAt"    TIMESTAMP(3),
    "version"        INTEGER NOT NULL DEFAULT 1,
    "notes"          TEXT,
    "createdById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExchangeQuote_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='ExchangeQuote') THEN
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "exchangeId" TEXT NOT NULL;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "currencyCode" TEXT NOT NULL;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "currencyPair" TEXT NOT NULL;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "buyRate" DECIMAL(20,6) NOT NULL;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "sellRate" DECIMAL(20,6) NOT NULL;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "minAmount" DECIMAL(20,2) NOT NULL DEFAULT 0;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "maxAmount" DECIMAL(20,2);
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING';
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "notes" TEXT;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "ExchangeQuote" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ExchangeQuote_exchangeId_status_idx"        ON "ExchangeQuote"("exchangeId","status");
CREATE INDEX IF NOT EXISTS "ExchangeQuote_exchangeId_currencyCode_idx"  ON "ExchangeQuote"("exchangeId","currencyCode");
CREATE INDEX IF NOT EXISTS "ExchangeQuote_expiresAt_idx"                ON "ExchangeQuote"("expiresAt");

-- TransferProvider (در صورتی که بالا ساخته نشده بود)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='TransferProvider_exchangeId_fkey') THEN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='TransferProvider') THEN
    ALTER TABLE "TransferProvider" ADD CONSTRAINT "TransferProvider_exchangeId_fkey"
      FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END IF; END $$;

-- VirtualCard: accountId migration
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='VirtualCard' AND column_name='walletId') THEN
    ALTER TABLE "VirtualCard" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
    UPDATE "VirtualCard" SET "accountId" = "walletId" WHERE "accountId" IS NULL AND "walletId" IS NOT NULL;
    ALTER TABLE "VirtualCard" DROP COLUMN "walletId";
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "VirtualCard_accountId_idx" ON "VirtualCard"("accountId");

-- Device table
CREATE TABLE IF NOT EXISTS "Device" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "userAgent"   TEXT,
    "ip"          TEXT,
    "trusted"     BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='Device') THEN
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "userId" TEXT NOT NULL;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "fingerprint" TEXT NOT NULL;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "ip" TEXT;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "trusted" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Device_userId_fingerprint_key" ON "Device"("userId","fingerprint");
CREATE INDEX        IF NOT EXISTS "Device_userId_idx"             ON "Device"("userId");
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Device_userId_fkey') THEN
  ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
END IF; END $$;

-- ── 23. Deprecate AuditLog old columns (safe DROP IF EXISTS) ──
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "membershipId";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "namespace";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "newValues";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "oldValues";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "resourceId";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "resourceType";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "scopeId";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "scopeType";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "userAgent";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "userId";

-- Drop deprecated tables
DROP TABLE IF EXISTS "Activity";
DROP TABLE IF EXISTS "Wallet";
DROP TABLE IF EXISTS "memberships";
DROP TYPE  IF EXISTS "MembershipRole";
DROP TYPE  IF EXISTS "MembershipScopeType";
