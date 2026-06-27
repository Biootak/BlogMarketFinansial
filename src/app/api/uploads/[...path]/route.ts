import { NextRequest, NextResponse } from 'next/server';
import { getFileStream } from '@/lib/storage';
import path from 'path';

const ALLOWED_FOLDERS = ['posts', 'avatars', 'categories', 'tags', 'ads', 'general'];

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

// 2026-06-14: weak ETag so the browser/CDN can do conditional
// requests (If-None-Match → 304). Without it, every page view
// refetches the whole image even if it's in the browser cache
// and hasn't changed.
const buildEtag = (folder: string, filename: string, mtimeMs?: number) => {
  const seed = mtimeMs ? `${folder}/${filename}@${mtimeMs}` : `${folder}/${filename}`;
  // Simple djb2 hash; we don't need crypto strength here.
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return `W/"${(hash >>> 0).toString(36)}"`;
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

    const etag = buildEtag(folder, filename);
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2026-06-14: stream the S3 body straight to the HTTP response
    // instead of buffering the whole 10MB file in memory. Big win
    // for cold-start latency and concurrent uploads/views.
    let stream: NodeJS.ReadableStream;
    try {
      stream = await getFileStream(folder, filename);
    } catch {
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': MIME_TYPES[ext],
        'Cache-Control': 'public, max-age=31536000, immutable',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('خطا در خواندن فایل:', error);
    return NextResponse.json({ error: 'خطا در خواندن فایل' }, { status: 500 });
  }
}

