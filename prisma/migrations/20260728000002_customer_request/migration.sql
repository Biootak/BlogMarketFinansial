-- 2026-07-28: CustomerRequest — مدل واقعی درخواست‌های مشتری به صرافی
-- ----------------------------------------------------------------------------
-- جایگزین هک قبلی می‌شود که در آن createCustomerRequest یک Notification
-- با prefix [REQUEST:TYPE] می‌ساخت. این مدل source-of-truth است:
--   - trackingCode یکتا برای ارجاع کاربر
--   - status با timeline کامل (CustomerRequestStatusLog)
--   - payload ساختاریافته بر اساس نوع
-- ----------------------------------------------------------------------------
-- نکته: CustomerRequest هیچ FK به ServiceRequest ندارد — دو flow مستقل‌اند
--   - CustomerRequest: درون‌برنامه‌ای، customer-authenticated، درون پنل مشتری
--   - ServiceRequest: خارج‌برنامه‌ای، تلفنی/مهمان، بدون login
-- ----------------------------------------------------------------------------

-- CreateEnum
CREATE TYPE "CustomerRequestType" AS ENUM (
    'ACCOUNT_NEW',
    'ACCOUNT_UNFREEZE',
    'TRANSFER_INITIATE',
    'LIMIT_INCREASE',
    'OTHER'
);

CREATE TYPE "CustomerRequestStatus" AS ENUM (
    'PENDING',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

-- CreateTable: CustomerRequest
CREATE TABLE "CustomerRequest" (
    "id"           TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "customerId"   TEXT NOT NULL,
    "exchangeId"   TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "type"         "CustomerRequestType" NOT NULL,
    "status"       "CustomerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "payload"      JSONB,
    "note"         TEXT,
    "resolution"   TEXT,
    "reviewedById" TEXT,
    "reviewedAt"   TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CustomerRequestStatusLog
CREATE TABLE "CustomerRequestStatusLog" (
    "id"         TEXT NOT NULL,
    "requestId"  TEXT NOT NULL,
    "fromStatus" "CustomerRequestStatus",
    "toStatus"   "CustomerRequestStatus" NOT NULL,
    "actorId"    TEXT,
    "actorRole"  TEXT,
    "note"       TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRequestStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRequest_trackingCode_key" ON "CustomerRequest"("trackingCode");

CREATE INDEX "CustomerRequest_customerId_created_at_idx"
    ON "CustomerRequest"("customerId", "createdAt" DESC);

CREATE INDEX "CustomerRequest_customerId_status_idx"
    ON "CustomerRequest"("customerId", "status");

CREATE INDEX "CustomerRequest_exchangeId_status_created_at_idx"
    ON "CustomerRequest"("exchangeId", "status", "createdAt" DESC);

CREATE INDEX "CustomerRequest_status_created_at_idx"
    ON "CustomerRequest"("status", "createdAt" DESC);

CREATE INDEX "CustomerRequest_type_status_idx"
    ON "CustomerRequest"("type", "status");

CREATE INDEX "CustomerRequest_userId_idx" ON "CustomerRequest"("userId");

CREATE INDEX "CustomerRequestStatusLog_requestId_created_at_idx"
    ON "CustomerRequestStatusLog"("requestId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CustomerRequest"
    ADD CONSTRAINT "CustomerRequest_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerRequest"
    ADD CONSTRAINT "CustomerRequest_exchangeId_fkey"
    FOREIGN KEY ("exchangeId") REFERENCES "Exchange"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerRequestStatusLog"
    ADD CONSTRAINT "CustomerRequestStatusLog_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "CustomerRequest"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
