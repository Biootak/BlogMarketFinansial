import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED_FOLDERS = ['posts', 'avatars', 'categories', 'tags', 'ads', 'general'];

// MIME types برای فایل‌های مجاز
const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json({ error: 'مسیر نامعتبر' }, { status: 400 });
    }

    const folder = pathSegments[0];
    const filename = pathSegments.slice(1).join('/');

    // چک فولدر مجاز
    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'فولدر نامعتبر' }, { status: 400 });
    }

    // جلوگیری از path traversal
    if (filename.includes('..') || filename.includes('~')) {
      return NextResponse.json({ error: 'مسیر نامعتبر' }, { status: 400 });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!MIME_TYPES[ext]) {
      return NextResponse.json({ error: 'نوع فایل مجاز نیست' }, { status: 400 });
    }

    const filePath = path.join(UPLOAD_DIR, folder, filename);

    // چک وجود فایل
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const contentType = MIME_TYPES[ext];

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('خطا در خواندن فایل:', error);
    return NextResponse.json({ error: 'خطا در خواندن فایل' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
