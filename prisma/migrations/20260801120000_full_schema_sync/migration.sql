-- ============================================================
-- Full schema sync — 2026-08-01
-- شامل: حذف جداول deprecated، جداول جدید، ستون‌ها، ایندکس‌ها
-- ============================================================

-- ── 1. Drop FK constraints (وابستگی‌ها اول حذف می‌شوند) ────

ALTER TABLE "Activity"        DROP CONSTRAINT IF EXISTS "Activity_userId_fkey";
ALTER TABLE "ApiKey"          DROP CONSTRAINT IF EXISTS "ApiKey_userId_fkey";
ALTER TABLE "AuditLog"        DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE "CreditRate"      DROP CONSTRAINT IF EXISTS "CreditRate_bankId_fkey";
ALTER TABLE "CustomerRequest" DROP CONSTRAINT IF EXISTS "CustomerRequest_serviceRequestId_fkey";
ALTER TABLE "Wallet"          DROP CONSTRAINT IF EXISTS "Wallet_accountId_fkey";
ALTER TABLE "Wallet"          DROP CONSTRAINT IF EXISTS "Wallet_customerId_fkey";
ALTER TABLE "Wallet"          DROP CONSTRAINT IF EXISTS "Wallet_exchangeId_fkey";
ALTER TABLE "Webhook"         DROP CONSTRAINT IF EXISTS "Webhook_userId_fkey";
ALTER TABLE "memberships"     DROP CONSTRAINT IF EXISTS "memberships_userId_fkey";

-- ── 2. Drop deprecated indexes ──────────────────────────────

DROP INDEX IF EXISTS "ApiCallLog_userId_createdAt_idx";
DROP INDEX IF EXISTS "ApiKey_scopes_idx";
DROP INDEX IF EXISTS "ApiKeyAudit_userId_createdAt_idx";
DROP INDEX IF EXISTS "ApiRateLimit_userId_action_window_idx";
DROP INDEX IF EXISTS "AuditLog_membershipId_idx";
DROP INDEX IF EXISTS "AuditLog_namespace_idx";
DROP INDEX IF EXISTS "AuditLog_resourceType_resourceId_idx";
DROP INDEX IF EXISTS "AuditLog_scopeType_scopeId_createdAt_idx";
DROP INDEX IF EXISTS "AuditLog_userId_createdAt_idx";
DROP INDEX IF EXISTS "Beneficiary_customerId_createdAt_idx";
DROP INDEX IF EXISTS "Customer_userId_exchangeId_key";
DROP INDEX IF EXISTS "CustomerRequest_serviceRequestId_key";
DROP INDEX IF EXISTS "VirtualCard_walletId_idx";
DROP INDEX IF EXISTS "WebhookDelivery_webhookId_createdAt_idx";

-- ── 3. Alter existing tables ────────────────────────────────

-- AuditLog: حذف ستون‌های deprecated
ALTER TABLE "AuditLog"
  DROP COLUMN IF EXISTS "membershipId",
  DROP COLUMN IF EXISTS "namespace",
  DROP COLUMN IF EXISTS "newValues",
  DROP COLUMN IF EXISTS "oldValues",
  DROP COLUMN IF EXISTS "resourceId",
  DROP COLUMN IF EXISTS "resourceType",
  DROP COLUMN IF EXISTS "scopeId",
  DROP COLUMN IF EXISTS "scopeType",
  DROP COLUMN IF EXISTS "userAgent",
  DROP COLUMN IF EXISTS "userId";

-- BackupConfig: type normalization
ALTER TABLE "BackupConfig"
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
  ALTER COLUMN "updatedAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- BackupRun
ALTER TABLE "BackupRun"
  ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- Bank
ALTER TABLE "Bank"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreditRate
ALTER TABLE "CreditRate"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CurrencyDeal: precision upgrade
ALTER TABLE "CurrencyDeal"
  ALTER COLUMN "fromAmount" SET DATA TYPE DECIMAL(20,6),
  ALTER COLUMN "toAmount"   SET DATA TYPE DECIMAL(20,6),
  ALTER COLUMN "feeAmount"  SET DATA TYPE DECIMAL(20,6);

-- CustomerRequest: حذف serviceRequestId
ALTER TABLE "CustomerRequest"
  DROP COLUMN IF EXISTS "serviceRequestId";

-- VirtualCard: walletId → accountId (nullable اول، بعد FK)
ALTER TABLE "VirtualCard"
  ADD COLUMN IF NOT EXISTS "accountId" TEXT;

