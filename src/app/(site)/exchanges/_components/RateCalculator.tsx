/**
 * RateCalculator — compact "ماشین‌حساب نرخ" widget (exchanges).
 *
 *   جریان صحیح صرافی: کاربر دلار/افغانی/یورو دارد و می‌خواهد بداند چه مقدار
 *   تومان یا ارز دیگر دریافت می‌کند. بنابراین FROM روی USD پیش‌فرض است و
 *   TO قابل انتخاب (تومان، افغانی، یورو، درهم و ...).
 *
 *   - از CurrencySelect shared استفاده می‌کند (P0 — NO NATIVE FORM CONTROLS).
 *   - منبع داده: همان Prisma query صفحه (`/exchanges`) — نرخ‌های real-time.
 *   - pivot محاسبه: (FROM.buy / TO.sell) — همان منطق صفحه money-transfer.
 */

'use client';

import {
  CurrencyConverterCard,
  type ConverterItem,
} from '@/components/fintech/CurrencyConverterCard';
import s from './RateCalculator.module.css';

export type CalcOption = {
  code: string;
  name: string;
  /** best sell rate = user sells toman → gets this currency */
  bestSell: number;
  /** best buy rate = user buys this currency with toman */
  bestBuy: number;
  /** average sell across all exchanges */
  avgSell: number;
  /** average buy across all exchanges */
  avgBuy: number;
  /** worst (highest) sell rate for transparency */
  worstSell: number;
  /** label فارسی برای نمایش — مثل «افغانی»، «تومان» */
  unit: string;
  /** کلید خام unit از DB — مثل 'afn', 'toman', 'rial' — برای منطق محاسبه */
  rawUnit: string;
};

type Props = {
  options: CalcOption[];
  /** default source currency code (default: "USD") */
  defaultCode?: string;
  /** default amount the user enters (default: 1) */
  defaultAmount?: number;
};

/**
 * Synthetic IRT (تومان) item — used as the *target* when the user wants to
 * know how many toman they'll receive. Rates are stored as "toman per 1 USD",
 * so for IRT→other we invert: 1 IRT = (1 / TO.buy) TO.
 */
const IRT_ITEM: ConverterItem = {
  value: '__IRT__',
  code: 'IRT',
  name: 'تومان',
  buy: 1,
  sell: 1,
  unit: 'toman',
  decimals: 0,
};

export default function RateCalculator({
  options,
  defaultCode = 'AFN',
  defaultAmount = 1,
}: Props) {
  // pivot: پیدا کردن ارزی که نرخ آن مستقیماً به تومان است (مثلاً USD، EUR، …)
  // تا بتوانیم ارزهای با unit متفاوت (مثل AFN که نرخ‌هایش برحسب افغانی
  // به ازای USD است) را به تومان نرمال‌سازیم.
  //
  //   1 USD = 70,000 Toman  → toman.buy = 70,000
  //   1 USD = 68 AFN        → afn.buy  = 68  (rawUnit: 'afn')
  //   ⇒ 1 AFN = 70,000 / 68 ≈ 1029 Toman
  //
  // این فرمول cross-rate تضمین می‌کند USD → AFN هم درست کار کند.
  // ⚠️ مقایسه با rawUnit (کلید خام DB) انجام می‌شود، نه unit (label فارسی)
  const pivotOption =
    options.find((o) => o.code === 'USD' && o.rawUnit === 'toman') ??
    options.find((o) => o.rawUnit === 'toman');

  const toToman = (option: CalcOption): { buy: number; sell: number } => {
    // rawUnit = 'toman' یعنی نرخ مستقیماً به تومان است
    if (option.rawUnit === 'toman') return { buy: option.bestBuy, sell: option.bestSell };
    // non-toman: option.bestBuy is "X per pivot" (e.g. 68 AFN per USD)
    // pivotBuy / option.bestSell = how much toman the user gets for 1 unit of option
    if (!pivotOption) return { buy: option.bestBuy, sell: option.bestSell };
    const pivotBuy = pivotOption.bestBuy;
    return {
      buy: pivotBuy / option.bestBuy,
      sell: pivotBuy / option.bestSell,
    };
  };

  // ترتیب اولویت: AFN اول (سایت مخصوص افغانستان)، بقیه بر اساس داده
  const sortedOptions = [...options].sort((a, b) => {
    const priority: Record<string, number> = { AFN: 0, USD: 1, EUR: 2, AED: 3 };
    return (priority[a.code] ?? 99) - (priority[b.code] ?? 99);
  });

  const items: ConverterItem[] = [
    IRT_ITEM,
    ...sortedOptions
      .filter((o) => o.bestSell > 0 && o.bestBuy > 0)
      .map((o) => {
        const { buy, sell } = toToman(o);
        return {
          value: o.code,
          code: o.code,
          name: o.name,
          buy,
          sell,
          unit: o.unit,
          // decimals بر اساس rawUnit (کلید خام) — نه unit label فارسی
          decimals: o.rawUnit === 'afn' ? 2 : 0,
        };
      }),
  ];

  // defaultCode باید موجود باشد؛ اگر نبود اولین ارز موجود را برگردان
  // جستجو بر اساس code انجام می‌شود (نه value) — پس 'IRT' درست است نه '__IRT__'
  const resolvedDefaultCode =
    items.some((i) => i.code === defaultCode) ? defaultCode : (items[1]?.code ?? 'AFN');

  return (
    <div className={s.wrap}>
      <CurrencyConverterCard
        items={items}
        defaultFromCode={resolvedDefaultCode}
        // اگر FROM=IRT باشد → TO اولین ارز غیر-IRT؛ وگرنه TO='IRT' (code، نه value)
        defaultToCode={resolvedDefaultCode === 'IRT' ? (items[1]?.code ?? 'AFN') : 'IRT'}
        defaultAmount={defaultAmount}
        size="compact"
        ariaLabel="ماشین‌حساب نرخ"
        tone="dark"
      />
    </div>
  );
}
