import { getCategories } from '@/actions/categoryActions';
import { checkRateLimit } from '@/lib/rate-limiter';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Rate limiting for public API
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';
  const rateLimit = await checkRateLimit(`categories:${ip}`, 'api');
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'تعداد درخواست‌ها بیش از حد مجاز است' },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1') || 1);
  // L2 fix: clamp limit to bound query cost (prevent DoS via huge limit).
  const rawLimit = Number.parseInt(searchParams.get('limit') || '20');
  const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 20));
  const search = searchParams.get('search') || '';

  const result = await getCategories({ page, limit, search });

  if (result.success) {
    return NextResponse.json(
      { success: true, data: result.data },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }, // Add caching
    );
  }
  return NextResponse.json(
    { success: false, error: { code: 'QUERY_ERROR', message: result.message } },
    { status: 400 },
  );
}
