import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildS3Pool } from '@/lib/s3-clients';
import { getS3Bucket } from '@/lib/s3-config';
import { isR2Endpoint, nextUploadBucketIndex } from '@/lib/s3-pool';
import { serverLog } from '@/lib/server-logger';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// ── پول باکت‌های S3-compatible («انگار که یک باکت است») ──────────────────────
// از S3_POOL (JSON array — هر entry کلید مستقل خودش را دارد) ساخته می‌شود؛
// اگر ست نشده باشد، legacy تک‌باکتی S3_* جایگزین می‌شود (رفتار قبلی حفظ است).
// ساخت client در s3-clients.ts یک‌جا است؛ maxAttempts:1 = no SDK retries;
// requestTimeout/connectionTimeout = hard ceiling so an unreachable storage
// doesn't block uploads (circuit breaker handles the rest).
const POOL = buildS3Pool();

const POOL_SIZE = POOL.length;
/** شمارندهٔ round-robin برای توزیع آپلودها بین باکت‌ها. */
let uploadCounter = 0;

const BUCKET_NAME = getS3Bucket();

// Public URL for objects. Provider-agnostic:
//   - If S3_PUBLIC_URL is set, use it verbatim (trailing slash stripped).
//     This is the migration escape hatch: Cloudflare R2 (`https://<custom-domain>`
//     or `https://pub-<hash>.r2.dev`), Backblaze B2
//     (`https://<bucket>.s3.<region>.backblazeb2.com`) and MinIO all expose
//     objects on different hosts — setting this var means switching providers
//     is a config change, not a code change.
//   - Otherwise derive the virtual-host style URL `https://<bucket>.<endpoint-host>`
//     as a fallback (handles https+http, and avoids producing the literal string
//     "undefined" when the endpoint is unset). For R2 این کافی نیست — باید
//     S3_PUBLIC_URL صریحاً ست شود.
const S3_PUBLIC_URL = (() => {
  const override = process.env.S3_PUBLIC_URL;
  if (override) return override.replace(/\/$/, '');
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint || !BUCKET_NAME) return '';
  try {
    const url = new URL(endpoint);
    url.hostname = `${BUCKET_NAME}.${url.hostname}`;
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
})();

// Turbopack-safe: avoid a static literal path to public/uploads in the build graph.
const _cwd = (typeof process !== 'undefined' ? process.cwd() : '') as string;
const LOCAL_UPLOAD_DIR =
  process.env.LOCAL_UPLOAD_DIR ||
  [_cwd, 'public', 'uploads'].join(path.sep).replace(/\/+/g, path.sep);

// S3 is optional — falls back to local disk when credentials are missing.

// Circuit breaker: after an S3 failure, skip S3 for 60s to avoid paying
// the timeout cost on every subsequent upload while the storage is unreachable.
const S3_BREAKER_TTL_MS = 60_000;
let s3DisabledUntil = 0;

function isS3Configured(): boolean {
  if (POOL_SIZE === 0) return false;
  if (Date.now() < s3DisabledUntil) return false;
  return true;
}

function tripCircuitBreaker(reason: string): void {
  if (s3DisabledUntil > Date.now()) return;
  s3DisabledUntil = Date.now() + S3_BREAKER_TTL_MS;
  // S3 failure is a first-class observability event: on ephemeral filesystems
  // (Heroku) a silent S3 fallback means uploads are written only to the
  // local disk and wiped on the next restart — exactly the "image upload
  // disappears" bug. Log it so the LiveOps `storage` service + SystemLog catch it.
  serverLog.warn('storage', 's3-circuit-breaker-tripped', { reason });
}

/** فقط یک‌بار در هر restart دربارهٔ missing public URL برای R2 هشدار بده. */
let r2PublicUrlWarningEmitted = false;

/**
 * وضعیت پیکربندی ذخیره‌سازی ابری — برای LiveOps و صفحه تنظیمات.
 * بدون هیچ درخواست شبکه‌ای؛ فقط env + وضعیت breaker را بازمی‌گرداند.
 */