ALTER TABLE "VirtualCard"
  DROP COLUMN IF EXISTS "walletId";

-- Webhook
ALTER TABLE "Webhook"
  ALTER COLUMN "events"    DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ── 4. Drop deprecated tables ────────────────────────────────

DROP TABLE IF EXISTS "Activity";
DROP TABLE IF EXISTS "Wallet";
DROP TABLE IF EXISTS "memberships";

-- ── 5. Drop deprecated enums ─────────────────────────────────

DROP TYPE IF EXISTS "MembershipRole";
DROP TYPE IF EXISTS "MembershipScopeType";

-- ── 6. Create new tables ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Announcement" (
    "id"             TEXT        NOT NULL,
    "title"          TEXT        NOT NULL,
    "body"           TEXT        NOT NULL,
    "channels"       TEXT        NOT NULL DEFAULT 'inapp',
    "audience"       TEXT        NOT NULL DEFAULT 'all',
    "audienceFilter" TEXT,
    "scheduledAt"    TIMESTAMP(3),
    "publishedAt"    TIMESTAMP(3),
    "expiresAt"      TIMESTAMP(3),
    "status"         TEXT        NOT NULL DEFAULT 'draft',
    "createdById"    TEXT        NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Campaign" (
    "id"             TEXT        NOT NULL,
    "name"           TEXT        NOT NULL,
    "description"    TEXT,
    "channel"        TEXT        NOT NULL DEFAULT 'email',
    "subject"        TEXT,
    "body"           TEXT        NOT NULL,
    "status"         TEXT        NOT NULL DEFAULT 'draft',
    "audience"       TEXT        NOT NULL DEFAULT 'all',
    "audienceFilter" TEXT,
    "scheduledAt"    TIMESTAMP(3),
    "startedAt"      TIMESTAMP(3),
    "completedAt"    TIMESTAMP(3),
    "statsSent"      INTEGER     NOT NULL DEFAULT 0,
    "statsOpened"    INTEGER     NOT NULL DEFAULT 0,
    "statsClicked"   INTEGER     NOT NULL DEFAULT 0,
    "statsBounced"   INTEGER     NOT NULL DEFAULT 0,
    "createdById"    TEXT        NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CampaignRecipient" (
    "id"           TEXT        NOT NULL,
    "campaignId"   TEXT        NOT NULL,
    "userId"       TEXT        NOT NULL,
    "status"       TEXT        NOT NULL DEFAULT 'pending',
    "sentAt"       TIMESTAMP(3),
    "openedAt"     TIMESTAMP(3),
    "clickedAt"    TIMESTAMP(3),
    "errorMessage" TEXT,
    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BackgroundJob" (
    "id"           TEXT        NOT NULL,
    "type"         TEXT        NOT NULL,
    "queue"        TEXT        NOT NULL DEFAULT 'default',
    "payload"      JSONB,
    "status"       TEXT        NOT NULL DEFAULT 'pending',
    "priority"     INTEGER     NOT NULL DEFAULT 0,
    "attempts"     INTEGER     NOT NULL DEFAULT 0,
    "maxAttempts"  INTEGER     NOT NULL DEFAULT 3,
    "scheduledAt"  TIMESTAMP(3),
    "startedAt"    TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    "failedAt"     TIMESTAMP(3),
    "errorMessage" TEXT,
    "errorStack"   TEXT,
    "result"       JSONB,
    "triggeredBy"  TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id"              TEXT        NOT NULL,
    "subject"         TEXT        NOT NULL,
    "description"     TEXT        NOT NULL,
    "status"          TEXT        NOT NULL DEFAULT 'open',
    "priority"        TEXT        NOT NULL DEFAULT 'normal',
    "category"        TEXT        NOT NULL DEFAULT 'general',
    "requesterId"     TEXT        NOT NULL,
    "requesterRole"   TEXT,
    "assignedToId"    TEXT,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt"      TIMESTAMP(3),
    "closedAt"        TIMESTAMP(3),
    "messageCount"    INTEGER     NOT NULL DEFAULT 0,
    "tags"            TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TicketMessage" (
    "id"          TEXT        NOT NULL,
    "ticketId"    TEXT        NOT NULL,
    "authorId"    TEXT        NOT NULL,
    "authorRole"  TEXT,
    "body"        TEXT        NOT NULL,
    "isInternal"  BOOLEAN     NOT NULL DEFAULT false,
    "attachments" JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- ── 7. New indexes ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Announcement_status_idx"    ON "Announcement"("status");
