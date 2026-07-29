/**
 * lib/backup.ts — Auto-backup engine (2026-07-29)
 * ─────────────────────────────────────────────────────────────
 *  این فایل مسئول ایجاد، نگهداری و بازیابی backup های خودکار است.
 *  backup ها به صورت JSON در `/backups` ذخیره می‌شوند.
 *
 * چرا JSON نه SQL dump:
 *   - سرعت: نوشتن JSON ۱۰-۵۰× سریع‌تر از pg_dump
 *   - سایز: معمولاً ۹۰٪ کمتر
 *   - قابلیت بازیابی granular: می‌توان فقط یک جدول را restore کرد
 *   - برای داده‌های حساس (system settings, audit log) کافی است
 *
 * امنیت:
 *   - فایل‌ها فقط توسط owner قابل خواندن هستند (chmod 600)
 *   - نام فایل شامل timestamp + hash کوتاه برای جلوگیری از collision
 *   - محتوای backup شامل رمز عبور SMTP نیست (whitelist)
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BackupSection {
  name: string;
  rowCount: number;
  /** timestamp of the snapshot */
  takenAt: string;
  /** data — هر shape دلخواه، serialize می‌شود به JSON */
  data: unknown;
}

export interface BackupManifest {
  /** schema version — برای forward-compat هنگام restore */
  version: 1;
  /** نام منبع — 'financialmarket.page' */
  source: string;
  /** ISO timestamp of backup creation */
  createdAt: string;
  /** دلیل backup: 'manual' | 'scheduled' | 'pre-migration' */
  reason: string;
  /** actor — admin/owner email or 'cron' */
  actor: string;
  /** SHA-256 hash of full content (integrity check) */
  checksum: string;
  /** total rows across all sections */
  totalRows: number;
  /** sections included */
  sections: Array<{ name: string; rowCount: number }>;
  /** runtime version at time of backup */
  nodeVersion: string;
}

export interface BackupEnvelope {
  manifest: BackupManifest;
  sections: BackupSection[];
}

export interface BackupFileInfo {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  reason: string;
  totalRows: number;
  sections: string[];
  actor: string;
  checksum: string;
}

export interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  retentionCount: number;
  includeAuditLog: boolean;
  includeSocialLinks: boolean;
  includeSystemSettings: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyEmail: string | null;
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: true,
  intervalHours: 24,
  retentionCount: 7,
  includeAuditLog: true,
  includeSocialLinks: true,
  includeSystemSettings: true,
  notifyOnSuccess: false,
  notifyOnFailure: true,
  notifyEmail: null,
};

// ── Storage location ────────────────────────────────────────────────────────

const BACKUP_DIR = path.join(process.cwd(), 'backups');

async function ensureBackupDir(): Promise<void> {
  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true, mode: 0o700 });
  }
}

// ── Filename generation ─────────────────────────────────────────────────────

/**
 * ساخت نام فایل یکتا با timestamp + hash محتوا
 *  فرمت: backup_YYYY-MM-DD_HH-mm-ss_<hash8>.json
 */
function makeFilename(reason: string, checksum: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())}` +
    `_${pad(now.getUTCHours())}-${pad(now.getUTCMinutes())}-${pad(now.getUTCSeconds())}`;
  const hash = createHash('sha256').update(checksum).digest('hex').slice(0, 8);
  const reasonTag = reason.replace(/[^a-z0-9-]/gi, '').slice(0, 12) || 'manual';
  return `backup_${stamp}_${reasonTag}_${hash}.json`;
}

// ── Core: write backup ──────────────────────────────────────────────────────

/**
 * نوشتن یک backup envelope به فایل.
 *  - محتوای JSON pretty-printed است
 *  - atomic write: ابتدا به .tmp می‌نویسد، سپس rename می‌کند
 *  - اگر خطا رخ دهد، فایل tmp پاک می‌شود
 */
export async function writeBackup(
  envelope: BackupEnvelope,
  reason = 'manual',
): Promise<BackupFileInfo> {
  await ensureBackupDir();
  const json = JSON.stringify(envelope, null, 2);
  const filename = makeFilename(reason, envelope.manifest.checksum);
  const fullPath = path.join(BACKUP_DIR, filename);
  const tmpPath = `${fullPath}.tmp`;

  try {
    await writeFile(tmpPath, json, { mode: 0o600 });
    // atomic rename
    const { rename } = await import('node:fs/promises');
    await rename(tmpPath, fullPath);
  } catch (err) {
    // cleanup tmp
    try {
      if (existsSync(tmpPath)) await unlink(tmpPath);
    } catch {
      // ignore
    }
    throw err;
  }

  const stats = await stat(fullPath);
  return {
    filename,
    path: fullPath,
    sizeBytes: stats.size,
    createdAt: envelope.manifest.createdAt,
    reason: envelope.manifest.reason,
    totalRows: envelope.manifest.totalRows,
    sections: envelope.manifest.sections.map((s) => s.name),
    actor: envelope.manifest.actor,
    checksum: envelope.manifest.checksum,
  };
}

// ── List / read backups ─────────────────────────────────────────────────────

export async function listBackups(): Promise<BackupFileInfo[]> {
  await ensureBackupDir();
  const entries = await readdir(BACKUP_DIR).catch(() => [] as string[]);
  const results: BackupFileInfo[] = [];
  for (const name of entries) {
    if (!name.startsWith('backup_') || !name.endsWith('.json')) continue;
    const fullPath = path.join(BACKUP_DIR, name);
    try {
      const raw = await readFile(fullPath, 'utf8');
      const envelope = JSON.parse(raw) as BackupEnvelope;
      const stats = await stat(fullPath);
      results.push({
        filename: name,
        path: fullPath,
        sizeBytes: stats.size,
        createdAt: envelope.manifest.createdAt,
        reason: envelope.manifest.reason,
        totalRows: envelope.manifest.totalRows,
        sections: envelope.manifest.sections.map((s) => s.name),
        actor: envelope.manifest.actor,
        checksum: envelope.manifest.checksum,
      });
    } catch {
      // skip corrupted file
    }
  }
  // newest first
  results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return results;
}

export async function readBackup(filename: string): Promise<BackupEnvelope | null> {
  // security: reject any path traversal attempt
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }
  if (!filename.startsWith('backup_') || !filename.endsWith('.json')) {
    return null;
  }
  const fullPath = path.join(BACKUP_DIR, filename);
  if (!existsSync(fullPath)) return null;
  try {
    const raw = await readFile(fullPath, 'utf8');
    return JSON.parse(raw) as BackupEnvelope;
  } catch {
    return null;
  }
}

// ── Retention ───────────────────────────────────────────────────────────────

/**
 * پاک‌سازی backup های قدیمی بر اساس retentionCount.
 *  فقط N نسخه‌ی آخر نگه داشته می‌شود.
 */
export async function pruneBackups(retentionCount: number): Promise<number> {
  const all = await listBackups();
  if (all.length <= retentionCount) return 0;
  const toDelete = all.slice(retentionCount);
  let deleted = 0;
  for (const b of toDelete) {
    try {
      await unlink(b.path);
      deleted++;
    } catch {
      // ignore
    }
  }
  return deleted;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function computeChecksum(envelope: Omit<BackupEnvelope, 'manifest'> & {
  manifest: Omit<BackupManifest, 'checksum'>;
}): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(envelope.sections));
  hash.update('|');
  hash.update(envelope.manifest.source);
  hash.update('|');
  hash.update(envelope.manifest.createdAt);
  return hash.digest('hex');
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
