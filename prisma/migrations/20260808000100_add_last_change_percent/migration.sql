-- Add lastChangePercent and lastChangeAt to ExchangeRate
ALTER TABLE "ExchangeRate" ADD COLUMN "lastChangePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ExchangeRate" ADD COLUMN "lastChangeAt" TIMESTAMP(3);
