import { fetchExchangeRates } from '@/actions/fetchExchangeRates';
import ExchangeRateSlider from '@/components/ExchangeRateSlider';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

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
        <p className="text-amber-600 dark:text-amber-400 text-sm sm:text-base">
          هیچ نرخ ارزی یافت نشد
        </p>
      </div>
    );
  }

  return <ExchangeRateSlider rates={result.data} itemPerRow={5} />;
}

export default function SectionExchangeRates() {
  return (
    <section className="nc-SectionExchangeRates py-2 sm:py-4">
      <Suspense fallback={<LoadingSkeleton />}>
        <ExchangeRatesContent />
      </Suspense>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex gap-2 sm:gap-4 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex-1 min-w-[140px] sm:min-w-[180px]">
          <Skeleton className="h-[80px] sm:h-[100px] rounded-xl sm:rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
