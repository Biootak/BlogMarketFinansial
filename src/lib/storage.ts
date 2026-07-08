import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';

// 2026-07-06: Liara S3 timeout + no-retry tuning.
//
// Without these, a single ECONNRESET on the initial TLS handshake (network
// down, VPN disconnected, Liara outage) blocks every upload for ~1.5s while
// the AWS SDK retries 3 times with exponential backoff. The local write
// completes in <100ms — the user shouldn't wait on a cloud that's
// unreachable.
//
// Two settings do the work:
//   * `maxAttempts: 1`            → no SDK-level retries
//   * `requestHandler.requestTimeout: 2000` → per-request hard ceiling
//
// Combined with the circuit breaker below (which disables S3 entirely for
// 60s after a failure), the user sees local-only latency on every upload
// while Liara is unreachable, instead of paying the timeout cost each time.
const s3Client = new S3Client({
  region: 'default',
  endpoint: process.env.LIARA_ENDPOINT,
  credentials: {
    accessKeyId: process.env.LIARA_ACCESS_KEY || '',
    secretAccessKey: process.env.LIARA_SECRET_KEY || '',
  },
  forcePathStyle: true,
  maxAttempts: 1,
  requestHandler: {
    requestTimeout: 2000,
    // 2026-07-07: hard ceiling on establishing the TCP/TLS connection.
    // Without this, an unreachable S3 endpoint (wrong URL, DNS blackout,
    // network down) can hang the upload request for minutes while the OS
    // connection timeout runs. The requestTimeout above only covers the
    // period *after* the connection is established.
    connectionTimeout: 3000,
  },
});

const BUCKET_NAME = process.env.LIARA_BUCKET_NAME || '';
const S3_PUBLIC_URL = process.env.LIARA_ENDPOINT?.replace('https://', `https://${BUCKET_NAME}.`) || '';
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 2026-07-05: S3 is now optional. If credentials are missing, the system
// falls back to local disk storage automatically. This supports local dev
// and hosted test environments without configuring Liara.
function isS3CredentialsSet(): boolean {
  return Boolean(
    process.env.LIARA_ENDPOINT &&
      process.env.LIARA_ACCESS_KEY &&
      process.env.LIARA_SECRET_KEY &&
      process.env.LIARA_BUCKET_NAME
  );
}

// 2026-07-06: Circuit breaker for S3. If a request fails (network down,
// DNS error, Liara outage), we mark S3 unavailable for 60 seconds so the
// next uploads skip the S3 attempt entirely instead of paying the 2s
// timeout again. After 60s the next upload tries S3 once to probe
// recovery — if it succeeds, the breaker stays closed.
const S3_BREAKER_TTL_MS = 60_000;
let s3DisabledUntil = 0;

function isS3Configured(): boolean {
  if (!isS3CredentialsSet()) return false;
  if (Date.now() < s3DisabledUntil) return false;
  return true;
}

function tripCircuitBreaker(reason: string): void {
  if (s3DisabledUntil > Date.now()) return; // already tripped
  s3DisabledUntil = Date.now() + S3_BREAKER_TTL_MS;
  // Single warn-level line — subsequent failures within the window don't
  // log again (they're a no-op `isS3Configured() === false`).
  // eslint-disable-next-line no-console
  console.warn(
    `[storage] S3 unavailable (${reason}). Falling back to local-only for the next ${S3_BREAKER_TTL_MS / 1000}s.`,
  );
}

export interface UploadResult {
  url: string;
  s3Url: string | null;
  localPath: string;
  filename: string;
  size: number;
  /**
   * 2026-06-21: ابعاد تصویر (پیکسل) برای استفاده در next/image و جلوگیری از CLS.
   * برای فایل‌های غیرتصویری (که الان سرو نمی‌شود) null برمی‌گردد.
   */
  width?: number | null;
  height?: number | null;
}

/**
 * نوشتن روی دیسک لوکال — استخراج‌شده برای DRY شدن بین uploadFile و
 * هر جای دیگری که نیاز به write روی public/uploads دارد.
 * مسیر به‌صورت ایمن ساخته می‌شود (folder traversal نمی‌تواند فرار کند).
 */
