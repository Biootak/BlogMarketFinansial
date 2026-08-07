import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3_REGION, getS3Bucket, isS3CredentialsSet } from '@/lib/s3-config';
import { serverLog } from '@/lib/server-logger';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

// maxAttempts:1 = no SDK retries; requestTimeout/connectionTimeout = hard ceiling
// so an unreachable storage doesn't block uploads (circuit breaker handles the rest).
// Region از s3-config می‌آید: 'default' برای MinIO/B2، 'auto' برای Cloudflare R2.
const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
  forcePathStyle: true,
  maxAttempts: 1,
  requestHandler: {
    requestTimeout: 2000,
    connectionTimeout: 3000,
  },
});

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
  if (!isS3CredentialsSet()) return false;
  if (Date.now() < s3DisabledUntil) return false;
  return true;
}

function tripCircuitBreaker(reason: string): void {
  if (s3DisabledUntil > Date.now()) return;
  s3DisabledUntil = Date.now() + S3_BREAKER_TTL_MS;
  // S3 failure is a first-class observability event: on ephemeral filesystems
  // (Heroku/Vercel) a silent S3 fallback means uploads are written only to the
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
  provider: 's3-compatible' | 's3-compatible-r2' | 'none';
  bucket: string;
  publicUrl: string;
  circuitBreakerActive: boolean;
} {
  const credentials = isS3CredentialsSet();
  const endpoint = process.env.S3_ENDPOINT ?? '';
  const isR2 = endpoint.includes('r2.cloudflarestorage.com');

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
    provider: !credentials ? 'none' : isR2 ? 's3-compatible-r2' : 's3-compatible',
    bucket: BUCKET_NAME,
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
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
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
      // TTL, this one is per-upload.
      serverLog.warn('storage', 's3-upload-failed', { key, reason });
      tripCircuitBreaker(reason);
      return null;
    }
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
 * خواندن فایل به صورت stream — اول S3، سپس fallback لوکال.
 * برای pipe مستقیم به HTTP response بدون buffer کردن در RAM.
 */
export async function getFileStream(
  folder: string,
  filename: string,
): Promise<NodeJS.ReadableStream> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  if (isS3Configured()) {
    try {
      const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
      return response.Body as unknown as NodeJS.ReadableStream;
    } catch (_error) {
      // Local fallback is intentional (files uploaded before S3 was configured),
      // so this is not an error — only log when the breaker gets tripped.
    }
  }

  if (!existsSync(localFilePath)) {
    throw new Error('File not found');
  }
  return createReadStream(localFilePath);
}

/**
 * خواندن فایل به صورت Buffer — اول S3، سپس fallback لوکال.
 */
export async function getFile(folder: string, filename: string): Promise<Buffer | null> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  if (isS3Configured()) {
    try {
      const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
      if (response.Body) {
        const body = response.Body as unknown as AsyncIterable<Uint8Array>;
        const chunks: Uint8Array[] = [];
        for await (const chunk of body) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }
    } catch {
      // S3 failed — fall back to local.
    }
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
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
      return true;
    } catch (_error) {
      return false;
    }
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
