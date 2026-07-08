import { getViewStats } from '@/actions/getViewStats';
import { type PeriodId, getViewStatsByPeriod } from '@/actions/getViewStatsByPeriod';
import { auth } from '@/auth';
import { Role } from '@prisma/client';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/traffic-stats?period=7d|30d|90d
 *
 * 2026-06-26: extended to support 30d / 90d ranges via
 * getViewStatsByPeriod. The default (no param or period=7d) keeps the
 * original getViewStats path for backward compatibility with any other
 * callers.
 *
 * Auth: ADMIN/OWNER required (M7 fix) — site-wide traffic is sensitive.
 */
const VALID_PERIODS = new Set<PeriodId>(['7d', '30d', '90d']);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'احراز هویت الزامی است' }, { status: 401 });
    }
    const role = session.user.role as Role | undefined;
    if (role !== Role.ADMIN && role !== Role.OWNER) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const periodParam = request.nextUrl.searchParams.get('period');
    const period: PeriodId =
      periodParam && VALID_PERIODS.has(periodParam as PeriodId) ? (periodParam as PeriodId) : '7d';

    if (period === '7d') {
      // Original 7-day path — weekday labels, backward-compatible shape.
      const result = await getViewStats();
      if (!result.success) {
        return NextResponse.json({ error: 'Failed to fetch traffic statistics' }, { status: 500 });
      }
      return NextResponse.json(result.data);
    }

    // 30d / 90d — Jalali date labels, one bucket per day.
    const result = await getViewStatsByPeriod(period);
    if (!result.success || !result.data) {
      return NextResponse.json({ error: 'Failed to fetch traffic statistics' }, { status: 500 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[traffic-stats] error:', error);
    return NextResponse.json({ error: 'Failed to fetch traffic statistics' }, { status: 500 });
  }
}
