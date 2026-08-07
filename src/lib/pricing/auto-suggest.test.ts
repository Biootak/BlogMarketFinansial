/**
 * pricing/auto-suggest.ts — تست‌های واحد
 *
 * ماژول snapshot نرخ‌ها را از `public/data/market-rates.json` می‌خواند، پس
 * `node:fs/promises` mock می‌شود و هیچ I/O واقعی انجام نمی‌شود.
 * تمرکز: انتخاب symbol درست، اعمال spread، گرد کردن، و درجه اطمینان (confidence).
 */

import { getMultiCurrencySuggestions, getSuggestedRates } from '@/lib/pricing/auto-suggest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readFileMock } = vi.hoisted(() => ({ readFileMock: vi.fn() }));

vi.mock('node:fs/promises', () => ({ readFile: readFileMock }));

type SnapshotRate = {
  symbol: string;
  buyValue?: number | null;
  sellValue?: number | null;
  value?: number | null;
  provider?: string;
  fetchedAt?: string;
};

const NOW = new Date('2026-06-15T12:00:00.000Z');

function setSnapshot(rates: SnapshotRate[] | null): void {
  if (rates === null) {
    readFileMock.mockRejectedValue(new Error('ENOENT'));
    return;
  }
  readFileMock.mockResolvedValue(JSON.stringify({ updatedAt: NOW.toISOString(), rates }));
}

