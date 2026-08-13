import { getTrustedClientIp } from '@/lib/client-ip';
import prisma from '@/lib/db';
import { LRUCache } from 'lru-cache';
import { type NextRequest, NextResponse } from 'next/server';

// Rate limiter in-memory با LRU bounded cache (حداکثر 10,000 IP)
// جایگزین Map بی‌نهایت قبلی - خودکار entryهای قدیمی/کم‌استفاده را حذف می‌کند
// 2026-08-13 mem-fix: 10,000 → 2,000 — هر entry ~80 بایت؛ روی Eco dyno
// 10,000 IP = ~800KB که بی‌مورد است. در بدترین حالت با 2,000 LRU قدیمی‌ها
// evict می‌شوند که برای rate-limit صفحات خوانده‌شده کاملاً قابل‌قبول است.
const viewCounts = new LRUCache<string, { count: number; resetTime: number }>({
  max: 2_000,
  ttl: 60 * 1000,
  ttlAutopurge: true,
});

const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000;

// M1 fix: use the spoof-resistant client IP resolver.
function getClientIP(request: NextRequest): string {
  return getTrustedClientIp(request);
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
        { status: 429, headers: { 'Retry-After': '60' } },
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

    // 2026-07-04: with the @@unique([page, date]) on PageView (added in
    // schema.prisma) this collapses into a single upsert keyed on the
    // today's bucket. The previous `@@unique([page])` forced every page
    // into one row, so all real traffic piled onto one date and the
    // dashboard's 30d/90d charts (which groupBy `[date]`) ended up with
    // a single huge bucket and empty bars for every other day.
    //
    // Truncate `date` to the start of the UTC day so the unique key
    // matches the bucket the dashboard widget reads from.
    // (Asia/Tehran is UTC+3:30; the bucket boundary at UTC midnight
    // is good enough for daily granularity — off by half a day on the
    // edges, which is acceptable for a "views per day" chart.)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const pageView = await prisma.pageView.upsert({
      where: { page_date: { page: sanitizedPage, date: today } },
      create: { page: sanitizedPage, views: 1, date: today },
      update: { views: { increment: 1 } },
    });

    return NextResponse.json({ success: true, views: pageView.views });
  } catch {
    return NextResponse.json({ error: 'Failed to record page view' }, { status: 500 });
  }
}

// GET برای browser preflight/discovery صحیح است
// (405 در console خطای Lighthouse ایجاد می‌کند)
export async function GET() {
  return new NextResponse(null, { status: 204 });
}
