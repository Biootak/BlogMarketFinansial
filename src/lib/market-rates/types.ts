// src/lib/market-rates/types.ts

/** واحد پولی — خودش نمایش و ضریب تبدیل را تعیین می‌کند. */
export type MarketRateUnit =
  | 'toman' // تومان ایران (نمایش داده می‌شود، raw value ÷ 10 از ریال)
  | 'rial' // ریال خام (نمایش داده نمی‌شود، فقط ذخیره)
  | 'usd' // دلار آمریکا
  | 'eur' // یورو
  | 'afn' // افغانی
  | 'pound'; // پوند طلا (placeholder، فعلاً استفاده نمی‌شود)

/** گروه‌بندی برای filter و نمایش. */
export type MarketRateGroup =
  | 'afghan' // دلار هرات، افغانی
  | 'iran-forex' // دلار، یورو، درهم، پوند، لیر (فارکس ایران)
  | 'iran-coin' // سکه‌های ایرانی
  | 'iran-gold' // طلای ایرانی
  | 'global' // انس طلا، نفت (USD/oz)
  | 'minor'; // ین، روبل، روپیه

/** منبع داده. */
export type MarketRateProvider = 'auto' | 'manual';

/** یک آیتم نمایش — هر چیزی که UI نیاز دارد. */
export interface MarketRateItem {
  symbol: string;
  displayNameFa: string;
  group: MarketRateGroup;
  unit: MarketRateUnit;
  divisor: number;
  decimals: number;
  priority: number;
  /**
   * مقدار اصلی (برای نرخ‌های تک‌قیمتی مثل دلار بازار آزاد).
   * برای نرخ‌های دوطرفه (صرافی ملی) برابر buyValue است.
   */
  value: number;
  /**
   * نرخ خرید (صرافی از مردم می‌خرد). فقط برای آیتم‌های صرافی ملی پر می‌شود.
   * بر حسب واحد اصلی داده (معمولاً ریال خام — بعد با divisor تقسیم می‌شود).
   */
  buyValue?: number;
  /**
   * نرخ فروش (صرافی به مردم می‌فروشد). فقط برای آیتم‌های صرافی ملی پر می‌شود.
   * بر حسب واحد اصلی داده (معمولاً ریال خام — بعد با divisor تقسیم می‌شود).
   */
  sellValue?: number;
  /** اختلاف فروش - خرید (صرافی ملی: sell - buy). فقط وقتی هر دو موجود. */
  spread?: number;
  changePercent: number;
  provider: MarketRateProvider;
  updatedAt: Date;
}

/** یک ردیف از registry (پیش‌تعریف‌شده، self-describing). */
export interface SymbolRegistryEntry {
  symbol: string;
  displayNameFa: string;
  tgjuKey?: string;
  group: MarketRateGroup;
  unit: MarketRateUnit;
  divisor: number;
  decimals: number;
  priority: number;
}