function freshRate(overrides: Partial<SnapshotRate> = {}): SnapshotRate {
  return {
    symbol: 'IRAN_USD',
    buyValue: 100_000,
    sellValue: 101_000,
    provider: 'tgju',
    fetchedAt: NOW.toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  readFileMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── getSuggestedRates ────────────────────────────────────────────────────────

describe('getSuggestedRates', () => {
  it('snapshot موجود نیست → null', async () => {
    setSnapshot(null);
    await expect(getSuggestedRates({ currencyCode: 'USD' })).resolves.toBeNull();
  });

  it('snapshot بدون rates → null', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({ updatedAt: NOW.toISOString() }));
    await expect(getSuggestedRates({ currencyCode: 'USD' })).resolves.toBeNull();
  });

  it('ارز موجود نیست → null', async () => {
    setSnapshot([freshRate({ symbol: 'IRAN_EUR' })]);
    await expect(getSuggestedRates({ currencyCode: 'USD' })).resolves.toBeNull();
  });

  it('spread پیش‌فرض ۱٫۵٪ روی خرید و فروش اعمال می‌شود', async () => {
    setSnapshot([freshRate()]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result).toMatchObject({
      currencyCode: 'USD',
      marketBuyRate: 100_000,
      marketSellRate: 101_000,
      spreadPercent: 1.5,
      source: 'tgju',
      confidence: 'high',
    });
    // 100000 × 0.985 = 98500 و 101000 × 1.015 = 102515 → گرد به ۱۰۰
    expect(result?.suggestedBuyRate).toBe(98_500);
    expect(result?.suggestedSellRate).toBe(102_500);
  });

  it('خرید پیشنهادی همیشه کمتر و فروش پیشنهادی بیشتر از نرخ بازار است', async () => {
    setSnapshot([freshRate()]);
    const result = await getSuggestedRates({ currencyCode: 'USD', spreadPercent: 3 });
    expect(result?.suggestedBuyRate).toBeLessThan(100_000);
    expect(result?.suggestedSellRate).toBeGreaterThan(101_000);
  });

  it('spread صفر → نرخ پیشنهادی همان نرخ بازار (با گرد کردن)', async () => {
    setSnapshot([freshRate()]);
    const result = await getSuggestedRates({ currencyCode: 'USD', spreadPercent: 0 });
    expect(result?.suggestedBuyRate).toBe(100_000);
    expect(result?.suggestedSellRate).toBe(101_000);
  });

  it('نرخ‌های کوچک (≤۱۰۰۰) به عدد صحیح گرد می‌شوند نه به ۱۰۰', async () => {
    setSnapshot([freshRate({ symbol: 'AFGHANI_AFN', buyValue: 70, sellValue: 71 })]);
    const result = await getSuggestedRates({ currencyCode: 'AFN', spreadPercent: 2 });
    expect(result?.suggestedBuyRate).toBe(69); // 70 × 0.98 = 68.6 → 69
    expect(result?.suggestedSellRate).toBe(72); // 71 × 1.02 = 72.42 → 72
  });

  it('AFN واحد افغانی و جفت‌ارز AFN می‌گیرد (Afghanistan-first)', async () => {
    setSnapshot([freshRate({ symbol: 'AFGHANI_AFN', buyValue: 70, sellValue: 71 })]);
    const result = await getSuggestedRates({ currencyCode: 'AFN' });
    expect(result?.unit).toBe('afn');
    expect(result?.currencyPair).toBe('AFN/AFN');
  });

  it('ارزهای ایرانی legacy واحد تومان و جفت‌ارز IRR می‌گیرند', async () => {
    setSnapshot([freshRate()]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result?.unit).toBe('toman');
    expect(result?.currencyPair).toBe('USD/IRR');
  });

  it('unit صریح بر نگاشت پیش‌فرض اولویت دارد', async () => {
    setSnapshot([freshRate()]);
    const result = await getSuggestedRates({ currencyCode: 'USD', unit: 'afn' });
    expect(result?.unit).toBe('afn');
    expect(result?.currencyPair).toBe('USD/AFN');
  });

  it('اولین symbol موجود از لیست کاندیدها انتخاب می‌شود', async () => {
    setSnapshot([
      freshRate({
        symbol: 'AFGHANI_USD',
        buyValue: 90_000,
        sellValue: 91_000,
        provider: 'afghani',
      }),
      freshRate({ symbol: 'IRAN_USD', buyValue: 100_000, provider: 'tgju' }),
    ]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result?.source).toBe('tgju');
    expect(result?.marketBuyRate).toBe(100_000);
  });

  it('symbol با مقدار تهی رد و کاندید بعدی انتخاب می‌شود', async () => {
    setSnapshot([
      freshRate({ symbol: 'IRAN_USD', buyValue: null, sellValue: null, value: null }),
      freshRate({ symbol: 'AFGHANI_USD', buyValue: 90_000, provider: 'afghani' }),
    ]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result?.source).toBe('afghani');
  });

  it('نبود buyValue/sellValue با value جبران می‌شود', async () => {
    setSnapshot([
      freshRate({ symbol: 'IRAN_USD', buyValue: null, sellValue: null, value: 100_000 }),
    ]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result?.marketBuyRate).toBe(100_000);
    expect(result?.marketSellRate).toBe(100_000);
  });

  it('مقدار غیرعددی → null', async () => {
    setSnapshot([
      freshRate({ symbol: 'IRAN_USD', buyValue: Number.NaN, sellValue: Number.NaN, value: null }),
    ]);
    await expect(getSuggestedRates({ currencyCode: 'USD' })).resolves.toBeNull();
  });

  it('ارز ناشناخته با الگوی IRAN_<code> جست‌وجو می‌شود', async () => {
    setSnapshot([freshRate({ symbol: 'IRAN_CAD', provider: 'tgju' })]);
    const result = await getSuggestedRates({ currencyCode: 'CAD' });
    expect(result?.source).toBe('tgju');
    expect(result?.unit).toBe('toman');
  });

  it('اگر provider نبود، symbol به‌عنوان منبع می‌آید', async () => {
    setSnapshot([freshRate({ provider: undefined })]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result?.source).toBe('IRAN_USD');
  });

  it.each([
    [2 * 60 * 1000, 'high'],
    [10 * 60 * 1000, 'medium'],
    [60 * 60 * 1000, 'low'],
  ])('قدمت %i میلی‌ثانیه → confidence %s', async (ageMs, confidence) => {
    setSnapshot([freshRate({ fetchedAt: new Date(NOW.getTime() - ageMs).toISOString() })]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result?.confidence).toBe(confidence);
  });

  it('بدون fetchedAt → confidence پایین', async () => {
    setSnapshot([freshRate({ fetchedAt: undefined })]);
    const result = await getSuggestedRates({ currencyCode: 'USD' });
    expect(result?.confidence).toBe('low');
  });
});

// ─── getMultiCurrencySuggestions ──────────────────────────────────────────────

describe('getMultiCurrencySuggestions', () => {
  it('فقط ارزهای موجود در snapshot برگردانده می‌شوند', async () => {
    setSnapshot([
      freshRate({ symbol: 'IRAN_USD' }),
      freshRate({ symbol: 'IRAN_EUR', buyValue: 110_000, sellValue: 111_000 }),
    ]);
    const results = await getMultiCurrencySuggestions();
    expect(results.map((r) => r.currencyCode)).toEqual(['USD', 'EUR']);
  });

  it('spread دلخواه به همه ارزها اعمال می‌شود', async () => {
    setSnapshot([freshRate({ symbol: 'IRAN_USD' })]);
    const results = await getMultiCurrencySuggestions(5);
    expect(results).toHaveLength(1);
    expect(results[0]?.spreadPercent).toBe(5);
  });

  it('snapshot موجود نیست → آرایه خالی', async () => {
    setSnapshot(null);
    await expect(getMultiCurrencySuggestions()).resolves.toEqual([]);
  });
});
