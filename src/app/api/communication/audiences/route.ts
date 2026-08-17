import { getAudiences } from '@/lib/communication';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  const result = await getAudiences();
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: result.message ?? 'دسترسی ندارید' } },
      { status: 403 },
    );
  }
  // 2026-08-17: قبلاً `private, s-maxage=60` بود — s-maxage دقیقاً به CDN
  // می‌گوید کش کن (private با s-maxage متناقض است و Cloudflare Cache Rule
  // اکسپایر ۵دقیقه‌ای خودش را اعمال می‌کند) → دادهٔ مخاطبان به کش عمومی می‌رفت.
  return NextResponse.json(
    { success: true, data: result.data },
    {
      headers: {
        'Cache-Control': 'no-store, private',
      },
    },
  );
}
