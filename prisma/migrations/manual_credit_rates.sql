-- Migration: Bank + CreditRate
-- Adds:
--   - enum CreditRateType (9 product types)
--   - Bank model (banks/credit institutions)
--   - CreditRate model (per-bank loan/deposit products)

-- 1. Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CreditRateType') THEN
    CREATE TYPE "CreditRateType" AS ENUM (
      'MORTGAGE',
      'PERSONAL',
      'AUTO',
      'BUSINESS',
      'QARD_AL_HASAN',
      'EDUCATION',
      'AGRICULTURE',
      'COMMERCIAL',
      'DEPOSIT',
      'OTHER'
    );
  END IF;
END $$;

-- 2. Bank
CREATE TABLE IF NOT EXISTS "Bank" (
  "id"          TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "displayName" TEXT,
  "country"     TEXT NOT NULL DEFAULT 'AF',
  "city"        TEXT,
  "logoUrl"     TEXT,
  "website"     TEXT,
  "licenseNo"   TEXT,
  "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
  "isVisible"   BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Bank_slug_key" ON "Bank"("slug");
CREATE INDEX IF NOT EXISTS "Bank_status_isVisible_sortOrder_idx"
  ON "Bank"("status", "isVisible", "sortOrder");

-- 3. CreditRate
CREATE TABLE IF NOT EXISTS "CreditRate" (
  "id"             TEXT NOT NULL,
  "bankId"         TEXT NOT NULL,
  "type"           "CreditRateType" NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "annualRate"     DECIMAL(6,3) NOT NULL,
  "minAmountCents" BIGINT NOT NULL DEFAULT 0,
  "maxAmountCents" BIGINT NOT NULL DEFAULT 0,
  "maxTermMonths"  INTEGER NOT NULL DEFAULT 0,
  "depositRatio"   DECIMAL(5,2),
  "currency"       TEXT NOT NULL DEFAULT 'AFN',
  "status"         TEXT NOT NULL DEFAULT 'ACTIVE',
  "effectiveFrom"  TIMESTAMP(3),
  "effectiveTo"    TIMESTAMP(3),
  "source"         TEXT,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "internalNote"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CreditRate_bankId_status_sortOrder_idx"
  ON "CreditRate"("bankId", "status", "sortOrder");
CREATE INDEX IF NOT EXISTS "CreditRate_type_status_idx"
  ON "CreditRate"("type", "status");
CREATE INDEX IF NOT EXISTS "CreditRate_annualRate_idx"
  ON "CreditRate"("annualRate");

-- 4. Foreign Key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CreditRate_bankId_fkey'
  ) THEN
    ALTER TABLE "CreditRate"
      ADD CONSTRAINT "CreditRate_bankId_fkey"
      FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE CASCADE;
  END IF;
END $$;
