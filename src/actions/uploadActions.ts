'use server';

import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/auth';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function optimizeImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === 'image/svg+xml') {
    return buffer;
  }

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const maxWidth = 1920;

  if (metadata.width && metadata.width > maxWidth) {
    image.resize(maxWidth, undefined, { withoutEnlargement: true });
  }

  if (mimeType !== 'image/gif') {
    return image.webp({ quality: 85 }).toBuffer();
  }

  return image.gif().toBuffer();
}

function generateFilename(originalName: string, mimeType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '');
  
  const ext = mimeType === 'image/gif' || mimeType === 'image/svg+xml' 
    ? originalName.split('.').pop() 
    : 'webp';
  
  return `${timestamp}-${random}-${baseName.slice(0, 20)}.${ext}`;
}

export type UploadFolder = 'posts' | 'avatars' | 'categories' | 'tags' | 'ads' | 'general';

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  error?: string;
}

export async function uploadImage(
  formData: FormData,
  folder: UploadFolder = 'general'
): Promise<UploadResult> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'احراز هویت الزامی است' };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'فایلی انتخاب نشده' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false, error: `نوع فایل ${file.type} مجاز نیست` };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'حجم فایل بیشتر از 10 مگابایت است' };
    }

    const uploadDir = path.join(UPLOAD_DIR, folder);
    await ensureDir(uploadDir);

    const buffer = Buffer.from(await file.arrayBuffer());
    const optimizedBuffer = await optimizeImage(buffer, file.type);
    const filename = generateFilename(file.name, file.type);
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, optimizedBuffer);

    return {
      success: true,
      url: `/uploads/${folder}/${filename}`,
      filename,
      size: optimizedBuffer.length,
    };
  } catch (error) {
    console.error('خطا در آپلود فایل:', error);
    return { success: false, error: 'خطا در آپلود فایل' };
  }
}

export async function deleteImage(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: 'احراز هویت الزامی است' };
    }

    // فقط فایل‌های لوکال رو حذف کن
    if (!imageUrl.startsWith('/uploads/')) {
      return { success: false, error: 'فقط فایل‌های لوکال قابل حذف هستند' };
    }

    const filepath = path.join(process.cwd(), 'public', imageUrl);
    
    if (!existsSync(filepath)) {
      return { success: false, error: 'فایل یافت نشد' };
    }

    await unlink(filepath);
    return { success: true };
  } catch (error) {
    console.error('خطا در حذف فایل:', error);
    return { success: false, error: 'خطا در حذف فایل' };
  }
}
