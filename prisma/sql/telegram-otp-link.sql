-- Telegram OTP link (additive) — applied via prisma db execute because
-- the repo's migration history is already drifted (pre-existing):
--   20260802000000_production_sync: not applied on this DB
--   20260724000000_shells_t0_customer_multi_tenant: applied but missing locally
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramChatId_key" ON "User"("telegramChatId");

CREATE TABLE IF NOT EXISTS "TelegramLinkToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLinkToken_token_key" ON "TelegramLinkToken"("token");
CREATE INDEX IF NOT EXISTS "TelegramLinkToken_userId_idx" ON "TelegramLinkToken"("userId");
CREATE INDEX IF NOT EXISTS "TelegramLinkToken_expiresAt_idx" ON "TelegramLinkToken"("expiresAt");
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
