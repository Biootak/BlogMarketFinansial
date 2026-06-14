import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';
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

// 2026-06-14: در production فقط به S3 می‌نویسیم. کپی لوکال در
// public/uploads دیسک و outbound S3 را دوبل می‌کرد. در dev کپی
// لوکال نگه داشته شد تا بدون تنظیم LIARA_* بتوان آپلود را تست کرد.
const isProd = process.env.NODE_ENV === 'production';

export interface UploadResult {
  url: string;
  s3Url: string | null;
  localPath: string;
  filename: string;
  size: number;
}

/**
 * آپلود فایل به S3 (و در dev، کپی لوکال).
 * در production فقط S3 نوشته می‌شود — کپی public/uploads حذف شد.
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  folder: string,
  contentType: string
): Promise<UploadResult> {
  const key = `${folder}/${filename}`;
  const localPath = `/uploads/${folder}/${filename}`;

  // 2026-06-14: dev only — local mirror under public/uploads so
  // uploads are visible without configuring Liara.
  if (!isProd) {
    const localDir = path.join(LOCAL_UPLOAD_DIR, folder);
    if (!existsSync(localDir)) {
      await mkdir(localDir, { recursive: true });
    }
    await writeFile(path.join(localDir, filename), buffer);
  }

  // آپلود به S3
  let s3Url: string | null = null;
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
    // در production بدون S3 موفق، شکست می‌خوریم — فراخواننده
    // باید خطا را ببیند. در dev ساکت می‌مانیم چون کپی لوکال
    // ممکن است کافی باشد.
    if (isProd) {
      throw error;
    }
  }

  return {
    url: isProd && s3Url ? s3Url : `/uploads/${folder}/${filename}`,
    s3Url,
    localPath,
    filename,
    size: buffer.length,
  };
}

/**
 * خواندن فایل - اول S3، بعد (در dev) لوکال.
 * در production دیگر fallback لوکال وجود ندارد.
 */
export async function getFile(folder: string, filename: string): Promise<Buffer | null> {
  const key = `${folder}/${filename}`;

  // اول از S3 بخون
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
    // S3 در دسترس نیست — در dev از لوکال fallback می‌کنیم
  }

  // در production بدون S3 موفق، null برمی‌گردد (تصویر 404 می‌شود)
  if (isProd) return null;

  // dev: از لوکال بخون
  try {
    const localPath = path.join(LOCAL_UPLOAD_DIR, folder, filename);
    return await readFile(localPath);
  } catch {
    return null;
  }
}

/**
 * حذف فایل از S3 (و در dev، لوکال).
 */
export async function deleteFile(folder: string, filename: string): Promise<boolean> {
  const key = `${folder}/${filename}`;
  let deleted = false;

  // حذف از S3
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

  // حذف لوکال فقط در dev
  if (!isProd) {
    try {
      const localPath = path.join(LOCAL_UPLOAD_DIR, folder, filename);
      await unlink(localPath);
      deleted = true;
    } catch {
      // فایل لوکال وجود نداشت
    }
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
