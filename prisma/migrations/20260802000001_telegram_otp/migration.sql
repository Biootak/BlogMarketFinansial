-- 2026-08-05: Telegram OTP channel
-- User.telegramChatId + TelegramLinkToken model
-- رایگان — مناسب بازار افغانستان (SMS گران/کم‌پوشش)

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramChatId_key"
  ON "User"("telegramChatId");

CREATE TABLE IF NOT EXISTS "TelegramLinkToken" (
  "id"        TEXT     NOT NULL,
  "token"     TEXT     NOT NULL,
  "userId"    TEXT     NOT NULL,
  "used"      BOOLEAN  NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TelegramLinkToken_token_key"
  ON "TelegramLinkToken"("token");
CREATE INDEX IF NOT EXISTS "TelegramLinkToken_userId_idx"
  ON "TelegramLinkToken"("userId");
CREATE INDEX IF NOT EXISTS "TelegramLinkToken_expiresAt_idx"
  ON "TelegramLinkToken"("expiresAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TelegramLinkToken_userId_fkey') THEN
    ALTER TABLE "TelegramLinkToken"
      ADD CONSTRAINT "TelegramLinkToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
