-- 20260729_customer_security_prefs.sql
--
-- 2026-07-29: ترجیحات امنیتی و اشتراک‌گذاری برای Customer Portal.
-- - User.notifyVoice: دریافت تماس صوتی برای رویدادهای امنیتی
-- - User.monthlyActivityReport: دریافت گزارش ماهانه فعالیت
-- - Customer.shareWithExchange: اشتراک‌گذاری الگوی تراکنش با صرافی
--
-- همهٔ فیلدها اختیاری با مقدار پیش‌فرض false — هیچ رکورد موجودی تغییر نمی‌کند.
-- بدون نیاز به backfill.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "notifyVoice" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "monthlyActivityReport" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "shareWithExchange" BOOLEAN NOT NULL DEFAULT false;

-- ایندکس برای گزارش‌های ماهانه (اگر بعداً cron job اضافه شد)
CREATE INDEX IF NOT EXISTS "User_monthlyActivityReport_idx"
  ON "User"("monthlyActivityReport")
  WHERE "monthlyActivityReport" = true;