export function getStorageStatus(): {
  configured: boolean;
  provider: 's3-compatible' | 's3-compatible-r2' | 's3-compatible-pool' | 'none';
  bucket: string;
  /** تعداد باکت‌های پول S3 (۱ = legacy تک‌باکتی). */
  buckets: number;
  /** جزئیات هر باکت پول — برای نمایش در LiveOps/settings. */
  poolBuckets: Array<{ bucket: string; endpoint: string }>;
  publicUrl: string;
  circuitBreakerActive: boolean;
} {
  const credentials = isS3Configured();
  const endpoint = POOL[0]?.endpoint ?? '';
  const isR2 = isR2Endpoint(endpoint);

  // R2 با مشتق‌گیری پیش‌فرض (bucket.endpoint-host) URL عمومی درست نمی‌سازد —
  // آن host برای SigV4 است نه مرورگر؛ بدون S3_PUBLIC_URL تصاویر آپلود می‌شوند
  // ولی آدرس‌هایشان 403 می‌دهد. یک‌بار هشدار بده تا بی‌صدا نشکند.
  if (credentials && isR2 && !S3_PUBLIC_URL) {
    if (!r2PublicUrlWarningEmitted) {
      r2PublicUrlWarningEmitted = true;
      serverLog.warn('storage', 'r2-public-url-missing', {
        message: 'R2 بدون S3_PUBLIC_URL — تصاویر در bucket ذخیره می‌شوند ولی URL عمومی 403 می‌دهد',
      });
    }
  }

  return {
    configured: credentials,
    provider: !credentials
      ? 'none'
      : isR2
        ? 's3-compatible-r2'
        : POOL_SIZE > 1
          ? 's3-compatible-pool'
          : 's3-compatible',
    bucket: BUCKET_NAME,
    buckets: POOL_SIZE,
    poolBuckets: POOL.map((member) => ({ bucket: member.bucket, endpoint: member.endpoint })),
    publicUrl: S3_PUBLIC_URL,
    circuitBreakerActive: Date.now() < s3DisabledUntil,
  };
}

export interface UploadResult {
  url: string;
  s3Url: string | null;
  localPath: string;
  filename: string;
  size: number;
  /** ابعاد تصویر (پیکسل) برای next/image — برای غیرتصویری null است. */
  width?: number | null;
  height?: number | null;
}

/**
 * نوشتن روی دیسک لوکال با sanitize ایمن (folder traversal نمی‌تواند فرار کند).
 */
async function writeLocal(buffer: Buffer, folder: string, filename: string): Promise<string> {
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safeFolder || !safeFilename) {
    throw new Error('Invalid folder or filename');
  }
  const localDir = path.join(LOCAL_UPLOAD_DIR, safeFolder);
  if (!existsSync(localDir)) {
    await mkdir(localDir, { recursive: true });
  }
  const localFilePath = path.join(localDir, safeFilename);
  await writeFile(localFilePath, buffer);
  return `/uploads/${safeFolder}/${safeFilename}`;
}

/**
 * Sanitize folder/filename for reads and deletes — same rules as writeLocal
 * so getFile/getFileStream/deleteFile cannot be used for path traversal.
 */
function resolveUploadTarget(folder: string, filename: string): { localPath: string; key: string } {
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  if (!safeFolder || !safeFilename) {
    throw new Error('Invalid folder or filename');
  }
  const root = path.resolve(LOCAL_UPLOAD_DIR);
  const localPath = path.resolve(root, safeFolder, safeFilename);
  if (localPath !== root && !localPath.startsWith(root + path.sep)) {
    throw new Error('Path traversal detected');
  }
  return { localPath, key: `${safeFolder}/${safeFilename}` };
}

