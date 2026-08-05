-- AlterTable: add contact, social, and maintenance fields to SystemSettings
ALTER TABLE "SystemSettings"
  ADD COLUMN IF NOT EXISTS "maintenanceMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "contactEmail"       TEXT,
  ADD COLUMN IF NOT EXISTS "contactPhone"       TEXT,
  ADD COLUMN IF NOT EXISTS "contactAddress"     TEXT,
  ADD COLUMN IF NOT EXISTS "telegram"           TEXT,
  ADD COLUMN IF NOT EXISTS "instagram"          TEXT,
  ADD COLUMN IF NOT EXISTS "whatsapp"           TEXT,
  ADD COLUMN IF NOT EXISTS "twitter"            TEXT;
