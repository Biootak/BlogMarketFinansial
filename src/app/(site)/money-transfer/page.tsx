import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';

import { FaTelegram, FaWhatsapp } from 'react-icons/fa';
import ExchangeRateTable from './ExchangeRateTable';
import InfoCards from './InfoCards';
import FAQ from './FAQ';
import { getExchangeRates } from '@/actions/exchange-rates';

export const metadata: Metadata = {
  title: 'صرافی آنلاین | انتقال ارز سریع و مطمئن',
  description: 'بهترین نرخ‌های حواله ارزی برای انتقال سریع و امن پول در سراسر جهان',
};

export default async function MoneyTransferPage() {
  const exchangeRates = await getExchangeRates();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-blue-600 text-white py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-75" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">انتقال ارز سریع و مطمئن</h1>
              <p className="text-xl mb-8">
                بهترین نرخ‌ها برای حواله ارزی در سراسر جهان با امنیت بالا و کارمزد پایین
              </p>
              <a
                href="#rates"
                className="bg-white text-blue-600 px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-100 transition-colors duration-300"
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

      <div className="container mx-auto px-4 py-12">
        <section id="services">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">
            خدمات ویژه ما
          </h2>
          <InfoCards />
        </section>

        <main
          id="rates"
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden my-12"
        >
          <div className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
              نرخ‌های لحظه‌ای ارز
            </h2>
            <Suspense fallback={<div className="text-center">در حال بارگذاری نرخ‌های ارز...</div>}>
              <ExchangeRateTable exchangeRates={exchangeRates} />
            </Suspense>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-8 py-4 flex justify-between items-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              آخرین به‌روزرسانی: {new Date().toLocaleString('fa-IR')}
            </p>
          </div>
        </main>

        <section id="contact" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 my-12">
          <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
            ارتباط با پشتیبانی
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
            برای ثبت سفارش و دریافت مشاوره رایگان، با کارشناسان ما در ارتباط باشید
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-2 space-y-4 md:space-y-0 md:space-x-8">
            <a
              href="https://t.me/Financial_Market_telegram"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition-colors duration-300"
            >
              <FaTelegram className="ml-2" size={24} />
              پشتیبانی تلگرام
            </a>
            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 transition-colors duration-300"
            >
              <FaWhatsapp className="ml-2" size={24} />
              پشتیبانی واتساپ
            </a>
          </div>
        </section>

        <section id="faq">
          <FAQ />
        </section>
      </div>
    </div>
  );
}
