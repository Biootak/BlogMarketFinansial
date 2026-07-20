'use client';

/**
 * RateComparisonSection — دو بخش مقایسه نرخ:
 *   ۱. ExchangeQuotesBoard: قیمت‌های خرید/فروش واقعی از صرافی‌های تایید‌شده
 *   ۲. RateComparisonTable: مقایسه کارمزد provider های آنلاین
 */

import ExchangeQuotesBoard from '@/components/MoneyTransfer/ExchangeQuotesBoard';
import RateComparisonTable from '@/components/MoneyTransfer/RateComparisonTable';
import { Building2, Sparkles } from 'lucide-react';

export default function RateComparisonSection() {
  return (
    <div className="space-y-10 sm:space-y-12">
      {/* بخش اول: قیمت‌های واقعی صرافی‌ها */}
      <div>
        <header className="mb-5 sm:mb-6">
          <span className="mt-eyebrow mt-eyebrow--blue">
            <Building2 className="w-3 h-3" aria-hidden />
            قیمت‌های صرافی‌ها
          </span>
          <h2 className="mt-section-title mt-3">
            خرید و فروش واقعی از صرافی‌های تایید‌شده
          </h2>
          <p className="mt-section-lead mt-2">
            قیمت‌های زیر مستقیماً توسط صرافی‌های تایید‌شده ثبت می‌شوند و هر چند دقیقه به‌روز می‌گردند.
            هر ارز با بهترین نرخ خرید مشخص شده است.
          </p>
        </header>
        <ExchangeQuotesBoard />
      </div>

      {/* بخش دوم: مقایسه کارمزد provider های آنلاین */}
      <div>
        <header className="mb-5 sm:mb-6">
          <span className="mt-eyebrow mt-eyebrow--emerald">
            <Sparkles className="w-3 h-3" aria-hidden />
            مقایسه real-time
          </span>
          <h2 id="mt-compare-title" className="mt-section-title mt-3">
            بهترین مسیر انتقال پول، در یک نگاه
          </h2>
          <p className="mt-section-lead mt-2">
            صرافی‌ها و سرویس‌های آنلاین برای یک مبلغ یکسان چه قیمتی می‌دهند؟ جدول زیر هر ۶۰ ثانیه از منابع
            زنده (TGJU، USDT/Exir، FX) به‌روز می‌شود — کارمزد ضمنی و ثابت کنار مبلغ نهایی، کاملاً شفاف.
          </p>
        </header>
        <RateComparisonTable defaultSymbol="USD" defaultAmount={100} />
      </div>
    </div>
  );
}
