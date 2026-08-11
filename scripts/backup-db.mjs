#!/usr/bin/env node
/**
 * scripts/backup-db.mjs — بکاپ کامل Postgres با کپی برون‌سایتی (3-2-1)
 * ─────────────────────────────────────────────────────────────────────────
 *  چیزی که /api/cron/backup (lib/backup.ts) انجام می‌دهد یک snapshot JSON از
 *  جداول اپ است؛ این اسکریپت پشتیبان واقعیِ دیتابیس را با pg_dump می‌گیرد
 *  (فرمت custom، شامل schema + داده + sequences) و آن را به دو مقصد S3-compatible
 *  آپلود می‌کند:
 *
 *     PRIMARY   → مقصد اصلی (مثلاً Object Storage گوزونگا — داخل همان cloud)
 *     SECONDARY → مقصد دوم خارج از پلتفرم (مثلاً Backblaze B2، R2، MinIO روی
 *                 سرور دیگر، یا حتی S3 آمازون) — قانون 3-2-1: یک نسخه باید
 *                 خارج از محل اصلی باشد تا با حذف اکانت/VM از بین نرود.
 *
 *  نکته‌ها:
 *   - نیاز به pg_dump دارد (نسخهٔ سازگار با سرور: معمولاً postgresql-client).
 *   - از @aws-sdk/client-s3 که dependency پروژه است استفاده می‌کند — نیازی
 *     به نصب aws CLI یا rclone نیست.
 *   - اگر متغیرهای اختصاصی BACKUP_S3_* تنظیم نشده باشند، از S3_* عمومی
 *     (همان باکت تصاویر) به‌عنوان PRIMARY استفاده می‌کند. ⚠️ بهتر است باکت
 *     بکاپ خصوصی و جدا باشد.
 *
 *  استفاده:
 *     node scripts/backup-db.mjs                # اجرای بکاپ کامل
 *     node scripts/backup-db.mjs --dry-run      # فقط نمایش پیکربندی
 *     node scripts/backup-db.mjs --verbose      # لاگ جزئیات
 *
 *  متغیرهای محیطی (اختیاری، همه پیش‌فرض دارند):
 *     DATABASE_URL                → اتصال دیتابیس (الزامی؛ از .env هم خوانده می‌شود)
 *     BACKUP_DIR                  → پوشهٔ لوکال (پیش‌فرض: backups/pg)
 *     BACKUP_RETENTION_LOCAL      → چند نسخهٔ آخر لوکال بماند (پیش‌فرض 14)
 *     BACKUP_RETENTION_S3         → چند نسخهٔ آخر در هر مقصد S3 بماند (پیش‌فرض 30)
 *     BACKUP_INCLUDE_UPLOADS      → 1 = فایل‌های public/uploads هم بکاپ گرفته شود
 *     BACKUP_S3_PRIMARY_ENDPOINT / _ACCESS_KEY / _SECRET_KEY / _BUCKET
 *     BACKUP_S3_SECONDARY_ENDPOINT / _ACCESS_KEY / _SECRET_KEY / _BUCKET
 *     BACKUP_LOG                  → فایل لاگ JSON (پیش‌فرض: backups/backup-db.log)
 *
 *  Cron (روی هاست/VPS — هر شب ساعت ۰۳:۳۰):
 *     30 3 * * * cd /path/to/repo && node scripts/backup-db.mjs >> backups/cron.log 2>&1
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── .env loader (بدون dependency اضافه) ─────────────────────────────────────
function loadDotEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // حذف کوتیشن‌های دور مقدار
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

// ── Config ───────────────────────────────────────────────────────────────────
const CFG = {
  dbUrl: process.env.DATABASE_URL || '',
  backupDir: path.resolve(PROJECT_ROOT, process.env.BACKUP_DIR || 'backups/pg'),
  retentionLocal: Number.parseInt(process.env.BACKUP_RETENTION_LOCAL || '14', 10),
  retentionS3: Number.parseInt(process.env.BACKUP_RETENTION_S3 || '30', 10),
  includeUploads: process.env.BACKUP_INCLUDE_UPLOADS === '1',
  logFile: path.resolve(PROJECT_ROOT, process.env.BACKUP_LOG || 'backups/backup-db.log'),
  primary: {
    endpoint: process.env.BACKUP_S3_PRIMARY_ENDPOINT || process.env.S3_ENDPOINT || '',
    accessKey: process.env.BACKUP_S3_PRIMARY_ACCESS_KEY || process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.BACKUP_S3_PRIMARY_SECRET_KEY || process.env.S3_SECRET_KEY || '',
    bucket:
      process.env.BACKUP_S3_PRIMARY_BUCKET ||
      process.env.S3_BACKUP_BUCKET ||
      process.env.S3_BUCKET_NAME ||
      '',
    region: process.env.BACKUP_S3_PRIMARY_REGION || process.env.S3_REGION || 'default',
    label: 'primary',
  },
  secondary: {
    endpoint: process.env.BACKUP_S3_SECONDARY_ENDPOINT || '',
    accessKey: process.env.BACKUP_S3_SECONDARY_ACCESS_KEY || '',
    secretKey: process.env.BACKUP_S3_SECONDARY_SECRET_KEY || '',
    bucket: process.env.BACKUP_S3_SECONDARY_BUCKET || '',
    region: process.env.BACKUP_S3_SECONDARY_REGION || 'default',
    label: 'secondary',
  },
};

// ── Logging ──────────────────────────────────────────────────────────────────
function log(level, msg, extra = {}) {
  const entry = { ts: new Date().toISOString(), level, msg, ...extra };
  const line = JSON.stringify(entry);
  if (VERBOSE || level !== 'info') console.log(line);
  try {
    mkdirSync(path.dirname(CFG.logFile), { recursive: true });
    appendFileSync(CFG.logFile, `${line}\n`);
  } catch {
    /* لاگ‌نویسی نباید اجرای بکاپ را بشکند */
  }
}

