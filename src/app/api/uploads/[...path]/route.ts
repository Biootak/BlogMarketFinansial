import path from 'node:path';
import { getFile } from '@/lib/storage';
import { type NextRequest, NextResponse } from 'next/server';

const ALLOWED_FOLDERS = ['posts', 'avatars', 'categories', 'tags', 'ads', 'general'];

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json({ error: 'مسیر نامعتبر' }, { status: 400 });
    }

    const folder = pathSegments[0];
    const filename = pathSegments.slice(1).join('/');

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'فولدر نامعتبر' }, { status: 400 });
    }

    if (filename.includes('..') || filename.includes('~')) {
      return NextResponse.json({ error: 'مسیر نامعتبر' }, { status: 400 });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!MIME_TYPES[ext]) {
      return NextResponse.json({ error: 'نوع فایل مجاز نیست' }, { status: 400 });
    }

    // خواندن فایل (اول S3، بعد لوکال)
    const fileBuffer = await getFile(folder, filename);

    if (!fileBuffer) {
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': MIME_TYPES[ext],
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
