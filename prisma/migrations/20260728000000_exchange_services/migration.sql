-- 2026-07-28: خدمات آنلاین صرافی — هر صرافی از داشبورد خود سرویس‌هایش را انتخاب می‌کند.
-- ----------------------------------------------------------------------------
-- هدف: صفحه عمومی صرافی و بازارچه مرکزی /services بتوانند بدون full-scan بفهمند
-- کدام صرافی چه سرویس‌هایی فعال دارد. کلید serviceKey با ServiceType enum یکسان است
-- تا با ServiceRequest موجود سازگار باشد.
-- ----------------------------------------------------------------------------

-- CreateTable
CREATE TABLE "ExchangeService" (
    "id"          TEXT NOT NULL,
    "exchangeId"  TEXT NOT NULL,
    "serviceKey"  TEXT NOT NULL,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "ctaHref"     TEXT,
    "order"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeService_exchangeId_serviceKey_key"
    ON "ExchangeService"("exchangeId", "serviceKey");

CREATE INDEX "ExchangeService_exchangeId_isActive_order_idx"
    ON "ExchangeService"("exchangeId", "isActive", "order");

CREATE INDEX "ExchangeService_serviceKey_isActive_idx"
    ON "ExchangeService"("serviceKey", "isActive");

-- AddForeignKey
ALTER TABLE "ExchangeService"
    ADD CONSTRAINT "ExchangeService_exchangeId_fkey"
    FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- ServiceRequest.targetExchangeId — درخواست مستقیم از صفحه صرافی
-- ----------------------------------------------------------------------------

-- AlterTable
ALTER TABLE "ServiceRequest"
    ADD COLUMN "targetExchangeId" TEXT;

-- CreateIndex
CREATE INDEX "ServiceRequest_targetExchangeId_status_idx"
    ON "ServiceRequest"("targetExchangeId", "status");

CREATE INDEX "ServiceRequest_targetExchangeId_created_at_idx"
    ON "ServiceRequest"("targetExchangeId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ServiceRequest"
    ADD CONSTRAINT "ServiceRequest_targetExchangeId_fkey"
    FOREIGN KEY ("targetExchangeId") REFERENCES "Exchange"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
