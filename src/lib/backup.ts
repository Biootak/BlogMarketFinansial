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
import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '@/lib/db';
import { type S3PoolMember, buildPoolFromEntries } from '@/lib/s3-clients';
import { nextUploadBucketIndex, parseS3Pool } from '@/lib/s3-pool';
import { serverLog } from '@/lib/server-logger';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
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

/**
 * JSON replacer امن برای BigInt.
 *
 * چند جدول (Exchange.dailyLimitAf و…) ستون `BigInt` دارند؛ `JSON.stringify` روی
 * BigInt throw می‌کند (`Do not know how to serialize a BigInt`) و کل backup را
 * با 500 می‌شکست (مشاهده‌شده در prod در /api/cron/backup).
 * BigInt به رشته تبدیل می‌شود تا دقت از دست نرود.
 */
export function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

// ── Storage location ────────────────────────────────────────────────────────

const BACKUP_DIR = path.join(process.cwd(), 'backups');

// ── S3 backup (optional — Heroku ephemeral filesystem safe) ───────────────
// M8-fix: backups are mirrored to S3 so they survive Heroku dyno restarts.
// All operations are best-effort — a missing/misconfigured S3 never fails
// the primary filesystem backup.

const BACKUP_S3_PREFIX = 'backups/';

// ── پول باکت‌های S3-compatible (همان s3-pool که storage.ts استفاده می‌کند) ──
// backup ها زیر پیشوند `backups/` در همان پول باکت‌های مصرف ذخیره می‌شوند:
//   آپلود → round-robin بین باکت‌ها (اولین موفق برنده است)
//   خواندن → همهٔ باکت‌ها به موازات، اولین موفق
//   حذف/لیست → همهٔ باکت‌ها (لیست dedupe می‌شود)
// Legacy (بدون S3_POOL): همان رفتار قبلی با یک باکت از S3_*.

// backup در پس‌زمینه (cron/ادمین) اجرا می‌شود — timeout بزرگ‌تر از پیش‌فرض
// ذخیره‌سازی (که برای آپلود کاربر تند است) تا فایل‌های JSON بزرگ هم آپلود شوند.
const BACKUP_TIMEOUTS = { requestTimeout: 5000, connectionTimeout: 4000 };

/**
 * پول S3 برای backup — ساخته‌شده از `parseS3Pool()` در اولین import.
 *
 * امنیت legacy: اگر `S3_BACKUP_BUCKET` ست باشد (بدون S3_POOL)، باکت اختصاصی
 * backup جایگزین باکت تصاویر می‌شود تا فایل‌های JSON حاوی ایمیل/موبایل/هش
 * پسورد در باکت عمومی (R2/B2 با URL عمومی) قابل دانلود نباشد. در حالت پول
 * (Filebase و…) همهٔ باکت‌ها خصوصی‌اند و پیشوند `backups/` کافی است.
 */
const POOL: S3PoolMember[] = (() => {
  const entries = parseS3Pool();
  if (entries.length === 0) return [];
  const dedicated = process.env.S3_BACKUP_BUCKET;
  const buckets =
    dedicated && !process.env.S3_POOL && entries.length === 1
      ? [{ ...entries[0], bucket: dedicated }]
      : entries;
  if (!dedicated && !process.env.S3_POOL && entries.length === 1 && process.env.S3_PUBLIC_URL) {
    // فقط یک‌بار در هر restart: باکت تصاویر public است و backup در همان باکت می‌رود.
    serverLog.warn('backup', 's3-backup-bucket-shared-with-public', {
      message:
        'S3_BACKUP_BUCKET تنظیم نشده و S3_PUBLIC_URL ست شده — backup در باکت عمومی تصاویر ذخیره می‌شود',
    });
  }
  return buildPoolFromEntries(buckets, BACKUP_TIMEOUTS);
})();

const POOL_SIZE = POOL.length;
/** شمارندهٔ round-robin برای توزیع آپلودها بین باکت‌ها. */
let uploadCounter = 0;