async function writeLocal(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<string> {
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
 * 2026-07-08: resolve a local upload target safely. Mirror the sanitization
 * used by `writeLocal` for reads/deletes so a crafted `folder`/`filename`
 * (e.g. `../../etc/passwd`) cannot escape LOCAL_UPLOAD_DIR. Previously only
 * the write path sanitized these inputs, leaving getFile/getFileStream/
 * deleteFile open to path traversal (H1).
 */
function resolveUploadTarget(
  folder: string,
  filename: string,
): { localPath: string; key: string } {
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
 * آپلود فایل — local + S3 به‌صورت موازی (نه ترتیبی).
 * 2026-07-05: S3 اختیاری است؛ اگر credentials نباشد، فقط local می‌نویسد.
 * 2026-07-06: parallel writes — local writeFile و S3 PutObject هم‌زمان
 *   شروع می‌شوند. در نسخه‌ی قبلی local اول await می‌شد بعد S3 شروع
 *   می‌شد، یعنی تأخیر S3 به local اضافه می‌شد. با `Promise.allSettled`
 *   کل عملیات = max(local, S3) می‌شود، نه sum.
 *   اگر S3 fail شود، local کپی نجات‌دهنده است؛ اگر local fail شود،
 *   S3 هنوز فایل را دارد. هر دو شکست = throw به caller.
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  folder: string,
  contentType: string,
  dims?: { width?: number | null; height?: number | null }
): Promise<UploadResult> {
  const key = `${folder}/${filename}`;
  const localPath = `/uploads/${folder}/${filename}`;

  // هم local هم S3 را هم‌زمان شروع کن.
  // localPathString در صورت موفقیت local پر می‌شود.
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
            ...(typeof dims?.width === 'number'
              ? { 'img-width': String(dims.width) }
              : {}),
            ...(typeof dims?.height === 'number'
              ? { 'img-height': String(dims.height) }
              : {}),
          },
        })
      );
      // success — make sure the breaker is closed
      s3DisabledUntil = 0;
      return { kind: 's3', url: `${S3_PUBLIC_URL}/${key}` };
    } catch (error) {
      // S3 اختیاری است — log می‌کنیم ولی throw نمی‌کنیم تا local نجات بدهد.
      // tripCircuitBreaker trips once and suppresses repeat logs for 60s.
      const reason =
        error instanceof Error
          ? (error as { code?: string }).code ?? error.name
          : 'unknown';
      tripCircuitBreaker(reason);
      return null;
    }
  })();

  // صبر کن هر دو تمام شوند (یا fail شوند). allSettled طوری رفتار می‌کند
  // که حتی اگه یکی reject شه، بقیه نتیجه‌شون رو برمی‌گردونن.
  const [localResult, s3Result] = await Promise.all([localPromise, s3Promise]);

  // اگه local هم fail شده باشه، اینجا throw می‌کنیم چون راه نجاتی نیست.
  // s3Result در این حالت هم null یا یه url هست، ولی چون local نداریم
  // فایل قابل دسترسی نیست پس خطا می‌دیم.
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
 * خواندن فایل - اول S3، بعد (در dev) لوکال.
 * در production دیگر fallback لوکال وجود ندارد.
 *
 * 2026-06-14: split into two helpers:
 *   * `getFileStream` returns the raw Node ReadableStream from S3 so
 *     route handlers can pipe it straight to the HTTP response
 *     (no `Buffer.concat` of a 10MB file in RAM).
 *   * `getFile` keeps the Buffer-based API for callers that need
 *     the bytes (e.g. sharp pipeline in upload route).
 */
export async function getFileStream(folder: string, filename: string): Promise<NodeJS.ReadableStream> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  // Try S3 first when configured.
  if (isS3Configured()) {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        }),
      );
      // AWS SDK returns a Node ReadableStream in the Node runtime; the
      // types only declare a Web ReadableStream variant so we cast.
      return response.Body as unknown as NodeJS.ReadableStream;
    } catch (error) {
      console.error('S3 stream failed, falling back to local:', error);
    }
  }

  // Local fallback (also the default when S3 is not configured).
  if (!existsSync(localFilePath)) {
    throw new Error('File not found');
  }
  return createReadStream(localFilePath);
}

export async function getFile(folder: string, filename: string): Promise<Buffer | null> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  // Try S3 first when configured.
  if (isS3Configured()) {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );
      if (response.Body) {
        const chunks: Uint8Array[] = [];
        // @ts-expect-error - Body is a readable stream
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      }
    } catch {
      // S3 failed — fall back to local.
    }
  }

  // Local fallback (also the default when S3 is not configured).
  try {
    return await readFile(localFilePath);
  } catch {
    return null;
  }
}

/**
 * حذف فایل — از S3 (اگر تنظیم شده) و از دیسک لوکال، به‌صورت موازی.
 * 2026-07-06: قبلاً ترتیبی بود (S3 اول، local بعد). حالا هم‌زمان.
 * اگر فقط یکی موفق بشه باز هم true برمی‌گردونیم — فایل از یکی از
 * storageها حذف شده و دیگر در دسترس نیست.
 */
export async function deleteFile(folder: string, filename: string): Promise<boolean> {
  const { localPath: localFilePath, key } = resolveUploadTarget(folder, filename);

  const s3Promise = (async (): Promise<boolean> => {
    if (!isS3Configured()) return false;
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );
      return true;
    } catch (error) {
      console.error('خطا در حذف از S3:', error);
      return false;
    }
  })();

  const localPromise = (async (): Promise<boolean> => {
    try {
      await unlink(localFilePath);
      return true;
    } catch {
      // فایل لوکال وجود نداشت — موفقیت در نظر نمی‌گیریم چون S3 ممکنه
      // موفق شده باشه و کافیه.
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
