import { getMarketRates } from '@/actions/market-rates';
import { getTrustedClientIp } from '@/lib/client-ip';
import { checkRateLimit } from '@/lib/rate-limiter';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface SerializedRate {
  symbol: string;
  displayNameFa: string;
  group: string;
  unit: string;
  divisor: number;
  decimals: number;
  priority: number;
  value: number;
  buyValue?: number;
  sellValue?: number;
  spread?: number;
  changePercent: number;
  provider: string;
  updatedAt: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getTrustedClientIp(request);
  const rl = await checkRateLimit(`market-rates:${ip}`, 'api');
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMITED', message: 'درخواست بیش از حد مجاز' } },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  try {
    const items = await getMarketRates();
    const data: SerializedRate[] = items.map((r) => ({
      symbol: r.symbol,
      displayNameFa: r.displayNameFa,
      group: r.group,
      unit: r.unit,
      divisor: r.divisor,
      decimals: r.decimals,
      priority: r.priority,
      value: r.value,
      buyValue: r.buyValue,
      sellValue: r.sellValue,
      spread: r.spread,
      changePercent: r.changePercent,
      provider: r.provider,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    }));
    return NextResponse.json(
      {
        success: true,
        data,
        meta: {
          count: data.length,
          generatedAt: new Date().toISOString(),
          source: 'tgju+usdt+fx+manual',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'MARKET_RATES_UNAVAILABLE', message: 'نرخ‌های بازار موقتاً در دسترس نیستند' },
      },
      { status: 503 },
    );
  }
}
