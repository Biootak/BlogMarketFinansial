import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { auth } from '@/auth';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_FOLDERS = ['posts', 'avatars', 'categories', 'tags', 'ads', 'general'];

// Magic bytes برای تشخیص واقعی نوع فایل
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

// چک کردن magic bytes برای تشخیص واقعی نوع فایل
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  // SVG رو با محتوا چک می‌کنیم
  if (mimeType === 'image/svg+xml') {
    const content = buffer.toString('utf8', 0, 500).toLowerCase();
    return content.includes('<svg') && !content.includes('<script');
  }

  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  return signatures.some((sig) => {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    return true;
  });
}

// چک کردن SVG برای کدهای مخرب
function sanitizeSvg(buffer: Buffer): boolean {
  const content = buffer.toString('utf8').toLowerCase();

  // لیست تگ‌ها و attribute‌های خطرناک
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<foreignobject/i,
    /data:/i,
    /xlink:href\s*=\s*["'](?!#)/i, // external xlink
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(content));
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
  // حذف کاراکترهای خطرناک از نام فایل
  const baseName = originalName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 20);

  const ext =
    mimeType === 'image/gif' || mimeType === 'image/svg+xml'
      ? originalName.split('.').pop()?.toLowerCase() || 'bin'
      : 'webp';

  return `${timestamp}-${random}-${baseName || 'image'}.${ext}`;
}

// Rate limiting ساده (در production از Redis استفاده کن)
const uploadCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // حداکثر 20 آپلود
const RATE_WINDOW = 60 * 1000; // در هر دقیقه

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = uploadCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    uploadCounts.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. چک احراز هویت
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    // 2. چک Rate Limit
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folder = (formData.get('folder') as string) || 'general';

    // 3. چک فولدر مجاز
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'فولدر نامعتبر است' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'فایلی انتخاب نشده' }, { status: 400 });
    }

    // 4. محدودیت تعداد فایل در هر درخواست
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'حداکثر 10 فایل در هر درخواست مجاز است' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(UPLOAD_DIR, folder);
    await ensureDir(uploadDir);

    const results: UploadResult[] = [];

    for (const file of files) {
      // 5. چک نوع فایل (MIME type)
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `نوع فایل ${file.type} مجاز نیست` }, { status: 400 });
      }

      // 6. چک حجم فایل
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'حجم فایل بیشتر از 10 مگابایت است' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // 7. چک Magic Bytes (تشخیص واقعی نوع فایل)
      if (!validateFileSignature(buffer, file.type)) {
        return NextResponse.json(
          { error: 'محتوای فایل با نوع اعلام شده مطابقت ندارد' },
          { status: 400 }
        );
      }

      // 8. چک امنیت SVG
      if (file.type === 'image/svg+xml' && !sanitizeSvg(buffer)) {
        return NextResponse.json({ error: 'فایل SVG حاوی کد مخرب است' }, { status: 400 });
      }

      const optimizedBuffer = await optimizeImage(buffer, file.type);
      const filename = generateFilename(file.name, file.type);
      const filepath = path.join(uploadDir, filename);

      await writeFile(filepath, optimizedBuffer);

      results.push({
        url: `/uploads/${folder}/${filename}`,
        filename,
        size: optimizedBuffer.length,
      });
    }

    return NextResponse.json({
      success: true,
      files: results,
      message: 'فایل‌ها با موفقیت آپلود شدند',
    });
  } catch (error) {
    console.error('خطا در آپلود فایل:', error);
    return NextResponse.json({ error: 'خطا در آپلود فایل' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
