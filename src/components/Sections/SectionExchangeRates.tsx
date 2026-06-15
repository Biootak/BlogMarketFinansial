import { Suspense } from 'react';
import { fetchExchangeRates } from '@/actions/fetchExchangeRates';
import ExchangeRateSlider from '@/components/ExchangeRateSlider';
import { Skeleton } from '@/components/ui/skeleton';

async function ExchangeRatesContent() {
  const result = await fetchExchangeRates();

  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 rounded-xl sm:rounded-2xl border border-red-200 dark:border-red-800">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium text-sm sm:text-base">
            {result.error || 'خطا در دریافت نرخ‌های ارز'}
          </p>
          <p className="text-xs sm:text-sm text-red-500 dark:text-red-500 mt-1">
            لطفاً صفحه را دوباره بارگذاری کنید
          </p>
        </div>
      </div>
    );
  }

  if (result.data.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-800">
        <p className="text-amber-600 dark:text-amber-400 text-sm sm:text-base">هیچ نرخ ارزی یافت نشد</p>
      </div>
    );
  }

  return <ExchangeRateSlider rates={result.data} />;
}

export default function SectionExchangeRates() {
  return (
    <section className="nc-SectionExchangeRates py-1">
      <Suspense fallback={<LoadingSkeleton />}>
        <ExchangeRatesContent />
      </Suspense>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory px-2 sm:px-3 lg:px-4 scroll-px-2 sm:scroll-px-3 lg:scroll-px-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="w-[180px] sm:w-[200px] lg:w-[220px] shrink-0 snap-start">
          <Skeleton className="h-[72px] sm:h-[84px] lg:h-[96px] rounded-xl sm:rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