async function uploadBackupToS3(filename: string, json: string): Promise<boolean> {
  if (POOL_SIZE === 0) return false;
  const key = `${BACKUP_S3_PREFIX}${filename}`;
  // round-robin: از ایندکس بعدی شروع کن؛ اگر باکتی خطا داد باکت بعدی امتحان می‌شود.
  const start = nextUploadBucketIndex(POOL_SIZE, uploadCounter++);
  for (let i = 0; i < POOL_SIZE; i++) {
    const entry = POOL[(start + i) % POOL_SIZE];
    try {
      await entry.client.send(
        new PutObjectCommand({
          Bucket: entry.bucket,
          Key: key,
          Body: Buffer.from(json, 'utf8'),
          ContentType: 'application/json',
          CacheControl: 'no-store',
        }),
      );
      return true;
    } catch {
      // باکت بعدی را امتحان کن
    }
  }
  return false;
}

async function readBackupFromS3(filename: string): Promise<string | null> {
  if (POOL_SIZE === 0) return null;
  const key = `${BACKUP_S3_PREFIX}${filename}`;
  // همهٔ باکت‌ها به موازات پرسیده می‌شوند؛ اولین موفق برمی‌گردد.
  const settled = await Promise.allSettled(
    POOL.map((entry) =>
      entry.client.send(new GetObjectCommand({ Bucket: entry.bucket, Key: key })),
    ),
  );
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const body = result.value.Body;
    if (!body) continue;
    const chunks: Uint8Array[] = [];
    // Body در runtime یک Node Readable است؛ تایپ اتحاد SDK آن را پوشش نمی‌دهد
    const stream = body as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  }
  return null;
}

async function deleteBackupFromS3(filename: string): Promise<void> {
  if (POOL_SIZE === 0) return;
  const key = `${BACKUP_S3_PREFIX}${filename}`;
  // از همهٔ باکت‌ها حذف کن (best-effort — بعضی باکت‌ها ممکن است object نداشته باشند).
  await Promise.allSettled(
    POOL.map((entry) =>
      entry.client.send(new DeleteObjectCommand({ Bucket: entry.bucket, Key: key })),
    ),
  );
}

