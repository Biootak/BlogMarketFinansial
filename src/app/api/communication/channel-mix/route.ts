import { getChannelMix } from '@/lib/communication';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  const result = await getChannelMix();
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: result.message ?? 'دسترسی ندارید' } },
      { status: 403 },
    );
  }
  // 2026-08-17: قبلاً `private, s-maxage=60` بود — s-maxage به CDN می‌گوید کش
  // کن؛ دادهٔ خصوصی نباید در کش عمومی بماند (Cloudflare Cache Rule همهٔ GETها
  // را به‌جز /api/auth کش می‌کند).
  return NextResponse.json(
    { success: true, data: result.data },
    {
      headers: {
        'Cache-Control': 'no-store, private',
      },
    },
  );
}
