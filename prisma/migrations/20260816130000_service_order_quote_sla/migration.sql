-- 2026-08-16: Quote-at-checkout + SLA + final terms روی ServiceRequest
-- نکته: قید یکتای User.phoneNumber که در همین سشن در schema بود به‌خاطر داده
-- تکراری existing اعمال نشد (مال تسک دیگری است) — این migration فقط تغییرات
-- اعمال‌شدهٔ واقعی را ثبت می‌کند.

-- AlterEnum
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "finalFeeAf" DECIMAL(20,2),
ADD COLUMN     "finalRate" DECIMAL(20,6),
ADD COLUMN     "finalTotalAf" DECIMAL(20,2),
ADD COLUMN     "paidAmountAf" DECIMAL(20,2),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "quoteExpiresAt" TIMESTAMP(3),
ADD COLUMN     "quoteFeeAf" DECIMAL(20,2),
ADD COLUMN     "quoteRate" DECIMAL(20,6),
ADD COLUMN     "quoteTotalAf" DECIMAL(20,2),
ADD COLUMN     "slaDueAt" TIMESTAMP(3),
ADD COLUMN     "slaEscalatedAt" TIMESTAMP(3);
