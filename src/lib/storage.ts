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

export interface UploadResult {
  url: string;
  s3Url: string | null;
  localPath: string;
  filename: string;
  size: number;
}

/**
 * آپلود فایل به S3 و ذخیره کپی لوکال
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  folder: string,
  contentType: string
): Promise<UploadResult> {
  const key = `${folder}/${filename}`;
  const localDir = path.join(LOCAL_UPLOAD_DIR, folder);
  const localPath = path.join(localDir, filename);

  // ذخیره لوکال
  if (!existsSync(localDir)) {
    await mkdir(localDir, { recursive: true });
  }
  await writeFile(localPath, buffer);

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
    // ادامه بده، لوکال ذخیره شده
  }

  return {
    url: `/uploads/${folder}/${filename}`,
    s3Url,
    localPath: `/uploads/${folder}/${filename}`,
    filename,
    size: buffer.length,
  };
}

/**
 * خواندن فایل - اول S3، بعد لوکال
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
    // S3 در دسترس نیست، از لوکال بخون
  }

  // از لوکال بخون
  try {
    const localPath = path.join(LOCAL_UPLOAD_DIR, folder, filename);
    return await readFile(localPath);
  } catch {
    return null;
  }
}

/**
 * حذف فایل از S3 و لوکال
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

  // حذف لوکال
  try {
    const localPath = path.join(LOCAL_UPLOAD_DIR, folder, filename);
    await unlink(localPath);
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
