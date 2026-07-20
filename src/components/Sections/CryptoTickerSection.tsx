import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import CryptoTickerSlider from '@/components/CryptoTickerSlider';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

async function CryptoTickerContent() {
  const result = await fetchCryptoTickerRates();

  // Exir API اغلب از سرورهای خارجی (Vercel) 403/4xx برمی‌گرداند.
  // نشان دادن error box به کاربر ارزشی ندارد — این section اختیاری است.
  // اگر داده نبود، سکشن را کاملاً مخفی می‌کنیم.
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }

  return <CryptoTickerSlider rates={result.data} />;
}

/**
 * CryptoTickerSection — نوار بالای صفحه‌ی اصلی که نرخ‌های زنده‌ی
 * کریپتو را از Exir نشان می‌ده.
 *
 * قبلاً `SectionExchangeRates` نام داشت. نام جدید واقعیت را نشون
 * می‌ده (فقط کریپتو) و با مدل Prisma `ExchangeRate` و صفحه‌ی داشبورد
 * `/dashboard/exchange-rates` (که با نرخ‌های صرافی ادمین سروکار داره)
 * تداخل نداره.
 */
export default function CryptoTickerSection() {
  return (
    <section className="nc-CryptoTickerSection py-1">
      <Suspense fallback={<LoadingSkeleton />}>
        <CryptoTickerContent />
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
