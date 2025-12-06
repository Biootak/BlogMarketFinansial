import React from 'react';

import ButtonPrimary from '@/components/Button/ButtonPrimary';
import ButtonSecondary from '@/components/Button/ButtonSecondary';
import Heading2 from '@/components/Heading/Heading2';
import { Check } from 'lucide-react';

export interface PricingItem {
  isPopular: boolean;
  name: string;
  pricing: string;
  desc: string;
  per: string;
  features: string[];
}

const pricings: PricingItem[] = [
  {
    isPopular: false,
    name: 'استارتر',
    pricing: '۵ دلار',
    per: 'ماهانه',
    features: ['گزارش‌دهی خودکار', 'پردازش سریع‌تر', 'سفارشی‌سازی'],
    desc: ' این طرح برای شروع کار شما مناسب است.',
  },
  {
    isPopular: true,
    name: 'پایه',
    pricing: '۱۵ دلار',
    per: 'ماهانه',
    features: ['همه امکانات طرح استارتر', '۱۰۰ ساخت', 'گزارش‌های پیشرفت', 'پشتیبانی ویژه'],
    desc: ' این طرح محبوب‌ترین طرح ما است و برای اکثر کسب‌وکارها مناسب است.',
  },
  {
    isPopular: false,
    name: 'پلاس',
    pricing: '۲۵ دلار',
    per: 'ماهانه',
    features: ['همه امکانات طرح پایه', 'ساخت نامحدود', 'تجزیه و تحلیل پیشرفته', 'ارزیابی شرکت'],
    desc: ' این طرح برای کسب‌وکارهای بزرگ و با نیازهای پیشرفته مناسب است.',
  },
];

const PageSubcription = ({}) => {
  const renderPricingItem = (pricing: PricingItem, index: number) => {
    return (
      <div
        key={index}
        className={`h-full relative px-6 py-8 rounded-3xl border-2 flex flex-col overflow-hidden rtl ${
          pricing.isPopular ? 'border-primary-500' : 'border-neutral-100 dark:border-neutral-700'
        }`}
      >
        {pricing.isPopular && (
          <span className="bg-primary-500 text-white px-3 py-1 tracking-widest text-xs absolute start-3 top-3 rounded-full z-10">
            محبوب
          </span>
        )}
        <div className="mb-8">
          <h3 className="block text-sm uppercase tracking-widest text-neutral-6000 dark:text-neutral-300 mb-2 font-medium">
            {pricing.name}
          </h3>
          <h2 className="text-5xl leading-none flex items-center text-neutral-700 dark:text-neutral-300">
            <span>{pricing.pricing}</span>
            <span className="text-lg ms-1 font-normal text-neutral-500 dark:text-neutral-300">
              {pricing.per}
            </span>
          </h2>
        </div>
        <nav className="space-y-4 mb-8">
          {pricing.features.map((item, index) => (
            <li className="flex items-center" key={index}>
              <span className="me-4 inline-flex flex-shrink-0 text-primary-6000">
                <Check className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-neutral-700 dark:text-neutral-300">{item}</span>
            </li>
          ))}
        </nav>
        <div className="flex flex-col mt-auto">
          {pricing.isPopular ? (
            <ButtonPrimary>ثبت نام</ButtonPrimary>
          ) : (
            <ButtonSecondary>
              <span className="font-medium">ثبت نام</span>
            </ButtonSecondary>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">{pricing.desc}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="rtl">
      <header className="text-center max-w-2xl mx-auto - mb-14 sm:mb-16 lg:mb-20">
        <Heading2 emoji="💎">طرح‌های اشتراک</Heading2>
        <span className="block text-sm mt-2 text-neutral-700 sm:text-base dark:text-neutral-200">
          قیمت‌گذاری مناسب برای هر نوع کسب و کار
        </span>
      </header>

      <section className="text-neutral-600 text-sm md:text-base overflow-hidden">
        <div className="grid lg:grid-cols-3 gap-5 xl:gap-8">{pricings.map(renderPricingItem)}</div>
      </section>
    </div>
  );
};

export default PageSubcription;
