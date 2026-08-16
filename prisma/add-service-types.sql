-- 2026-08-16: add MOBILE_TOPUP and BILL_PAYMENT to ServiceType enum
DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'MOBILE_TOPUP'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ServiceType')
  ) THEN
    ALTER TYPE "ServiceType" ADD VALUE 'MOBILE_TOPUP';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'BILL_PAYMENT'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ServiceType')
  ) THEN
    ALTER TYPE "ServiceType" ADD VALUE 'BILL_PAYMENT';
  END IF;
END
$body$;
