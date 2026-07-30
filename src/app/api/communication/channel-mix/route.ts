import { NextResponse } from 'next/server';
import { getChannelMix } from '@/lib/communication';

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
  return NextResponse.json(
    { success: true, data: result.data },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
      },
    },
  );
}