// ── S3 helpers ───────────────────────────────────────────────────────────────
async function getS3(dest) {
  const { S3Client } = await import('@aws-sdk/client-s3');
  return new S3Client({
    region: dest.region,
    endpoint: dest.endpoint,
    credentials: { accessKeyId: dest.accessKey, secretAccessKey: dest.secretKey },
    forcePathStyle: true,
    maxAttempts: 2,
    requestHandler: { requestTimeout: 60_000, connectionTimeout: 15_000 },
  });
}

function destConfigured(dest) {
  return Boolean(dest.endpoint && dest.accessKey && dest.secretKey && dest.bucket);
}

async function s3Upload(dest, key, filePath) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3(dest);
  const body = readFileSync(filePath);
  await client.send(
    new PutObjectCommand({
      Bucket: dest.bucket,
      Key: key,
      Body: body,
      CacheControl: 'no-store',
    }),
  );
}

async function s3List(dest, prefix) {
  const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
  const client = await getS3(dest);
  const keys = [];
  let token;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: dest.bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? [])
      keys.push({ key: obj.Key, lastModified: obj.LastModified });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function s3Delete(dest, keys) {
  const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3(dest);
  if (keys.length === 0) return;
  // S3 حداکثر 1000 آبجکت در هر درخواست قبول می‌کند
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000).map((k) => ({ Key: k }));
    await client.send(
      new DeleteObjectsCommand({
        Bucket: dest.bucket,
        Delete: { Objects: batch, Quiet: true },
      }),
    );
  }
}

// ── Prune: فقط N نسخهٔ آخر (بر اساس timestamp نام فایل) نگه دار ────────────
function pruneLocal(prefix, keep) {
  const dir = CFG.backupDir;
  if (!existsSync(dir)) return 0;
  const files = readdirSync(dir)
    .filter((f) => {
      if (f.startsWith(prefix) && f.endsWith('.dump')) return true;
      if (f.startsWith(prefix) && f.endsWith('.tar.gz')) return true;
      return false;
    })
    .sort(); // نام فایل با timestamp UTC شروع می‌شود → مرتب‌سازی واژه‌ای = مرتب‌سازی زمانی
  const toDelete = files.slice(0, Math.max(0, files.length - keep));
  for (const f of toDelete) {
    try {
      unlinkSync(path.join(dir, f));
      log('info', 'pruned-local', { file: f });
    } catch (err) {
      log('warn', 'prune-local-failed', { file: f, error: String(err) });
    }
  }
  return toDelete.length;
}

async function pruneS3(dest, prefix, keep) {
  if (!destConfigured(dest)) return 0;
  try {
    const objects = await s3List(dest, prefix);
    objects.sort((a, b) => String(a.key).localeCompare(String(b.key)));
    const toDelete = objects.slice(0, Math.max(0, objects.length - keep)).map((o) => o.key);
    if (toDelete.length) {
      await s3Delete(dest, toDelete);
      log('info', 'pruned-s3', { dest: dest.label, count: toDelete.length });
    }
    return toDelete.length;
  } catch (err) {
    log('warn', 'prune-s3-failed', { dest: dest.label, error: String(err) });
    return 0;
  }
}

// ── Core ─────────────────────────────────────────────────────────────────────
function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`
  );
}

function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

function runPgDump(dbUrl, outPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-privileges', '--file', outPath, dbUrl],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', (err) =>
      reject(
        new Error(
          `pg_dump اجرا نشد: ${err.message}. نصب: apt install postgresql-client (یا معادل آن)`,
        ),
      ),
    );
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump با کد ${code} شکست خورد: ${stderr.slice(0, 500)}`));
    });
  });
}

