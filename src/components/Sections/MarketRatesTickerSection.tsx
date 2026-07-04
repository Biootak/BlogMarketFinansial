import { getMarketRates } from '@/actions/market-rates';
import MarketRatesTicker from '@/components/MarketRates/MarketRatesTicker';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

/**
 * MarketRatesTickerSection — نوار زنده‌ی نرخ‌های بازار در صفحه‌ی اصلی
 * ----------------------------------------------------------------------------
 * نوار افقی متحرک که نرخ‌های زنده‌ی بازار (دلار، یورو، طلا، سکه، ...) را
 * از `getMarketRates()` (TGJU + USDT + FX + manual) می‌گیرد و در پایین
 * نوار کریپتو (`CryptoTickerSection`) نمایش می‌دهد.
 *
 * سرعت (duration) متفاوت از نوار کریپتو:
 *  - `CryptoTickerSection`: `duration={50}` (50 ثانیه برای یک حلقه)
 *  - `MarketRatesTickerSection`: `duration={75}` (75 ثانیه — کندتر)
 * کندتر بودن نرخ بازار کمک می‌کند کاربر بتواند نرخ‌های متنوع را بخواند
 * (در حالی که نوار کریپتو فقط شامل ارزهای دیجیتال است).
 *
 * تاریخچه:
 *  - 2026-07-04: این بخش از صفحه‌ی اصلی برداشته شده بود (طبق comment در
 *    `MarketRatesTicker` و `SectionLargeSlider`). اکنون دوباره اضافه شد
 *    تا نرخ‌های زنده‌ی بازار در کنار نوار کریپتو قابل مشاهده باشد.
 *
 * نکته‌های دسترسی:
 *  - `MarketRatesTicker` خودش `aria-label="نرخ‌های زنده بازار"` دارد
 *  - اسکلت لودینگ با `<output aria-live="polite">` در حالت empty رندر می‌شود
 *  - انیمیشن marquee در `prefers-reduced-motion` متوقف می‌شود (Ticker)
 */

async function MarketRatesTickerContent() {
  const rates = await getMarketRates();

  // `duration={75}` متفاوت از کریپتو (50). کندتر برای خوانایی بهتر نرخ‌های متنوع.
  // `showEmptyState={false}` چون در fallback اسکلت نشان می‌دهیم و در حالت
  // خالی هم `<output>` خودش پیام می‌ده (در MarketRatesTicker).
  return (
    <MarketRatesTicker
      rates={rates}
      duration={75}
      maxItems={rates.length > 0 ? Math.min(rates.length, 18) : undefined}
      label="نرخ‌های زنده"
      showEmptyState={false}
    />
  );
}

function LoadingSkeleton() {
  return (
    <Skeleton
      className="h-10 sm:h-11 w-full rounded-2xl"
      aria-label="در حال بارگذاری نرخ‌های زنده"
    />
  );
}

export default function MarketRatesTickerSection() {
  return (
    <section className="nc-MarketRatesTickerSection py-1">
      <Suspense fallback={<LoadingSkeleton />}>
        <MarketRatesTickerContent />
      </Suspense>
    </section>
  );
}
