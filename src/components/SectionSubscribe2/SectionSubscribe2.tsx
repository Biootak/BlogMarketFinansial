import type { FC } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import SubscribeForm from './SubscribeForm';
import { subscribeToNewsletter } from '@/actions/newsletter';

export interface SectionSubscribe2Props {
  className?: string;
}

const SectionSubscribe2: FC<SectionSubscribe2Props> = async ({ className = '' }) => {
  return (
    <section
      className={`nc-SectionSubscribe2 relative flex flex-col lg:flex-row mb-8 items-center ${className} p-4 sm:p-6 md:p-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-2xl overflow-hidden`}
      dir="rtl"
    >
      <div className="flex-shrink-0 w-full lg:w-2/5 mb-10 lg:mb-0 lg:ml-10">
        <h2 className="font-bold text-xl sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 leading-tight">
          به خبرنامه ما بپیوندید
        </h2>
        <p className="mt-4 sm:mt-6 text-gray-600 dark:text-gray-300 text-base sm:text-lg">
          آخرین اخبار، اخبار و ایده‌های نوآورانه را مستقیماً دریافت کنید. برای همه علاقه‌مندان به دانش
          و خلاقیت.
        </p>
        <ul className="space-y-4 mt-6 sm:mt-8">
          <li className="flex items-center space-x-4 space-x-reverse">
            <Badge variant="outline" className="text-purple-600 dark:text-purple-400 animate-pulse">
              ۰۱
            </Badge>
            <span className="font-medium text-gray-700 dark:text-gray-200 text-sm sm:text-base">
              دسترسی به محتوای انحصاری
            </span>
          </li>
          <li className="flex items-center space-x-4 space-x-reverse">
            <Badge variant="outline" className="text-pink-600 dark:text-pink-400 animate-pulse">
              ۰۲
            </Badge>
            <span className="font-medium text-gray-700 dark:text-gray-200 text-sm sm:text-base">
              اطلاع از رویدادها و وبینارهای ویژه
            </span>
          </li>
        </ul>
        <SubscribeForm onSubmit={subscribeToNewsletter} />
      </div>
      <div className="flex-grow w-full lg:w-3/5 mt-10 lg:mt-0">
        <div className="relative w-full h-0 pb-[75%] lg:pb-[56.25%]">
          <Image
            alt="تصویر عضویت در خبرنامه"
            src="/images/subcribe.svg"
            fill
            className="rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl object-cover"
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default SectionSubscribe2;
