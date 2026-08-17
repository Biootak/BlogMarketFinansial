import path from 'node:path';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import db from '@/lib/db';
import { getFileStream } from '@/lib/storage';
import { type NextRequest, NextResponse } from 'next/server';

// H4-fix: باید با ALLOWED_FOLDERS در upload route هماهنگ باشد (kyc, logos, exchange اضافه شدند)
const ALLOWED_FOLDERS = [
  'posts',
  'avatars',
  'categories',
  'tags',
  'ads',
  'general',
  'kyc',
  'logos',
  'exchange',
];

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  // SVG is intentionally NOT served: it can execute as a document and steal
  // the session, and uploads no longer accept SVG. Any legacy .svg request
  // falls through to the "نوع فایل مجاز نیست" 400 below.
};

// 2026-08-17 (security): مدارک KYC (ملی، سلفی) هرگز نباید در کش عمومی CDN/مرورگر
// بمانند — `private, no-store`. بقیهٔ رسانه‌ها public immutable می‌مانند.
const KYC_CACHE_CONTROL = 'private, no-store';
const PUBLIC_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * 2026-06-14: weak ETag so the browser/CDN can do conditional
 * requests (If-None-Match → 304). Without it, every page view
 * refetches the whole image even if it's in the browser cache
 * and hasn't changed.
 */
const buildEtag = (folder: string, filename: string, mtimeMs?: number) => {
  const seed = mtimeMs ? `${folder}/${filename}@${mtimeMs}` : `${folder}/${filename}`;
  // Simple djb2 hash; we don't need crypto strength here.
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) | 0;
  }
  return `W/"${(hash >>> 0).toString(36)}"`;
};

/**
 * ماتریس دسترسی مدارک KYC (2026-08-17 — قبلاً هر کسی با URL می‌توانست ببیند):
 *   - OWNER / SUPERADMIN / ADMIN → بررسی پلتفرم (dashboard/kyc-review)
 *   - EXCHANGE staff → مدارک KycVerification صرافی خودشان (exchange/kyc-review)
 *   - صاحب مدرک → KycRecord (پلتفرم) یا KycVerification متصل به Customer خودش
 * بقیه → 403 یکسان (تا وجود فایل لو نرود).
 */
async function canViewKycFile(
  userId: string,
  role: string | undefined,
  filename: string,
): Promise<boolean> {
  if (role === 'OWNER' || role === 'SUPERADMIN' || role === 'ADMIN') return true;

  const suffix = `kyc/${filename}`;
  const [record, verification] = await Promise.all([
    db.kycRecord.findFirst({
      where: {
        userId,
        OR: [
          { selfieUrl: { endsWith: suffix } },
          { docFrontUrl: { endsWith: suffix } },
          { docBackUrl: { endsWith: suffix } },
        ],
      },
      select: { id: true },
    }),
    db.kycVerification.findFirst({
      where: { fileUrl: { endsWith: suffix }, Customer: { userId } },
      select: { id: true },
    }),
  ]);
  if (record || verification) return true;

  if (role === 'EXCHANGE') {
    const membership = await getExchangeForUser();
    if (!membership) return false;
    const forExchange = await db.kycVerification.findFirst({
      where: { exchangeId: membership.exchange.id, fileUrl: { endsWith: suffix } },
      select: { id: true },
    });
    return !!forExchange;
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PATH', message: 'مسیر نامعتبر' } },
        { status: 400 },
      );
    }

    const folder = pathSegments[0];
    const filename = pathSegments.slice(1).join('/');

    if (!ALLOWED_FOLDERS.includes(folder)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FOLDER', message: 'فولدر نامعتبر' } },
        { status: 400 },
      );
    }

    if (filename.includes('..') || filename.includes('~')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PATH', message: 'مسیر نامعتبر' } },
        { status: 400 },
      );
    }

    const ext = path.extname(filename).toLowerCase();
    if (!MIME_TYPES[ext]) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'نوع فایل مجاز نیست' } },
        { status: 400 },
      );
    }

    // ── گیت دسترسی برای فولدر خصوصی kyc ──────────────────────────────────
    // قبل از هر چیز (حتی قبل از ETag) تا وجود فایل برای افراد غیرمجاز لو نرود.
    let cacheControl = PUBLIC_CACHE_CONTROL;
    if (folder === 'kyc') {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHENTICATED', message: 'احراز هویت الزامی است' } },
          { status: 401 },
        );
      }
      const allowed = await canViewKycFile(
        session.user.id,
        session.user.role ?? undefined,
        filename,
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
          { status: 403 },
        );
      }
      cacheControl = KYC_CACHE_CONTROL;
    }

    const etag = buildEtag(folder, filename);
    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': cacheControl,
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
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'فایل یافت نشد' } },
        { status: 404 },
      );
    }

    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': MIME_TYPES[ext],
        'Cache-Control': cacheControl,
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'خطا در خواندن فایل' } },
      { status: 500 },
    );
  }
}
