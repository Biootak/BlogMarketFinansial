/**
 * pricing/margin.ts — Margin Management for Exchange Operators
 *
 * این ماژول margin preset ها را مدیریت می‌کند و به صراف کمک می‌کند
 * اسپرد مناسب را روی نرخ بازار اعمال کند.
 *
 * جریان:
 *   getMarginPresets → لیست preset های پیش‌فرض
 *   applyMargin → محاسبه buy/sell با margin دلخواه
 *   getMarginSuggestion → بر اساس حجم صرافی بهترین margin را پیشنهاد می‌دهد
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarginPreset = {
  label: string;
  spreadPercent: number;
  description: string;
  recommended: boolean;
};

export type MarginResult = {
  buyRate: number;
  sellRate: number;
  spreadPercent: number;
  spreadAbsolute: number;
  profitPerUnit: number;
};

// ─── Presets ──────────────────────────────────────────────────────────────────

/**
 * پریست‌های استاندارد اسپرد برای بازارهای ارزی افغانستان/ایران.
 * مقادیر بر اساس بررسی رفتار صرافی‌های فعال (1404).
 */
export function getMarginPresets(): MarginPreset[] {
  return [
    {
      label: 'رقابتی',
      spreadPercent: 0.8,
      description: 'برای صرافی‌های پرحجم — اسپرد کم، جذب بیشتر',
      recommended: false,
    },
    {
      label: 'متعارف',
      spreadPercent: 1.5,
      description: 'پیش‌فرض — تعادل بین رقابت و سود',
      recommended: true,
    },
    {
      label: 'محافظه‌کار',
      spreadPercent: 2.5,
      description: 'برای صرافی‌های کم‌حجم یا نرخ‌های پرنوسان',
      recommended: false,
    },
    {
      label: 'پریمیوم',
      spreadPercent: 3.5,
      description: 'برای ارزهای نادر یا خدمات VIP',
      recommended: false,
    },
  ];
}

// ─── Apply Margin ─────────────────────────────────────────────────────────────

/**
 * applyMargin — محاسبه قیمت خرید/فروش با margin مشخص
 *
 * مثال: marketRate = 72,000 تومان، spread = 1.5%
 *   buyRate  = 72,000 × (1 - 0.015) = 70,920
 *   sellRate = 72,000 × (1 + 0.015) = 73,080
 *   spreadAbsolute = 73,080 - 70,920 = 2,160 تومان
 */
export function applyMargin(
  marketBuyRate: number,
  marketSellRate: number,
  spreadPercent: number,
): MarginResult {
  if (!Number.isFinite(marketBuyRate) || marketBuyRate <= 0) {
    return { buyRate: 0, sellRate: 0, spreadPercent, spreadAbsolute: 0, profitPerUnit: 0 };
  }
  if (!Number.isFinite(marketSellRate) || marketSellRate <= 0) {
    return { buyRate: 0, sellRate: 0, spreadPercent, spreadAbsolute: 0, profitPerUnit: 0 };
  }
  const midRate = (marketBuyRate + marketSellRate) / 2;
  const half = spreadPercent / 100 / 2;

  const rawBuy = midRate * (1 - half);
  const rawSell = midRate * (1 + half);

  // گرد کردن: برای اعداد بزرگ (> ۱۰۰۰) به نزدیک‌ترین ۵۰، کوچک‌تر به نزدیک‌ترین ۱
  const roundBase = midRate > 1000 ? 50 : midRate > 100 ? 5 : 1;
  const buyRate = Math.floor(rawBuy / roundBase) * roundBase;
  const sellRate = Math.ceil(rawSell / roundBase) * roundBase;

  return {
    buyRate,
    sellRate,
    spreadPercent,
    spreadAbsolute: sellRate - buyRate,
    profitPerUnit: sellRate - buyRate,
  };
}

// ─── Margin Suggestion ────────────────────────────────────────────────────────

/**
 * getMarginSuggestion — بر اساس نوسان روزانه نرخ، margin پیشنهادی می‌دهد.
 *
 * اگر نرخ فعلی از میانگین اخیر > 2% فاصله داشت، margin بالاتری پیشنهاد می‌شود
 * تا صراف از نوسانات ضرر نکند.
 */
export function getMarginSuggestion(params: {
  currentRate: number;
  previousRate: number | null;
  currencyCode: string;
}): { spreadPercent: number; reason: string } {
  const { currentRate, previousRate, currencyCode: _currencyCode } = params;

  if (!previousRate) {
    return { spreadPercent: 1.5, reason: 'پیش‌فرض — داده تاریخی موجود نیست' };
  }

  const changePercent = Math.abs((currentRate - previousRate) / previousRate) * 100;

  if (changePercent > 3) {
    return {
      spreadPercent: 3.0,
      reason: `نرخ ${changePercent.toFixed(1)}% نوسان دارد — margin محافظتی پیشنهاد می‌شود`,
    };
  }
  if (changePercent > 1.5) {
    return {
      spreadPercent: 2.0,
      reason: `نرخ ${changePercent.toFixed(1)}% تغییر کرده — margin متوسط توصیه می‌شود`,
    };
  }
  return {
    spreadPercent: 1.5,
    reason: 'بازار ثابت است — margin استاندارد مناسب است',
  };
}
