-- Add siteUrl to SystemSettings
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "siteUrl" TEXT;
