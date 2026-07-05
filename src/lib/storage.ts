import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { existsSync, createReadStream } from 'fs';
import path from 'path';

// S3 Client
const s3Client = new S3Client({
  region: 'default',
  endpoint: process.env.LIARA_ENDPOINT,
  credentials: {
    accessKeyId: process.env.LIARA_ACCESS_KEY || '',
    secretAccessKey: process.env.LIARA_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.LIARA_BUCKET_NAME || '';
const S3_PUBLIC_URL = process.env.LIARA_ENDPOINT?.replace('https://', `https://${BUCKET_NAME}.`) || '';
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 2026-07-05: S3 is now optional. If credentials are missing, the system
// falls back to local disk storage automatically. This supports local dev
// and hosted test environments without configuring Liara.
function isS3Configured(): boolean {
  return Boolean(
    process.env.LIARA_ENDPOINT &&
      process.env.LIARA_ACCESS_KEY &&
      process.env.LIARA_SECRET_KEY &&
      process.env.LIARA_BUCKET_NAME
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
 * آپلود فایل — لوکال همیشه نوشته می‌شود؛ S3 فقط وقتی تنظیم شده باشد.
 * 2026-07-05: S3 became optional. Local disk is the canonical fallback
 * so uploads work in dev and hosted test envs without Liara config.
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
  const localFilePath = path.join(LOCAL_UPLOAD_DIR, folder, filename);

  // Always write locally first so uploads work even without S3.
  const localDir = path.join(LOCAL_UPLOAD_DIR, folder);
  if (!existsSync(localDir)) {
    await mkdir(localDir, { recursive: true });
  }
  await writeFile(localFilePath, buffer);

  // آپلود به S3 فقط در صورت تنظیم بودن
  let s3Url: string | null = null;
  if (isS3Configured()) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
      s3Url = `${S3_PUBLIC_URL}/${key}`;
    } catch (error) {
      console.error('خطا در آپلود به S3:', error);
      // Local copy is already saved, so do not fail the request when S3 is optional.
    }
  }

  return {
    url: s3Url ?? `/uploads/${folder}/${filename}`,
    s3Url,
    localPath,
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
  const key = `${folder}/${filename}`;
  const localFilePath = path.join(LOCAL_UPLOAD_DIR, folder, filename);

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
  const key = `${folder}/${filename}`;
  const localFilePath = path.join(LOCAL_UPLOAD_DIR, folder, filename);

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
 * حذف فایل — از S3 (اگر تنظیم شده) و از دیسک لوکال.
 */
export async function deleteFile(folder: string, filename: string): Promise<boolean> {
  const key = `${folder}/${filename}`;
  const localFilePath = path.join(LOCAL_UPLOAD_DIR, folder, filename);
  let deleted = false;

  // حذف از S3 فقط در صورت تنظیم بودن
  if (isS3Configured()) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );
      deleted = true;
    } catch (error) {
      console.error('خطا در حذف از S3:', error);
    }
  }

  // Always delete local copy.
  try {
    await unlink(localFilePath);
    deleted = true;
  } catch {
    // فایل لوکال وجود نداشت
  }

  return deleted;
}

/**
 * چک کردن وجود فایل
 */
export async function fileExists(folder: string, filename: string): Promise<boolean> {
  const file = await getFile(folder, filename);
  return file !== null;
}
