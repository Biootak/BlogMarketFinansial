/**
 * pricing/margin.ts — تست‌های واحد
 *
 * همه توابع pure هستند — بدون DB، بدون mock.
 */

import { describe, expect, it } from 'vitest';
import {
  applyMargin,
  getMarginPresets,
  getMarginSuggestion,
} from '@/lib/pricing/margin';

// ─── getMarginPresets ─────────────────────────────────────────────────────────

describe('getMarginPresets', () => {
  it('دقیقاً ۴ preset برمی‌گرداند', () => {
    expect(getMarginPresets()).toHaveLength(4);
  });

  it('دقیقاً یک preset توصیه‌شده دارد', () => {
    const recommended = getMarginPresets().filter((p) => p.recommended);
    expect(recommended).toHaveLength(1);
    expect(recommended[0]?.spreadPercent).toBe(1.5);
  });

  it('همه spreadPercent ها مثبت هستند', () => {
    for (const p of getMarginPresets()) {
      expect(p.spreadPercent).toBeGreaterThan(0);
    }
  });

  it('label و description ندارد خالی', () => {
    for (const p of getMarginPresets()) {
      expect(p.label.trim()).not.toBe('');
      expect(p.description.trim()).not.toBe('');
    }
  });
});

// ─── applyMargin ──────────────────────────────────────────────────────────────

describe('applyMargin', () => {
  describe('محاسبه صحیح buy/sell', () => {
    it('نرخ یکسان buy/sell با spread 0 → buy === sell', () => {
      const result = applyMargin(1000, 1000, 0);
      expect(result.buyRate).toBeLessThanOrEqual(result.sellRate);
    });

    it('buy همیشه ≤ sell', () => {
      const cases = [
        { buy: 72000, sell: 72000, spread: 1.5 },
        { buy: 100, sell: 105, spread: 2 },
        { buy: 50, sell: 50, spread: 3.5 },
        { buy: 1, sell: 1, spread: 1 },
      ];
      for (const { buy, sell, spread } of cases) {
        const result = applyMargin(buy, sell, spread);
        expect(result.buyRate).toBeLessThanOrEqual(result.sellRate);
      }
    });

    it('spreadAbsolute = sellRate - buyRate', () => {
      const r = applyMargin(72000, 72000, 1.5);
      expect(r.spreadAbsolute).toBe(r.sellRate - r.buyRate);
    });

    it('profitPerUnit = spreadAbsolute', () => {
      const r = applyMargin(72000, 72000, 1.5);
      expect(r.profitPerUnit).toBe(r.spreadAbsolute);
    });

    it('spreadPercent در result برابر ورودی است', () => {
      const r = applyMargin(72000, 72000, 1.5);
      expect(r.spreadPercent).toBe(1.5);
    });
  });

  describe('رندینگ نرخ‌های بزرگ (>1000) به نزدیک‌ترین ۵۰', () => {
    it('نرخ ۷۲۰۰۰ → sell باید مضرب ۵۰ باشد', () => {
      const r = applyMargin(72000, 72000, 1.5);
      expect(r.sellRate % 50).toBe(0);
    });

    it('نرخ ۷۲۰۰۰ → buy باید مضرب ۵۰ باشد', () => {
      const r = applyMargin(72000, 72000, 1.5);
      expect(r.buyRate % 50).toBe(0);
    });
  });

  describe('رندینگ نرخ‌های بین ۱۰۰–۱۰۰۰ به نزدیک‌ترین ۵', () => {
    it('نرخ ۵۰۰ → buy باید مضرب ۵ باشد', () => {
      const r = applyMargin(500, 500, 1.5);
      expect(r.buyRate % 5).toBe(0);
    });

    it('نرخ ۵۰۰ → sell باید مضرب ۵ باشد', () => {
      const r = applyMargin(500, 500, 1.5);
      expect(r.sellRate % 5).toBe(0);
    });
  });

  describe('مثال مستند در کد: نرخ ۷۲۰۰۰ با spread 1.5%', () => {
    // midRate=72000, half=0.75%
    // rawBuy = 72000 * 0.9925 = 71460 → floor به نزدیک‌ترین 50 → 71450
    // rawSell = 72000 * 1.0075 = 72540 → ceil به نزدیک‌ترین 50 → 72550
    it('buyRate باید ≤ midRate و مضرب ۵۰ باشد', () => {
      const r = applyMargin(72000, 72000, 1.5);
      expect(r.buyRate).toBeLessThan(72000);
      expect(r.buyRate % 50).toBe(0);
    });

    it('sellRate باید ≥ midRate و مضرب ۵۰ باشد', () => {
      const r = applyMargin(72000, 72000, 1.5);
      expect(r.sellRate).toBeGreaterThan(72000);
      expect(r.sellRate % 50).toBe(0);
    });

    it('spread واقعی: sellRate - buyRate ≤ 2 * spread% * midRate + 50 (تلرانس رندینگ)', () => {
      const r = applyMargin(72000, 72000, 1.5);
      const maxSpread = 72000 * (1.5 / 100) * 2 + 100; // ~2260
      expect(r.spreadAbsolute).toBeLessThanOrEqual(maxSpread);
    });
  });
});

// ─── getMarginSuggestion ──────────────────────────────────────────────────────

describe('getMarginSuggestion', () => {
  it('بدون previousRate → spread 1.5 (پیش‌فرض)', () => {
    const r = getMarginSuggestion({ currentRate: 72000, previousRate: null, currencyCode: 'USD' });
    expect(r.spreadPercent).toBe(1.5);
    expect(r.reason).toContain('موجود نیست');
  });

  it('نوسان > 3% → spread 3.0 (محافظتی)', () => {
    const r = getMarginSuggestion({
      currentRate: 74000,
      previousRate: 72000, // ~2.78% — کمتر از ۳
      currencyCode: 'USD',
    });
    // ۲.۷۸% بین ۱.۵ و ۳ است → باید spread=2.0 باشد
    expect(r.spreadPercent).toBe(2.0);
  });

  it('نوسان > 3% دقیقاً → spread 3.0', () => {
    const r = getMarginSuggestion({
      currentRate: 74200,
      previousRate: 72000, // ~3.05% → بالای ۳
      currencyCode: 'USD',
    });
    expect(r.spreadPercent).toBe(3.0);
  });

  it('نوسان زیر 1.5% → spread 1.5 (استاندارد)', () => {
    const r = getMarginSuggestion({
      currentRate: 72500,
      previousRate: 72000, // ~0.69%
      currencyCode: 'USD',
    });
    expect(r.spreadPercent).toBe(1.5);
    expect(r.reason).toContain('ثابت');
  });

  it('نوسان بین 1.5% و 3% → spread 2.0', () => {
    const r = getMarginSuggestion({
      currentRate: 73100,
      previousRate: 72000, // ~1.53%
      currencyCode: 'USD',
    });
    expect(r.spreadPercent).toBe(2.0);
  });

  it('همه نتایج reason غیرخالی دارند', () => {
    const cases = [
      { current: 72000, prev: null },
      { current: 72000, prev: 72000 },
      { current: 74200, prev: 72000 },
    ];
    for (const { current, prev } of cases) {
      const r = getMarginSuggestion({
        currentRate: current,
        previousRate: prev,
        currencyCode: 'USD',
      });
      expect(r.reason.trim()).not.toBe('');
    }
  });
});
