'use server';

import { requireUser } from '@/lib/require-auth';
import { authFailureToActionResult } from '@/lib/require-auth';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'default',
  endpoint: process.env.LIARA_ENDPOINT,
  credentials: {
    accessKeyId: process.env.LIARA_ACCESS_KEY as string,
    secretAccessKey: process.env.LIARA_SECRET_KEY as string,
  },
  forcePathStyle: true,
  maxAttempts: 1,
  requestHandler: {
    requestTimeout: 2000,
    connectionTimeout: 3000,
  },
});

// 2026-06-23: lock the presigned-URL helper behind authentication and a
// MIME allowlist. Before, any caller could request a presigned PUT URL
// to any key in the bucket, which is a critical-severity issue (it lets
// anonymous attackers turn the bucket into their personal malware host
// using our credentials).
const ALLOWED_FILE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const SAFE_NAME = /^[a-zA-Z0-9._-]+$/;

export async function getPresignedUrl(
  fileName: string,
  fileType: string,
): Promise<
  { success: true; url: string; key: string } | { success: false; message: string; error: string }
> {
  const auth = await requireUser();
  if (!auth.success) return authFailureToActionResult(auth);

  if (!fileName || !fileType) {
    return {
      success: false,
      message: 'نام فایل و نوع فایل الزامی است.',
      error: 'INVALID_INPUT',
    };
  }

  if (!ALLOWED_FILE_TYPES.has(fileType)) {
    return {
      success: false,
      message: `نوع فایل مجاز نیست. فقط ${[...ALLOWED_FILE_TYPES].join(', ')} پشتیبانی می‌شود.`,
      error: 'UNSUPPORTED_FILE_TYPE',
    };
  }

  if (!SAFE_NAME.test(fileName)) {
    return {
      success: false,
      message: 'نام فایل فقط می‌تواند شامل حروف، اعداد، نقطه، خط فاصله و زیرخط باشد.',
      error: 'INVALID_FILE_NAME',
    };
  }

  const key = `${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.LIARA_BUCKET_NAME as string,
    Key: key,
    ContentType: fileType,
  });

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { success: true, url: presignedUrl, key };
  } catch {
    return {
      success: false,
      message: 'ایجاد Presigned URL با خطا مواجه شد.',
      error: 'INTERNAL_ERROR',
    };
  }
}