CREATE INDEX IF NOT EXISTS "Announcement_scheduledAt_idx" ON "Announcement"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Announcement_createdAt_idx"  ON "Announcement"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Campaign_status_idx"      ON "Campaign"("status");
CREATE INDEX IF NOT EXISTS "Campaign_scheduledAt_idx" ON "Campaign"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Campaign_createdAt_idx"   ON "Campaign"("createdAt" DESC);

CREATE INDEX  IF NOT EXISTS "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");
CREATE INDEX  IF NOT EXISTS "CampaignRecipient_userId_idx"            ON "CampaignRecipient"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_campaignId_userId_key" ON "CampaignRecipient"("campaignId", "userId");

CREATE INDEX IF NOT EXISTS "BackgroundJob_status_idx"      ON "BackgroundJob"("status");
CREATE INDEX IF NOT EXISTS "BackgroundJob_queue_status_idx" ON "BackgroundJob"("queue", "status");
CREATE INDEX IF NOT EXISTS "BackgroundJob_type_idx"        ON "BackgroundJob"("type");
CREATE INDEX IF NOT EXISTS "BackgroundJob_scheduledAt_idx" ON "BackgroundJob"("scheduledAt");
CREATE INDEX IF NOT EXISTS "BackgroundJob_createdAt_idx"   ON "BackgroundJob"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx"      ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx"    ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedToId_idx" ON "SupportTicket"("assignedToId");
CREATE INDEX IF NOT EXISTS "SupportTicket_requesterId_idx" ON "SupportTicket"("requesterId");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx"   ON "SupportTicket"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage"("ticketId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "TicketMessage_authorId_idx"           ON "TicketMessage"("authorId");

CREATE INDEX IF NOT EXISTS "ApiCallLog_userId_createdAt_idx"          ON "ApiCallLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiKeyAudit_userId_createdAt_idx"         ON "ApiKeyAudit"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiRateLimit_userId_action_windowStart_idx" ON "ApiRateLimit"("userId", "action", "windowStart");
CREATE INDEX IF NOT EXISTS "Beneficiary_customerId_createdAt_idx"     ON "Beneficiary"("customerId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Beneficiary_customerId_identifier_key" ON "Beneficiary"("customerId", "identifier");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_userId_key"               ON "Customer"("userId");
CREATE INDEX  IF NOT EXISTS "User_exchangePartnerId_idx"              ON "User"("exchangePartnerId");
CREATE INDEX  IF NOT EXISTS "VirtualCard_accountId_idx"               ON "VirtualCard"("accountId");
CREATE INDEX  IF NOT EXISTS "WebhookDelivery_webhookId_createdAt_idx" ON "WebhookDelivery"("webhookId", "createdAt");

-- ── 8. Add FK constraints ─────────────────────────────────────

ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- VirtualCard: ردیف‌های بدون accountId (داده test) حذف می‌شوند، بعد NOT NULL + FK
DELETE FROM "VirtualCard" WHERE "accountId" IS NULL;
ALTER TABLE "VirtualCard" ALTER COLUMN "accountId" SET NOT NULL;
ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "FintechAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditRate" ADD CONSTRAINT "CreditRate_bankId_fkey"
    FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 9. Rename indexes ─────────────────────────────────────────

ALTER INDEX IF EXISTS "CustomerRequest_customerId_created_at_idx"
    RENAME TO "CustomerRequest_customerId_createdAt_idx";
ALTER INDEX IF EXISTS "CustomerRequest_exchangeId_status_created_at_idx"
    RENAME TO "CustomerRequest_exchangeId_status_createdAt_idx";
ALTER INDEX IF EXISTS "CustomerRequest_status_created_at_idx"
    RENAME TO "CustomerRequest_status_createdAt_idx";
ALTER INDEX IF EXISTS "CustomerRequestStatusLog_requestId_created_at_idx"
    RENAME TO "CustomerRequestStatusLog_requestId_createdAt_idx";
ALTER INDEX IF EXISTS "ServiceClick_exchangeId_created_at_idx"
    RENAME TO "ServiceClick_exchangeId_createdAt_idx";
ALTER INDEX IF EXISTS "ServiceClick_serviceKey_created_at_idx"
    RENAME TO "ServiceClick_serviceKey_createdAt_idx";
ALTER INDEX IF EXISTS "ServiceClick_source_created_at_idx"
    RENAME TO "ServiceClick_source_createdAt_idx";
ALTER INDEX IF EXISTS "ServiceRequest_targetExchangeId_created_at_idx"
    RENAME TO "ServiceRequest_targetExchangeId_createdAt_idx";
