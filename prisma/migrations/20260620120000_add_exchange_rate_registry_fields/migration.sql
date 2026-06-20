-- 2026-06-20: افزودن فیلدهای registry به ExchangeRate
-- ----------------------------------------------------------------------------
-- قبلاً جدول ExchangeRate فقط name/currency/rateType/buyRate/sellRate/singleRate
-- داشت. برای market-rates rebuild (single source of truth) به این ستون‌ها نیاز
-- داریم تا هر ردیف self-describing باشد (نام فارسی، گروه، واحد، اولویت، منبع،
-- کلید TGJU، وضعیت فعال).
--
-- بعد از این migration، `assembler.ts` می‌تواند fallback legacy mode را حذف
-- کند چون schema تضمین می‌کند ستون‌ها وجود دارند.
-- ----------------------------------------------------------------------------

-- AlterTable: ستون‌های جدید (همه NULL/default-safe پس بدون downtime)
ALTER TABLE "ExchangeRate"
  ADD COLUMN "symbol"         TEXT,
  ADD COLUMN "displayNameFa"  TEXT,
  ADD COLUMN "group"          TEXT,
  ADD COLUMN "unit"           TEXT,
  ADD COLUMN "divisor"        INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "decimals"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priority"       INTEGER NOT NULL DEFAULT 99,
  ADD COLUMN "provider"       TEXT    NOT NULL DEFAULT 'manual',
  ADD COLUMN "tgjuKey"        TEXT,
  ADD COLUMN "active"         BOOLEAN NOT NULL DEFAULT true;

-- Backfill symbol از currency (برای ردیف‌های قدیمی seed اولیه)
-- symbol یکتا خواهد شد اما backfill امکان تکراری دارد، پس:
--   1. اول symbol = currency
UPDATE "ExchangeRate" SET "symbol" = "currency" WHERE "symbol" IS NULL;

--   2. اگر duplicate پیش آمد، suffix عددی بزن تا unique بشود
DO $$
DECLARE
  rec RECORD;
  suffix INT;
BEGIN
  FOR rec IN
    SELECT "id", "symbol", ROW_NUMBER() OVER (
      PARTITION BY "symbol" ORDER BY "createdAt"
    ) AS rn
    FROM "ExchangeRate"
    WHERE "symbol" IS NOT NULL
  LOOP
    IF rec.rn > 1 THEN
      suffix := rec.rn - 1;
      UPDATE "ExchangeRate"
        SET "symbol" = rec.symbol || '_' || suffix::TEXT
        WHERE "id" = rec.id;
    END IF;
  END LOOP;
END $$;

-- Backfill displayNameFa از name
UPDATE "ExchangeRate" SET "displayNameFa" = "name" WHERE "displayNameFa" IS NULL;

-- Backfill مقادیر منطقی برای ردیف‌های قدیمی
UPDATE "ExchangeRate"
   SET "provider"  = 'manual',
       "divisor"   = 10,
       "decimals"  = 0,
       "priority"  = 99,
       "active"    = true
 WHERE "symbol" IS NOT NULL
   AND "provider" = 'manual';

-- برای ردیف‌هایی که قبلاً singleRate داشتن ولی symbol نداشتن (legacy دستی)
UPDATE "ExchangeRate"
   SET "active" = true
 WHERE "active" = false
   AND "singleRate" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_symbol_key" ON "ExchangeRate"("symbol");
CREATE INDEX "ExchangeRate_active_priority_idx" ON "ExchangeRate"("active", "priority");
CREATE INDEX "ExchangeRate_symbol_idx" ON "ExchangeRate"("symbol");
