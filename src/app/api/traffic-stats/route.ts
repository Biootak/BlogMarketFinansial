import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getViewStats } from '@/actions/getViewStats';

// 2026-06-14: the previous implementation faked a 500ms DB delay
// and returned random numbers, which is misleading on the
// dashboard. The real data lives in PageView — the same source
// getViewStats already uses for the chart. We now proxy to that
// (unstable_cache'd) helper so the dashboard traffic widget and
// the chart stay in sync, and the artificial latency is gone.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }

    const result = await getViewStats();
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to fetch traffic statistics' },
        { status: 500 },
      );
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[traffic-stats] error:', error);
    return NextResponse.json({ error: 'Failed to fetch traffic statistics' }, { status: 500 });
  }
}
