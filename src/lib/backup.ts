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
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '@/lib/db';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

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

// ── S3 backup (optional — Vercel ephemeral filesystem safe) ─────────────────
// M8-fix: backups are mirrored to S3 so they survive Vercel redeploys.
// All operations are best-effort — a missing/misconfigured S3 never fails
// the primary filesystem backup.

const BACKUP_S3_PREFIX = 'backups/';

function buildS3Client(): S3Client | null {
  if (
    !process.env.LIARA_ENDPOINT ||
    !process.env.LIARA_ACCESS_KEY ||
    !process.env.LIARA_SECRET_KEY ||
    !process.env.LIARA_BUCKET_NAME
  )
    return null;
  return new S3Client({
    region: 'default',
    endpoint: process.env.LIARA_ENDPOINT,
    credentials: {
      accessKeyId: process.env.LIARA_ACCESS_KEY,
      secretAccessKey: process.env.LIARA_SECRET_KEY,
    },
    forcePathStyle: true,
    maxAttempts: 1,
    requestHandler: { requestTimeout: 5000, connectionTimeout: 4000 },
  });
}

async function uploadBackupToS3(filename: string, json: string): Promise<boolean> {
  const client = buildS3Client();
  if (!client) return false;
  // 2026-08-03: validate bucket name — if LIARA_BUCKET_NAME is unset,
  // cast to `string` silently produces undefined which crashes the S3 call.
  const bucket = process.env.LIARA_BUCKET_NAME;
  if (!bucket) return false;
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${BACKUP_S3_PREFIX}${filename}`,
        Body: Buffer.from(json, 'utf8'),
        ContentType: 'application/json',
        CacheControl: 'no-store',
      }),
    );
    return true;
  } catch {
    return false;
  }
}

async function readBackupFromS3(filename: string): Promise<string | null> {
  const client = buildS3Client();
  if (!client) return null;
  const bucket = process.env.LIARA_BUCKET_NAME;
  if (!bucket) return null;
  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `${BACKUP_S3_PREFIX}${filename}`,
      }),
    );
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    // @ts-expect-error — Body is a Node stream at runtime
    for await (const chunk of res.Body) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    return null;
  }
}

async function deleteBackupFromS3(filename: string): Promise<void> {
  const client = buildS3Client();
  if (!client) return;
  const bucket = process.env.LIARA_BUCKET_NAME;
  if (!bucket) return;
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: `${BACKUP_S3_PREFIX}${filename}`,
      }),
    );
  } catch {
    /* best-effort */
  }
}

async function listBackupsFromS3(): Promise<string[]> {
  const client = buildS3Client();
  if (!client) return [];
  const bucket = process.env.LIARA_BUCKET_NAME;
  if (!bucket) return [];
  try {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: BACKUP_S3_PREFIX }),
    );
    return (res.Contents ?? [])
      .map((obj) => obj.Key?.replace(BACKUP_S3_PREFIX, '') ?? '')
      .filter((k) => k.startsWith('backup_') && k.endsWith('.json'));
  } catch {
    return [];
  }
}

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

  // M8-fix: mirror to S3 so backup survives Vercel ephemeral filesystem
  // best-effort — filesystem backup already written, S3 failure is non-fatal
  await uploadBackupToS3(filename, json).catch(() => {});

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

  // M8-fix: merge local + S3 filenames (deduplicated), prefer local metadata
  const [localEntries, s3Names] = await Promise.all([
    readdir(BACKUP_DIR).catch(() => [] as string[]),
    listBackupsFromS3(),
  ]);

  const seen = new Set<string>();
  const results: BackupFileInfo[] = [];

  // local first (has stat + full content)
  for (const name of localEntries) {
    if (!name.startsWith('backup_') || !name.endsWith('.json')) continue;
    seen.add(name);
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

  // S3-only entries (e.g. after Vercel redeploy wiped local fs)
  for (const name of s3Names) {
    if (seen.has(name)) continue;
    try {
      const raw = await readBackupFromS3(name);
      if (!raw) continue;
      const envelope = JSON.parse(raw) as BackupEnvelope;
      results.push({
        filename: name,
        path: '',
        sizeBytes: Buffer.byteLength(raw, 'utf8'),
        createdAt: envelope.manifest.createdAt,
        reason: envelope.manifest.reason,
        totalRows: envelope.manifest.totalRows,
        sections: envelope.manifest.sections.map((s) => s.name),
        actor: envelope.manifest.actor,
        checksum: envelope.manifest.checksum,
      });
    } catch {
      // skip
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

  // try local filesystem first
  const fullPath = path.join(BACKUP_DIR, filename);
  if (existsSync(fullPath)) {
    try {
      const raw = await readFile(fullPath, 'utf8');
      return JSON.parse(raw) as BackupEnvelope;
    } catch {
      // fall through to S3
    }
  }

  // M8-fix: fallback to S3 (handles Vercel ephemeral fs wipe)
  try {
    const raw = await readBackupFromS3(filename);
    if (!raw) return null;
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
      // filesystem (path may be '' for S3-only entries)
      if (b.path) await unlink(b.path).catch(() => {});
      // M8-fix: also remove from S3
      await deleteBackupFromS3(b.filename);
      // DB record — best-effort
      await prisma.backupRun.deleteMany({ where: { filename: b.filename } }).catch(() => {});
      deleted++;
    } catch {
      // ignore
    }
  }
  return deleted;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function computeChecksum(
  envelope: Omit<BackupEnvelope, 'manifest'> & {
    manifest: Omit<BackupManifest, 'checksum'>;
  },
): string {
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

// ── runBackup — core backup logic (auth-free) ────────────────────────────────
//
// این تابع منطق ساخت backup را بدون نیاز به session اجرا می‌کند.
// فراخوانی‌ها:
//   - triggerBackup (server action) → actor = user.id
//   - /api/cron/backup              → actor = 'cron'

/**
 * اجرای backup کامل Prisma JSON.
 * @param reason  دلیل backup — نمایش در UI
 * @param actor   شناسه فراخوان — user.id یا 'cron'
 */
export async function runBackup(reason = 'manual', actor = 'cron'): Promise<BackupFileInfo> {
  const createdAt = new Date().toISOString();
  const sections: BackupEnvelope['sections'] = [];

  // SystemSettings
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings) {
      const { smtpPassword: _omit, ...safe } = settings as Record<string, unknown>;
      sections.push({ name: 'system_settings', rowCount: 1, takenAt: createdAt, data: safe });
    } else {
      sections.push({ name: 'system_settings', rowCount: 0, takenAt: createdAt, data: null });
    }
  } catch {
    sections.push({ name: 'system_settings', rowCount: 0, takenAt: createdAt, data: null });
  }

  // Social links
  try {
    const social = await prisma.socialLink.findMany();
    sections.push({
      name: 'social_links',
      rowCount: social.length,
      takenAt: createdAt,
      data: social,
    });
  } catch {
    /* skip */
  }

  // Audit log — last 1000 rows
  try {
    const audit = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 });
    sections.push({ name: 'audit_log', rowCount: audit.length, takenAt: createdAt, data: audit });
  } catch {
    /* skip */
  }

  // Exchange rates
  try {
    const rates = await prisma.exchangeRate.findMany({ take: 200 });
    sections.push({
      name: 'exchange_rates',
      rowCount: rates.length,
      takenAt: createdAt,
      data: rates,
    });
  } catch {
    /* skip */
  }

  const manifestWithoutChecksum = {
    version: 1 as const,
    source: 'financialmarket.page',
    createdAt,
    reason,
    actor,
    totalRows: sections.reduce((sum, s) => sum + s.rowCount, 0),
    sections: sections.map((s) => ({ name: s.name, rowCount: s.rowCount })),
    nodeVersion: process.version,
  };

  const checksum = computeChecksum({ sections, manifest: manifestWithoutChecksum });
  const envelope: BackupEnvelope = {
    manifest: { ...manifestWithoutChecksum, checksum },
    sections,
  };

  const info = await writeBackup(envelope, reason);

  // ثبت در جدول BackupRun
  try {
    await prisma.backupRun.create({
      data: {
        id: info.filename.replace(/[^a-z0-9]/gi, '').slice(0, 25),
        filename: info.filename,
        sizeBytes: info.sizeBytes,
        totalRows: info.totalRows,
        sections: info.sections,
        reason: info.reason,
        actor,
        checksum: info.checksum,
      },
    });
  } catch {
    /* ignore — filesystem backup already written */
  }

  // audit log (best-effort)
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor,
        action: 'BACKUP_TRIGGERED',
        meta: { filename: info.filename, sizeBytes: info.sizeBytes, totalRows: info.totalRows },
      },
    });
  } catch {
    /* ignore */
  }

  // H5-fix: retention از config خوانده می‌شود نه hardcoded 20
  let retentionCount = 20;
  try {
    const dbConfig = await prisma.backupConfig.findUnique({ where: { id: 'singleton' } });
    if (dbConfig?.retentionCount) retentionCount = dbConfig.retentionCount;
  } catch {
    /* ignore — از مقدار پیش‌فرض استفاده می‌شود */
  }
  await pruneBackups(retentionCount).catch(() => 0);

  return info;
}
