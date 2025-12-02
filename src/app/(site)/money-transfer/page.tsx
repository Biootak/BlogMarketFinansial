import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getExchangeRates } from '@/actions/exchange-rates';
import { getRateLists } from '@/actions/rate-lists';
import InfoCards from './InfoCards';
import ExchangeRateTable from './ExchangeRateTable';
import ContactCTA from '@/components/online-payment/ContactCTA';
import FAQ from './FAQ';
import RateListGrid from './RateListGrid';

export const metadata: Metadata = {
  title: 'صرافی آنلاین | انتقال ارز سریع و مطمئن',
  description: 'بهترین نرخ‌های حواله ارزی برای انتقال سریع و امن پول در سراسر جهان',
};

export const revalidate = 1800;

export default async function MoneyTransferPage() {
  const exchangeRates = await getExchangeRates();
  const rateLists = await getRateLists();
  const activeRateLists = rateLists.filter((list) => list.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-blue-600 text-white py-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-75" />
        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h2 className="text-2xl md:text-6xl font-bold mb-4">انتقال ارز سریع و مطمئن</h2>
              <p className="text-xl mb-6">
                بهترین نرخ‌ها برای حواله ارزی در سراسر جهان با امنیت بالا و کارمزد پایین
              </p>
              <a
                href="#rates"
                className="bg-white text-blue-600 px-6 py-3 rounded-full text-lg font-semibold hover:bg-blue-100 transition-colors duration-300"
              >
                مشاهده نرخ‌های لحظه‌ای
              </a>
            </div>
            <div className="md:w-1/2">
              <Image
                src="/images/currency-exchange.svg"
                alt="انتقال ارز جهانی"
                width={500}
                height={400}
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container py-12">
        <section
          id="rates"
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden mb-16"
        >
          <div className="pt-2">
            <h2 className="text-xl font-semibold mb-6 text-center text-gray-800 dark:text-gray-100">
              نرخ‌های لحظه‌ای ارز
            </h2>
            <Suspense fallback={<div className="text-center">در حال بارگذاری نرخ‌های ارز...</div>}>
              <ExchangeRateTable exchangeRates={exchangeRates} />
            </Suspense>
          </div>
          <div className="my-2 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              نرخ‌ها به صورت دوره‌ای به‌روزرسانی می‌شوند
            </p>
          </div>
        </section>

        {/* بخش لیست نرخ‌های ارز */}
        <section className="mb-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
                لیست نرخ‌های ارز
              </h2>
              <p className="mt-3 text-gray-600 dark:text-gray-400">
                نرخ‌های ویژه برای انواع ارزها و خدمات مختلف
              </p>
            </div>

            <Suspense fallback={<div className="text-center">در حال بارگذاری لیست نرخ‌ها...</div>}>
              <RateListGrid rateLists={activeRateLists} initialCount={10} />
            </Suspense>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                نرخ‌ها به صورت دوره‌ای به‌روزرسانی می‌شوند
              </p>
            </div>
          </div>
        </section>

        <section id="contact" className="mb-16">
          <ContactCTA />
        </section>
        <section id="services" className="mb-16">
          <h2 className="text-xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">
            خدمات ویژه ما
          </h2>
          <InfoCards />
        </section>

        <section id="faq">
          <FAQ />
        </section>
      </div>
    </div>
  );
}
