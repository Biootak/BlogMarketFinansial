-- ────────────────────────────────────────────────────────────────────────────
-- Migration: Progressive Capture + SUPPORT role + phone validation (2026-07-10)
-- Run with: npx prisma db execute --file prisma/migrations/manual_progressive_capture.sql --schema prisma/schema.prisma
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Add SUPPORT to Role enum (safe: addValue is non-destructive)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPPORT';

-- 2. Add phoneVerified + emailVerified to ServiceRequest
ALTER TABLE "ServiceRequest"
  ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add idempotencyKey (unique) to ServiceRequest
ALTER TABLE "ServiceRequest"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ServiceRequest_idempotencyKey_key'
  ) THEN
    ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_idempotencyKey_key" UNIQUE ("idempotencyKey");
  END IF;
END$$;

-- 4. Index for idempotencyKey lookups
CREATE INDEX IF NOT EXISTS "ServiceRequest_idempotencyKey_idx" ON "ServiceRequest" ("idempotencyKey");
