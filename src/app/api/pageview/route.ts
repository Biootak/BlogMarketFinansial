import prisma from '@/lib/db';
import { type NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';


// Rate limiter in-memory با LRU bounded cache (حداکثر 10,000 IP)
// جایگزین Map بی‌نهایت قبلی - خودکار entryهای قدیمی/کم‌استفاده را حذف می‌کند
const viewCounts = new LRUCache<string, { count: number; resetTime: number }>({
  max: 10_000,
  ttl: 60 * 1000,
  ttlAutopurge: true,
});

const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000;

function getClientIP(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = viewCounts.get(ip);

  if (!record || now > record.resetTime) {
    viewCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting محلی (سریع، بدون I/O)
    const ip = getClientIP(req);
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.page !== 'string') {
      return NextResponse.json({ error: 'Page URL is required' }, { status: 400 });
    }

    const page = body.page;
    if (page.length > 500) {
      return NextResponse.json({ error: 'Page URL too long' }, { status: 400 });
    }

    // Sanitize page URL
    const sanitizedPage = page.replace(/[<>'"]/g, '');

    // 2026-06-14: with the @@unique([page]) on PageView (added in
    // schema.prisma) this collapses into a single upsert. Same 1
    // trip to the DB on the happy path, but the row lookup is now
    // an index scan instead of a full table scan, and we drop a
    // query on the cold path. The `as any` cast covers the
    // in-between window before `npx prisma generate` refreshes
    // the client (the schema migration is what makes
    // `where: { page }` accepted by the generated types).
    const pageView = await prisma.pageView.upsert({
      where: { page: sanitizedPage } as any,
      create: { page: sanitizedPage, views: 1 },
      update: { views: { increment: 1 } },
    });

    return NextResponse.json({ success: true, views: pageView.views });
  } catch (error) {
    console.error('[pageview] Error recording page view:', error);
    return NextResponse.json({ error: 'Failed to record page view' }, { status: 500 });
  }
}

// GET method disabled - فقط POST مجاز
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
