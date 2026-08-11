#!/usr/bin/env node
/**
 * scripts/restore-db.mjs — بازیابی بکاپ Postgres (معکوس backup-db.mjs)
 * ─────────────────────────────────────────────────────────────────────────
 *  بکاپ‌ها با pg_dump -Fc ساخته شده‌اند؛ این اسکریپت آن‌ها را با pg_restore
 *  به دیتابیس مقصد برمی‌گرداند. اگر فایل روی دیسک لوکال نباشد، از S3
 *  (primary یا secondary) دانلود می‌شود.
 *
 *  استفاده:
 *     node scripts/restore-db.mjs --list                 # لیست بکاپ‌های موجود
 *     node scripts/restore-db.mjs --file pg_2026-08-09.dump
 *     node scripts/restore-db.mjs --file pg_2026-08-09.dump --db-url postgresql://...
 *     node scripts/restore-db.mjs --file pg_2026-08-09.dump --drop-first
 *
 *  ⚠️ بازیابی دادهٔ فعلی را بازنویسی می‌کند. اول از دیتابیس فعلی یک بکاپ
 *  بگیر (node scripts/backup-db.mjs).
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── .env loader ──────────────────────────────────────────────────────────────
function loadDotEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
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
const LIST = args.includes('--list');
const DROP_FIRST = args.includes('--drop-first');
function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const FILE = argValue('--file');
const DB_URL = argValue('--db-url') || process.env.DATABASE_URL || '';

const BACKUP_DIR = path.resolve(PROJECT_ROOT, process.env.BACKUP_DIR || 'backups/pg');
const S3_PREFIX = 'pg/';

function destConfigured(dest) {
  return Boolean(dest.endpoint && dest.accessKey && dest.secretKey && dest.bucket);
}

const DESTINATIONS = [
  {
    label: 'primary',
    endpoint: process.env.BACKUP_S3_PRIMARY_ENDPOINT || process.env.S3_ENDPOINT || '',
    accessKey: process.env.BACKUP_S3_PRIMARY_ACCESS_KEY || process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.BACKUP_S3_PRIMARY_SECRET_KEY || process.env.S3_SECRET_KEY || '',
    bucket:
      process.env.BACKUP_S3_PRIMARY_BUCKET ||
      process.env.S3_BACKUP_BUCKET ||
      process.env.S3_BUCKET_NAME ||
      '',
    region: process.env.BACKUP_S3_PRIMARY_REGION || process.env.S3_REGION || 'default',
  },
  {
    label: 'secondary',
    endpoint: process.env.BACKUP_S3_SECONDARY_ENDPOINT || '',
    accessKey: process.env.BACKUP_S3_SECONDARY_ACCESS_KEY || '',
    secretKey: process.env.BACKUP_S3_SECONDARY_SECRET_KEY || '',
    bucket: process.env.BACKUP_S3_SECONDARY_BUCKET || '',
    region: process.env.BACKUP_S3_SECONDARY_REGION || 'default',
  },
].filter(destConfigured);

async function listS3(dest, prefix) {
  const { ListObjectsV2Command, S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: dest.region,
    endpoint: dest.endpoint,
    credentials: { accessKeyId: dest.accessKey, secretAccessKey: dest.secretKey },
    forcePathStyle: true,
  });
  const out = [];
  let token;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: dest.bucket, Prefix: prefix, ContinuationToken: token }),
    );
    for (const obj of res.Contents ?? []) {
      out.push({ key: obj.Key, size: obj.Size, lastModified: obj.LastModified });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function downloadFromS3(dest, key, outPath) {
  const { GetObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: dest.region,
    endpoint: dest.endpoint,
    credentials: { accessKeyId: dest.accessKey, secretAccessKey: dest.secretKey },
    forcePathStyle: true,
  });
  const res = await client.send(new GetObjectCommand({ Bucket: dest.bucket, Key: key }));
  if (!res.Body) throw new Error('پاسخ S3 خالی بود');
  const chunks = [];
  // @ts-expect-error — Body یک stream است
  for await (const chunk of res.Body) chunks.push(chunk);
  writeFileSync(outPath, Buffer.concat(chunks));
}

async function showList() {
  const local = existsSync(BACKUP_DIR)
    ? readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('pg_') && f.endsWith('.dump'))
        .sort()
    : [];
  console.log('=== لوکال (backups/pg) ===');
  for (const f of local) console.log(' ', f);
  for (const dest of DESTINATIONS) {
    console.log(`=== S3 ${dest.label} (${dest.endpoint}/${dest.bucket}) ===`);
    try {
      const objects = await listS3(dest, S3_PREFIX);
      for (const o of objects.sort((a, b) => String(a.key).localeCompare(String(b.key)))) {
        console.log(' ', o.key, `(${o.size} bytes)`);
      }
    } catch (err) {
      console.error('  خطا:', String(err));
    }
  }
}

function resolveLocalFile(name) {
  if (!name) return null;
  const base = name.includes('/') || name.includes('\\') ? path.basename(name) : name;
  const localPath = path.join(BACKUP_DIR, base);
  return existsSync(localPath) ? localPath : null;
}

async function fetchFile(name) {
  const local = resolveLocalFile(name);
  if (local) return local;
  // از S3 دانلود کن
  for (const dest of DESTINATIONS) {
    const key = `${S3_PREFIX}${path.basename(name)}`;
    try {
      mkdirSync(BACKUP_DIR, { recursive: true });
      const outPath = path.join(BACKUP_DIR, path.basename(key));
      console.log(`دانلود از ${dest.label}: ${key}`);
      await downloadFromS3(dest, key, outPath);
      return outPath;
    } catch {
      /* تلاش روی مقصد بعدی */
    }
  }
  throw new Error(`فایل «${name}» نه لوکال است و نه در هیچ مقصد S3 پیدا شد.`);
}

function runPgRestore(filePath, dbUrl) {
  return new Promise((resolve, reject) => {
    const args = ['--format=custom', '--no-owner', '--no-privileges'];
    if (DROP_FIRST) args.push('--clean', '--if-exists');
    args.push('--dbname', dbUrl, filePath);
    const child = spawn('pg_restore', args, { stdio: ['inherit', 'inherit', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', (err) =>
      reject(new Error(`pg_restore اجرا نشد: ${err.message}. نصب: apt install postgresql-client`)),
    );
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`pg_restore با کد ${code} شکست خورد: ${stderr.slice(0, 500)}`)),
    );
  });
}

async function main() {
  if (LIST) {
    await showList();
    return;
  }
  if (!FILE) {
    console.error(
      'استفاده: node scripts/restore-db.mjs --file <name> [--db-url ...] [--drop-first]',
    );
    console.error('         node scripts/restore-db.mjs --list');
    process.exit(2);
  }
  if (!DB_URL) {
    console.error('DATABASE_URL تنظیم نشده است.');
    process.exit(2);
  }

  const filePath = await fetchFile(FILE);
  console.log(`بازیابی از: ${filePath}`);
  if (DROP_FIRST) console.log('حالت --drop-first: آبجکت‌های موجود ابتدا حذف می‌شوند.');
  await runPgRestore(filePath, DB_URL);
  console.log('بازیابی با موفقیت انجام شد ✔');
}

main().catch((err) => {
  console.error('خطا:', err.message || err);
  process.exit(1);
});
