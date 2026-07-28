-- 2026-07-28: بهبود ExchangeService + جدول ServiceClick (analytics)
-- ----------------------------------------------------------------------------
-- ۱. SLA: ستون leadTimeMin روی ExchangeService برای زمان پاسخ‌گویی
-- ۲. ServiceClick: ثبت هر کلیک روی کارت سرویس — heatmap + ranking
-- ----------------------------------------------------------------------------

-- AlterTable
ALTER TABLE "ExchangeService"
    ADD COLUMN "leadTimeMin" INTEGER;

-- CreateTable: ServiceClick
CREATE TABLE "ServiceClick" (
    "id"          TEXT NOT NULL,
    "exchangeId"  TEXT,
    "serviceKey"  TEXT NOT NULL,
    "source"      TEXT NOT NULL,
    "userId"      TEXT,
    "ipAddress"   TEXT,
    "userAgent"   TEXT,
    "referer"     TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceClick_serviceKey_created_at_idx"
    ON "ServiceClick"("serviceKey", "createdAt" DESC);

CREATE INDEX "ServiceClick_exchangeId_created_at_idx"
    ON "ServiceClick"("exchangeId", "createdAt" DESC);

CREATE INDEX "ServiceClick_source_created_at_idx"
    ON "ServiceClick"("source", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ServiceClick"
    ADD CONSTRAINT "ServiceClick_exchangeId_fkey"
    FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