function tarUploads(outPath) {
  return new Promise((resolve, reject) => {
    const uploadsDir = path.join(PROJECT_ROOT, 'public', 'uploads');
    if (!existsSync(uploadsDir)) return resolve(false);
    const child = spawn(
      'tar',
      ['-czf', outPath, '-C', path.join(PROJECT_ROOT, 'public'), 'uploads'],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', (err) => reject(new Error(`tar اجرا نشد: ${err.message}`)));
    child.on('close', (code) =>
      code === 0
        ? resolve(true)
        : reject(new Error(`tar با کد ${code} شکست خورد: ${stderr.slice(0, 300)}`)),
    );
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const started = Date.now();

  if (!CFG.dbUrl) {
    console.error('DATABASE_URL تنظیم نشده است. آن را در .env بگذار یا به‌صورت env بده.');
    process.exit(2);
  }

  const destinations = [CFG.primary, CFG.secondary].filter(destConfigured);
  const s3Enabled = destinations.length > 0;

  log('info', 'backup-start', {
    db: CFG.dbUrl.replace(/:[^:@/]+@/, ':***@'),
    localDir: CFG.backupDir,
    s3Destinations: destinations.map((d) => `${d.label}:${d.endpoint}/${d.bucket}`),
    includeUploads: CFG.includeUploads,
    dryRun: DRY_RUN,
  });

  if (DRY_RUN) {
    console.log('DRY-RUN — هیچ اقدامی انجام نشد. پیکربندی بالا را بررسی کن.');
    return;
  }

  // lockfile — مانع اجرای هم‌زمان دو بکاپ
  mkdirSync(CFG.backupDir, { recursive: true });
  const lockPath = path.join(CFG.backupDir, '.backup.lock');
  if (existsSync(lockPath)) {
    const ageMs = Date.now() - statSync(lockPath).mtimeMs;
    if (ageMs < 6 * 60 * 60 * 1000) {
      log('error', 'backup-skipped-locked', { lockPath });
      process.exit(3);
    }
    unlinkSync(lockPath); // lock قدیمی‌تر از ۶ ساعت → شکسته
  }
  try {
    writeFileSync(lockPath, String(process.pid));
  } catch {
    /* ignore */
  }

  const results = {};
  let failed = false;

  try {
    // 1) dump دیتابیس
    const dbFile = path.join(CFG.backupDir, `pg_${nowStamp()}.dump`);
    log('info', 'pg-dump-start');
    await runPgDump(CFG.dbUrl, dbFile);
    const dbChecksum = sha256File(dbFile);
    const dbSize = statSync(dbFile).size;
    log('info', 'pg-dump-done', {
      file: path.basename(dbFile),
      sizeBytes: dbSize,
      checksum: dbChecksum.slice(0, 16),
    });
    results.db = { file: path.basename(dbFile), sizeBytes: dbSize, checksum: dbChecksum };

    // 2) آپلود به همهٔ مقصدهای S3
    for (const dest of destinations) {
      try {
        await s3Upload(dest, `pg/${path.basename(dbFile)}`, dbFile);
        log('info', 's3-upload-ok', { dest: dest.label, key: `pg/${path.basename(dbFile)}` });
      } catch (err) {
        failed = true;
        log('error', 's3-upload-failed', { dest: dest.label, error: String(err) });
      }
    }

    // 3) بکاپ آپلودها (اختیاری)
    if (CFG.includeUploads) {
      const uploadsFile = path.join(CFG.backupDir, `uploads_${nowStamp()}.tar.gz`);
      const made = await tarUploads(uploadsFile);
      if (made) {
        results.uploads = {
          file: path.basename(uploadsFile),
          sizeBytes: statSync(uploadsFile).size,
        };
        for (const dest of destinations) {
          try {
            await s3Upload(dest, `uploads/${path.basename(uploadsFile)}`, uploadsFile);
            log('info', 's3-upload-ok', {
              dest: dest.label,
              key: `uploads/${path.basename(uploadsFile)}`,
            });
          } catch (err) {
            failed = true;
            log('error', 's3-upload-failed', { dest: dest.label, error: String(err) });
          }
        }
      }
    }

    // 4) retention — فقط بعد از موفقیت آپلود
    if (!failed) {
      pruneLocal('pg_', CFG.retentionLocal);
      pruneLocal('uploads_', CFG.retentionLocal);
      for (const dest of destinations) {
        await pruneS3(dest, 'pg/', CFG.retentionS3);
        await pruneS3(dest, 'uploads/', CFG.retentionS3);
      }
    } else {
      log('warn', 'retention-skipped', { reason: 'upload-failed' });
    }
  } catch (err) {
    failed = true;
    log('error', 'backup-failed', { error: String(err) });
  } finally {
    try {
      unlinkSync(lockPath);
    } catch {
      /* ignore */
    }
  }

  log('info', 'backup-end', {
    ok: !failed,
    durationMs: Date.now() - started,
    results,
    destinations: destinations.map((d) => d.label),
  });

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('خطای غیرمنتظره:', err);
  process.exit(1);
});
