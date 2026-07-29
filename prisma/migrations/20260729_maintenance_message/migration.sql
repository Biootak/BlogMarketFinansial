-- 2026-07-29: فیلد maintenanceMessage به SystemSettings اضافه شد
-- این migration باید روی production اجرا شود
-- قبل از آن، اگر DB فیلد را نداشته باشد، مقدار null برمی‌گردد (ایمن)

ALTER TABLE "SystemSettings"
  ADD COLUMN IF NOT EXISTS "maintenanceMessage" TEXT;

COMMENT ON COLUMN "SystemSettings"."maintenanceMessage" IS 'پیام سفارشی نمایش‌داده‌شده در صفحه تعمیرات — ادمین ارشد ویرایش می‌کند';
