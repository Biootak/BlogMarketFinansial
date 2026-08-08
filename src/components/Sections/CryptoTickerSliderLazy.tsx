'use client';

import { Skeleton } from '@/components/ui/skeleton';
/**
 * CryptoTickerSliderLazy — defer hydration نوار کریپتو (زیر-fold)
 * ----------------------------------------------------------------------------
 * الگوی مشابه `PulseArticlesLazy` / `DeferredDesign7` (daک رسمی Next.js — code
 * splitting با next/dynamic): با `ssr: false`، JS اسلایدر در bundle اولیه نیست
 * و فقط بعد از mount شدن کلاینت لود می‌شود → هزینه‌ی hydration/script-eval در
 * لحظه‌ی لود اولیه حذف می‌شود (بهبود TBT صفحه‌ی اصلی). skeleton با ارتفاع
 * یکسان (همان LoadingSkeleton سکشن) → بدون CLS.
 */
import type { CryptoTickerRate } from '@/types/types';
import dynamic from 'next/dynamic';

interface CryptoTickerSliderLazyProps {
  rates: CryptoTickerRate[];
}

const CryptoTickerSlider = dynamic(() => import('@/components/CryptoTickerSlider'), {
  ssr: false,
  loading: () => (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory px-2 sm:px-3 lg:px-4 scroll-px-2 sm:scroll-px-3 lg:scroll-px-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-[140px] sm:w-[180px] lg:w-[220px] shrink-0 snap-start">
          <Skeleton className="h-[64px] sm:h-[72px] lg:h-[84px] rounded-xl sm:rounded-2xl" />
        </div>
      ))}
    </div>
  ),
});

export default function CryptoTickerSliderLazy({ rates }: CryptoTickerSliderLazyProps) {
  return <CryptoTickerSlider rates={rates} />;
}
