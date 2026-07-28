-- 20260728000003_customer_beneficiaries.sql
--
-- اضافه کردن customerId به Beneficiary تا Customer Portal بتواند
-- مخاطبان مستقل از User-level beneficiaries داشته باشد.
-- یکی از userId یا customerId باید پر باشد؛ unique ها به ازای هر مالک.
-- هیچ migration داده‌ای لازم نیست چون قبلاً userId اجباری بود
-- و الان nullable می‌شود. رکوردهای موجود userId پر دارند، پس همچنان unique.

ALTER TABLE "Beneficiary"
  ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Beneficiary"
  ADD COLUMN "customerId" TEXT;

ALTER TABLE "Beneficiary"
  ADD CONSTRAINT "Beneficiary_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- برای userId null (مخاطبان customer) و customerId null (مخاطبان user)
-- PostgreSQL اجازه می‌دهد چند null در unique column داشته باشیم
-- اما بهتر است explicit constraint بسازیم.
CREATE UNIQUE INDEX "Beneficiary_customerId_identifier_key"
  ON "Beneficiary"("customerId", "identifier")
  WHERE "customerId" IS NOT NULL;

CREATE INDEX "Beneficiary_customerId_createdAt_idx"
  ON "Beneficiary"("customerId", "createdAt" DESC);