/**
 * آپلود فایل — local + S3 به‌صورت موازی.
 * S3 اختیاری است؛ اگر credentials نباشد یا circuit breaker فعال باشد، فقط local.
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  folder: string,
  contentType: string,
  dims?: { width?: number | null; height?: number | null },
): Promise<UploadResult> {
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const key = `${safeFolder}/${safeFilename}`;

  const localPromise = writeLocal(buffer, folder, filename).then((p) => ({
    kind: 'local' as const,
    path: p,
  }));

  const s3Promise = (async (): Promise<{ kind: 's3'; url: string } | null> => {
    if (!isS3Configured()) return null;
    // round-robin: از ایندکس بعدی شروع کن؛ اگر باکتی خطا داد باکت بعدی
    // امتحان می‌شود و اولین موفق برنده است (توزیع بین باکت‌های پول).
    const start = nextUploadBucketIndex(POOL_SIZE, uploadCounter++);
    for (let i = 0; i < POOL_SIZE; i++) {
      const entry = POOL[(start + i) % POOL_SIZE];
      try {
        await entry.client.send(
          new PutObjectCommand({
            Bucket: entry.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ContentLength: buffer.length,
            CacheControl: 'public, max-age=31536000, immutable',
            Metadata: {
              'uploaded-at': String(Date.now()),
              ...(typeof dims?.width === 'number' ? { 'img-width': String(dims.width) } : {}),
              ...(typeof dims?.height === 'number' ? { 'img-height': String(dims.height) } : {}),
            },
          }),
        );
        s3DisabledUntil = 0;
        return { kind: 's3', url: `${S3_PUBLIC_URL}/${key}` };
      } catch (error) {
        const reason =
          error instanceof Error ? ((error as { code?: string }).code ?? error.name) : 'unknown';
        // Log every upload failure (not just the breaker trip) so transient
        // failures are traceable — the breaker log is rate-limited to once per
        // TTL, this one is per-bucket.
        serverLog.warn('storage', 's3-upload-failed', {
          key,
          bucket: entry.bucket,
          reason,
        });
        // آخرین باکت پول هم شکست → circuit breaker را فعال کن.
        if (i === POOL_SIZE - 1) tripCircuitBreaker(reason);
      }
    }
    return null;
  })();

  const [localResult, s3Result] = await Promise.all([localPromise, s3Promise]);
  const s3Url = s3Result?.url ?? null;

  return {
    url: s3Url ?? localResult.path,
    s3Url,
    localPath: localResult.path,
    filename,
    size: buffer.length,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
  };
}

/**
 * خواندن object از پول باکت‌ها — همه به موازات پرسیده می‌شوند، اولین موفق
 * برمی‌گردد (بدنهٔ بقیه destroy می‌شود تا stream نشت نکند). اگر هیچ‌کدام
 * موفق نشوند null. خطاها silent هستند (fallback لوکال عمدی است).
 */
async function readFromPool(key: string): Promise<NodeJS.ReadableStream | null> {
  if (!isS3Configured()) return null;
  const settled = await Promise.allSettled(
    POOL.map((entry) =>
      entry.client.send(new GetObjectCommand({ Bucket: entry.bucket, Key: key })),
    ),
  );
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    // streamهای موفقِ بازنده را ببند تا اتصال/حافظه نشت نکند.
    for (const other of settled) {
      if (other !== result && other.status === 'fulfilled') {
        const body = other.value.Body as { destroy?: () => void } | undefined;
        try {
          body?.destroy?.();
        } catch {
          // ignore
        }
      }
    }
    return result.value.Body as unknown as NodeJS.ReadableStream;
  }
  return null;
}

/**
 * خواندن فایل به صورت stream — اول پول S3، سپس fallback لوکال.
 * برای pipe مستقیم به HTTP response بدون buffer کردن در RAM.
 */
export async function getFileStream(
  folder: string,
  filename: string,
): Promise<NodeJS.ReadableStream> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  const s3Body = await readFromPool(key);
  if (s3Body) return s3Body;

  if (!existsSync(localFilePath)) {
    throw new Error('File not found');
  }
  return createReadStream(localFilePath);
}

/**
 * خواندن فایل به صورت Buffer — اول پول S3، سپس fallback لوکال.
 */
export async function getFile(folder: string, filename: string): Promise<Buffer | null> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  const s3Body = await readFromPool(key);
  if (s3Body) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of s3Body as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  try {
    return await readFile(localFilePath);
  } catch {
    return null;
  }
}

/**
 * حذف فایل از S3 و دیسک لوکال به‌صورت موازی.
 * اگر فقط یکی موفق شود true برمی‌گردد.
 */
export async function deleteFile(folder: string, filename: string): Promise<boolean> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  const s3Promise = (async (): Promise<boolean> => {
    if (!isS3Configured()) return false;
    // از همهٔ باکت‌های پول حذف کن (best-effort — بعضی باکت‌ها ممکن است
    // object را نداشته باشند؛ حذف یک key موجود نبوده خطا نیست).
    const results = await Promise.allSettled(
      POOL.map((entry) =>
        entry.client.send(new DeleteObjectCommand({ Bucket: entry.bucket, Key: key })),
      ),
    );
    return results.some((r) => r.status === 'fulfilled');
  })();

  const localPromise = (async (): Promise<boolean> => {
    try {
      await unlink(localFilePath);
      return true;
    } catch {
      return false;
    }
  })();

  const [s3Deleted, localDeleted] = await Promise.all([s3Promise, localPromise]);
  return s3Deleted || localDeleted;
}

/**
 * چک کردن وجود فایل
 */
export async function fileExists(folder: string, filename: string): Promise<boolean> {
  const file = await getFile(folder, filename);
  return file !== null;
}
