'use client';

/**
 * RateComparisonSection — دو بخش مقایسه نرخ:
 *   ۱. ExchangeQuotesBoard: قیمت‌های خرید/فروش واقعی از صرافی‌های تایید‌شده
 *   ۲. RateComparisonTable: مقایسه کارمزد provider های آنلاین — با context واضح
 */

import ExchangeQuotesBoard, {
  type QuotesData,
} from '@/components/MoneyTransfer/ExchangeQuotesBoard';
import RateComparisonTable from '@/components/MoneyTransfer/RateComparisonTable';
import { Building2, Scale } from 'lucide-react';

export default function RateComparisonSection({ initialData }: { initialData?: QuotesData }) {
  return (
    <div className="space-y-10 sm:space-y-12">
      {/* بخش اول: قیمت‌های واقعی صرافی‌ها */}
      <div>
        <header className="mb-5 sm:mb-6">
          <span className="mt-eyebrow mt-eyebrow--blue">
            <Building2 className="w-3 h-3" aria-hidden />
            قیمت‌های صرافی‌ها
          </span>
          <h2 className="mt-section-title mt-3">خرید و فروش واقعی از صرافی‌های تایید‌شده</h2>
          <p className="mt-section-lead mt-2">
            قیمت‌های زیر مستقیماً توسط صرافی‌های تایید‌شده ثبت می‌شوند و هر چند دقیقه به‌روز می‌گردند. هر
            ارز با بهترین نرخ خرید مشخص شده است.
          </p>
        </header>
        <ExchangeQuotesBoard initialData={initialData} />
      </div>

      {/* بخش دوم: مقایسه کارمزد provider های انتقال */}
      <div>
        <header className="mb-5 sm:mb-6">
          <span className="mt-eyebrow mt-eyebrow--emerald">
            <Scale className="w-3 h-3" aria-hidden />
            مقایسه هزینه انتقال
          </span>
          <h2 id="mt-compare-title" className="mt-section-title mt-3">
            کدام روش انتقال پول ارزان‌تر است؟
          </h2>
          <p className="mt-section-lead mt-2">
            مقدار و ارز مورد نظرتان را وارد کنید تا ببینید هر صرافی یا سرویس دقیقاً چه مبلغی از شما
            می‌گیرد — کارمزد ضمنی و ثابت کنار مبلغ نهایی، کاملاً شفاف.
          </p>
        </header>
        <RateComparisonTable defaultSymbol="USD" defaultAmount={100} />
      </div>
    </div>
  );
}
