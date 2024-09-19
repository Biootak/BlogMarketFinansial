import { Suspense } from 'react';
import { getExchangeRates } from '@/actions/getExchangeRates';
import ExchangeRateSlider from '@/components/ExchangeRateSlider';
import { Skeleton } from '@/components/ui/skeleton';

async function ExchangeRatesContent() {
  const result = await getExchangeRates();

  if (!result.success || !result.data) {
    return (
      <div className="text-center text-red-500">
        <p>{result.error || 'خطا در دریافت نرخ‌های ارز'}</p>
        <p className="text-sm mt-2">لطفاً صفحه را دوباره بارگذاری کنید یا بعداً تلاش کنید.</p>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <div className="text-center text-yellow-500">هیچ نرخ ارزی یافت نشد.</div>;
  }

  return <ExchangeRateSlider rates={result.data} itemPerRow={5} />;
}

export default function SectionExchangeRates() {
  return (
    <div className="nc-SectionExchangeRates pt-4">
      <ExchangeRatesContent />
    </div>
  );
}
