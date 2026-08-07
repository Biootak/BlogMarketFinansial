/**
 * /api/cron/sync-bazaar
 * ----------------------------------------------------------------------------
 * ⚠️ DEPRECATED — 410 Gone برمی‌گرداند.
 * برای sync واقعی از /api/cron/refresh-market-rates استفاده کنید.
 * ----------------------------------------------------------------------------
 */

import { type NextRequest, NextResponse } from 'next/server';

// Vercel Cron حداکثر execution time برای Hobby ۶۰ ثانیه است.
// scraper ما ۱۲ ثانیه timeout دارد + DB write ~ ۱-۲ ثانیه. حاشیه‌ی کافی.
export const maxDuration = 60;

export async function GET(_request: NextRequest): Promise<Response> {
  return NextResponse.json(
    {
      deprecated: true,
      message: 'این endpoint منسوخ شده است. از /api/cron/refresh-market-rates استفاده کنید.',
      newEndpoint: '/api/cron/refresh-market-rates',
    },
    { status: 410 },
  );
}
