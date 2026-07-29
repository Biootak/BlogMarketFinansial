-- Migration: backup_config_and_run
-- جدول تنظیمات backup (singleton) + جدول رکوردهای هر backup

-- ── BackupConfig ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BackupConfig" (
  "id"                    TEXT         NOT NULL DEFAULT 'singleton',
  "enabled"               BOOLEAN      NOT NULL DEFAULT true,
  "intervalHours"         INTEGER      NOT NULL DEFAULT 24,
  "retentionCount"        INTEGER      NOT NULL DEFAULT 7,
  "includeAuditLog"       BOOLEAN      NOT NULL DEFAULT true,
  "includeSocialLinks"    BOOLEAN      NOT NULL DEFAULT true,
  "includeSystemSettings" BOOLEAN      NOT NULL DEFAULT true,
  "notifyOnSuccess"       BOOLEAN      NOT NULL DEFAULT false,
  "notifyOnFailure"       BOOLEAN      NOT NULL DEFAULT true,
  "notifyEmail"           TEXT,
  "createdAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "BackupConfig_pkey" PRIMARY KEY ("id")
);

-- ── BackupRun ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "BackupRun" (
  "id"        TEXT         NOT NULL,
  "filename"  TEXT         NOT NULL,
  "sizeBytes" INTEGER      NOT NULL,
  "totalRows" INTEGER      NOT NULL,
  "sections"  TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "reason"    TEXT         NOT NULL DEFAULT 'manual',
  "actor"     TEXT,
  "checksum"  TEXT,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "BackupRun_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "BackupRun_filename_key" UNIQUE ("filename")
);

CREATE INDEX IF NOT EXISTS "BackupRun_createdAt_idx" ON "BackupRun" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "BackupRun_reason_idx"    ON "BackupRun" ("reason");
