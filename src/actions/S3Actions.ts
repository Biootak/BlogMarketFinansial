'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: 'default',
  endpoint: process.env.LIARA_ENDPOINT,
  credentials: {
    accessKeyId: process.env.LIARA_ACCESS_KEY as string,
    secretAccessKey: process.env.LIARA_SECRET_KEY as string,
  },
});

export async function getPresignedUrl(fileName: string, fileType: string): Promise<string> {
  if (!fileName || !fileType) {
    throw new Error('نام فایل و نوع فایل باید مشخص شود');
  }

  const key = `${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.LIARA_BUCKET_NAME as string,
    Key: key,
    ContentType: fileType,
  });

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return presignedUrl;
  } catch (error) {
    console.error('خطا در ایجاد Presigned URL:', error);
    throw new Error('ایجاد Presigned URL با شکست مواجه شد');
  }
}
