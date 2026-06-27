-- 2026-06-23: unified OTP model.
-- Token field is repurposed to hold a 6-digit string instead of a UUID.
-- Old UUID tokens (still in DB) cannot match any 6-digit code so they
-- will expire on their own — no destructive cleanup required.

-- AlterTable
ALTER TABLE "VerificationToken"
  ALTER COLUMN "token" TYPE VARCHAR(255);

-- Columns added with safe defaults so existing rows are valid immediately.
ALTER TABLE "VerificationToken"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "intent" TEXT NOT NULL DEFAULT 'register';

-- Indexes for the new lookup by email / expires that the consume flow does.
CREATE INDEX IF NOT EXISTS "VerificationToken_email_idx"
  ON "VerificationToken"("email");

CREATE INDEX IF NOT EXISTS "VerificationToken_expires_idx"
  ON "VerificationToken"("expires");