async function listBackupsFromS3(): Promise<string[]> {
  if (POOL_SIZE === 0) return [];
  const settled = await Promise.allSettled(
    POOL.map((entry) =>
      entry.client.send(
        new ListObjectsV2Command({ Bucket: entry.bucket, Prefix: BACKUP_S3_PREFIX }),
      ),
    ),
  );
  const names = new Set<string>();
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const obj of result.value.Contents ?? []) {
      const name = (obj.Key ?? '').replace(BACKUP_S3_PREFIX, '');
      if (name.startsWith('backup_') && name.endsWith('.json')) names.add(name);
    }
  }
  return [...names];
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
  const json = JSON.stringify(envelope, jsonReplacer, 2);
  const filename = makeFilename(reason, envelope.manifest.checksum);
  const fullPath = path.join(BACKUP_DIR, filename);
  const tmpPath = `${fullPath}.tmp`;

  try {
    await writeFile(tmpPath, json, { mode: 0o600 });
    // atomic rename
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

  // M8-fix: mirror to S3 so backup survives Heroku ephemeral filesystem
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

  // S3-only entries (e.g. after Heroku dyno restart wiped local fs)
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

  // M8-fix: fallback to S3 (handles Heroku ephemeral fs wipe)
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
  hash.update(JSON.stringify(envelope.sections, jsonReplacer));
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

// ── Full-data sections (beyond the original 4) ─────────────────────────────
// 2026-08-07: backup فقط ۴ جدول کوچک را پوشش می‌داد — در عمل «backup دیتابیس»
// نبود (پست‌ها، کاربران، کامنت‌ها و … جایی ذخیره نمی‌شدند). حالا محتوای اصلی
// سایت هم شامل می‌شود. مقادیر take سقفِ محافظه‌کارانه برای حجم JSON است؛
// می‌توان برای سایت بزرگ‌تر آن را بالا برد.

/** فیلدهای حساسی که هرگز در backup نباید بروند. */
const SECRET_FIELDS = {
  user: ['twoFactorSecret', 'twoFactorSecretEnc', 'nationalIdHash'],
  systemSettings: ['smtpPassword'],
} as const;

/** حذف فیلدهای حساس از آبجکت — برای جداول بدون whitelist هم امن است. */
function stripSecrets<T>(table: string, rows: T[]): T[] {
  const fields = SECRET_FIELDS[table as keyof typeof SECRET_FIELDS];
  if (!fields) return rows;
  return rows.map((r) => {
    if (typeof r !== 'object' || r === null) return r;
    const obj = { ...(r as Record<string, unknown>) };
    for (const f of fields) delete obj[f];
    return obj as T;
  });
}

/** افزودن یک بخش به backup با try/catch یکسان — بدون تکرار. */
async function pushSection(
  sections: BackupEnvelope['sections'],
  createdAt: string,
  name: string,
  run: () => Promise<unknown[]>,
): Promise<void> {
  try {
    const rows = await run();
    sections.push({ name, rowCount: rows.length, takenAt: createdAt, data: rows });
  } catch {
    sections.push({ name, rowCount: 0, takenAt: createdAt, data: [] });
  }
}

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
      const safe = stripSecrets('systemSettings', [settings])[0];
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

  // Audit log — last 500 rows (reduced from 1000 for faster backup)
  try {
    const audit = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    sections.push({ name: 'audit_log', rowCount: audit.length, takenAt: createdAt, data: audit });
  } catch {
    /* skip */
  }

  // Exchange rates — full (جدول اصلی نرخ بازار)
  try {
    const rates = await prisma.exchangeRate.findMany();
    sections.push({
      name: 'exchange_rates',
      rowCount: rates.length,
      takenAt: createdAt,
      data: rates,
    });
  } catch {
    /* skip */
  }

  // ── محتوای اصلی سایت ────────────────────────────────────────────────────

  // 2026-08-13 mem-fix: limit های کمتر برای Heroku Eco dyno (512MB).
  // هر ردیف ~2KB → 500 پست = ~1MB، قابل override با env var.
  // اگر backup کامل‌تری لازم است از BACKUP_POST_LIMIT / BACKUP_USER_LIMIT
  // در محیط‌های با RAM بیشتر استفاده کنید.
  const POST_LIMIT = Number(process.env.BACKUP_POST_LIMIT) || 500;
  const USER_LIMIT = Number(process.env.BACKUP_USER_LIMIT) || 5_000;
  const COMMENT_LIMIT = Number(process.env.BACKUP_COMMENT_LIMIT) || 1_000;

  // Posts — recent N
  await pushSection(sections, createdAt, 'posts', async () =>
    prisma.post.findMany({ orderBy: { createdAt: 'desc' }, take: POST_LIMIT }),
  );

  // Users — sensitive fields stripped (TOTP secrets, national id hash)
  await pushSection(sections, createdAt, 'users', async () =>
    stripSecrets('user', await prisma.user.findMany({ take: USER_LIMIT })),
  );

  // Comments — recent N
  await pushSection(sections, createdAt, 'comments', async () =>
    prisma.comment.findMany({ orderBy: { createdAt: 'desc' }, take: COMMENT_LIMIT }),
  );

  // Categories & Tags
  await pushSection(sections, createdAt, 'categories', async () => prisma.category.findMany());
  await pushSection(sections, createdAt, 'tags', async () => prisma.tag.findMany());

  // Advertisements (هر دو جدول تبلیغ)
  await pushSection(sections, createdAt, 'advertisements', async () =>
    prisma.advertisement.findMany(),
  );
  await pushSection(sections, createdAt, 'header_ads', async () => prisma.headerAd.findMany());

  // Rate lists + announcements + newsletters
  await pushSection(sections, createdAt, 'rate_lists', async () => prisma.rateList.findMany());
  await pushSection(sections, createdAt, 'announcements', async () =>
    prisma.announcement.findMany(),
  );
  await pushSection(sections, createdAt, 'newsletters', async () => prisma.newsletter.findMany());

  // Support tickets (پشتیبانی) — recent 200 (reduced from 500 for faster backup)
  await pushSection(sections, createdAt, 'support_tickets', async () =>
    prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
  );

  // Exchange partners (صرافی‌ها) — بخش اصلی دامنه
  await pushSection(sections, createdAt, 'exchanges', async () => prisma.exchange.findMany());

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
