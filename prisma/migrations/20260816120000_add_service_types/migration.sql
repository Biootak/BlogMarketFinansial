-- Migration: add_service_types
-- 2026-08-16: ServiceType enum in schema.prisma has MOBILE_TOPUP / BILL_PAYMENT
-- (added 2026-08-16, never migrated) and TRAVEL_TICKET (new). All three are
-- additive enum values — Postgres allows adding values to an enum without
-- rewriting existing rows.
--
-- ⚠️ Apply with: npx prisma migrate deploy  (production)
-- Rollback plan: values are additive; nothing reads them until code ships.
--   (A reverse migration is possible with ALTER TYPE ... RENAME/swap, but it is
--   not needed unless we want to remove the values before any row uses them.)

ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'MOBILE_TOPUP';
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'BILL_PAYMENT';
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'TRAVEL_TICKET';
