-- 2026-07-04: افزودن فیلد `scheduledAt` به Post برای برنامه‌ریزی انتشار،
-- و مقدار جدید `SCHEDULED` به enum `PostStatus`.

-- AlterEnum
ALTER TYPE "PostStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Post_scheduledAt_idx" ON "Post"("scheduledAt");