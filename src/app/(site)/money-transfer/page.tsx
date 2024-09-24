import { Suspense } from 'react';
import { getExchangeRates } from '@/lib/prisma/exchange-rates';
import ExchangeRateTable from './ExchangeRateTable';
import AdminEditButton from './AdminEditButton';
import InfoCards from './InfoCards';
import FAQ from './FAQ';
import type { Metadata } from 'next';
import Image from 'next/image';

import { FaCoins, FaChartLine, FaGlobe } from 'react-icons/fa';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'حواله ارزی | خدمات مالی پیشرفته',
  description:
    'قیمت‌های به‌روز حواله‌های ارزی شامل پرفکت مانی، ترنسفروایز، پی‌پال و دیگر سرویس‌های پیشرو',
};

export default async function MoneyTransferPage() {
  const exchangeRates = await getExchangeRates();
  const session = await auth();
  const isAdmin = session?.user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">حواله‌های ارزی پیشرفته</h1>
              <p className="text-xl mb-8">بهترین نرخ‌ها برای انتقال ارز در سراسر جهان</p>
              <a
                href="#rates"
                className="bg-white text-blue-600 px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-100 transition-colors"
              >
                مشاهده نرخ‌ها
              </a>
            </div>
            <div className="md:w-1/2">
              <Image
                src="/images/currency-exchange.svg"
                alt="Currency Exchange"
                width={500}
                height={400}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <InfoCards />

        <main
          id="rates"
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden my-12"
        >
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
              نرخ‌های لحظه‌ای ارز
            </h2>
            <Suspense fallback={<div className="text-center">در حال بارگذاری...</div>}>
              <ExchangeRateTable exchangeRates={exchangeRates} />
            </Suspense>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-8 py-4 flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              آخرین به‌روزرسانی: {new Date().toLocaleString('fa-IR')}
            </p>
            {isAdmin && <AdminEditButton />}
          </div>
        </main>

        <FAQ />

        <section className="mt-16 text-center bg-gray-100 dark:bg-gray-800 py-12 rounded-lg">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
            شرکای تجاری ما
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <Image
              src="/images/partner1-logo.png"
              alt="Partner 1"
              width={150}
              height={75}
              className="bg-white p-4 rounded-lg"
            />
            <Image
              src="/images/partner2-logo.png"
              alt="Partner 2"
              width={150}
              height={75}
              className="bg-white p-4 rounded-lg"
            />
            <Image
              src="/images/partner3-logo.png"
              alt="Partner 3"
              width={150}
              height={75}
              className="bg-white p-4 rounded-lg"
            />
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-100">
            چرا ما را انتخاب کنید؟
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <FaCoins className="text-4xl text-blue-500 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">نرخ‌های رقابتی</h3>
              <p className="text-gray-600 dark:text-gray-400">
                بهترین نرخ‌های ارز در بازار را به شما ارائه می‌دهیم.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <FaChartLine className="text-4xl text-green-500 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">سرعت بالا</h3>
              <p className="text-gray-600 dark:text-gray-400">
                انتقال سریع ارز در کمترین زمان ممکن.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <FaGlobe className="text-4xl text-purple-500 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">پوشش جهانی</h3>
              <p className="text-gray-600 dark:text-gray-400">
                امکان انتقال ارز به اکثر کشورهای جهان.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
