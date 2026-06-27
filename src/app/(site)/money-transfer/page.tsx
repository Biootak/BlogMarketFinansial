import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { getExchangeRates } from '@/actions/exchange-rates';
import { getRateLists } from '@/actions/rate-lists';
import InfoCards from './InfoCards';
import ExchangeRateTable from './ExchangeRateTable';
import ContactCTA from '@/components/online-payment/ContactCTA';
import FAQ from './FAQ';
import RateListGrid from './RateListGrid';
import HeroSection from './HeroSection';

export const metadata: Metadata = {
  title: 'صرافی آنلاین | انتقال ارز سریع و مطمئن',
  description: 'بهترین نرخ‌های حواله ارزی برای انتقال سریع و امن پول در سراسر جهان',
};


export default async function MoneyTransferPage() {
  // 2026-06-24: under `cacheComponents: true`, the route segment
  // config `revalidate = 1800` is no longer supported. The Next.js 16
  // replacement is the `'use cache'` directive with a `cacheLife`
  // profile. `hours` matches the old 30-min cadence closely.
  'use cache';
  cacheLife('hours');
  const exchangeRates = await getExchangeRates();
  const rateLists = await getRateLists();
  const activeRateLists = rateLists.filter((list) => list.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection />

      <div className="container py-6 sm:py-10 lg:py-14 space-y-10 sm:space-y-16 px-4 sm:px-6">
        {/* Exchange Rates Section */}
        <section id="rates" className="relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="hidden sm:block absolute -top-20 -right-20 w-72 h-72 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="hidden sm:block absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Section Header */}
            <div className="px-6 lg:px-10 pt-8 lg:pt-10 pb-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-full">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">به‌روزرسانی لحظه‌ای</span>
                </div>
                <h2 className="text-2xl lg:text-2xl font-bold text-slate-900 dark:text-white">
                  نرخ‌های لحظه‌ای ارز
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                  بهترین نرخ‌های روز برای انتقال ارز با کمترین کارمزد
                </p>
              </div>
            </div>
            
            {/* Table Content */}
            <div className="px-4 lg:px-8 pb-6">
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">در حال بارگذاری نرخ‌ها...</span>
                  </div>
                </div>
              }>
                <ExchangeRateTable exchangeRates={exchangeRates} />
              </Suspense>
            </div>
            
            {/* Footer Note */}
            <div className="px-6 lg:px-10 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                نرخ‌ها به صورت دوره‌ای به‌روزرسانی می‌شوند • آخرین به‌روزرسانی: امروز
              </p>
            </div>
          </div>
        </section>

        {/* Rate Lists Section */}
        <section className="relative">
          <div className="text-center mb-10 lg:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-full mb-4">
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">نرخ‌های ویژه</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              لیست نرخ‌های ارز
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              نرخ‌های ویژه برای انواع ارزها و خدمات مختلف با بهترین قیمت‌ها
            </p>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          }>
            <RateListGrid rateLists={activeRateLists} initialCount={10} />
          </Suspense>

          <div className="mt-10 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              نرخ‌ها به صورت دوره‌ای به‌روزرسانی می‌شوند
            </p>
          </div>
        </section>

        {/* Contact CTA Section */}
        <section id="contact">
          <ContactCTA defaultServiceType="INTERNATIONAL_TRANSFER" />
        </section>

        {/* Services Section */}
        <section id="services">
          <div className="text-center mb-10 lg:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full mb-4">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">چرا ما؟</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              خدمات ویژه ما
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              با اعتماد به ما، از بهترین خدمات انتقال ارز بهره‌مند شوید
            </p>
          </div>
          <InfoCards />
        </section>

        {/* FAQ Section */}
        <section id="faq">
          <FAQ />
        </section>
      </div>
    </div>
  );
}
