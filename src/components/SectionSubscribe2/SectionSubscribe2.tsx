import type { FC } from 'react';
import Image from 'next/image';
import SubscribeForm from './SubscribeForm';
import { subscribeToNewsletter } from '@/actions/newsletter';
import { Mail, Sparkles, Bell, Gift } from 'lucide-react';

export interface SectionSubscribe2Props {
  className?: string;
}

const SectionSubscribe2: FC<SectionSubscribe2Props> = async ({ className = '' }) => {
  return (
    <section
      className={`nc-SectionSubscribe2 relative ${className}`}
      dir="rtl"
    >
      {/* Main Container */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 dark:from-primary-800 dark:via-primary-900 dark:to-neutral-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Floating Decorations - Smaller on mobile */}
        <div className="absolute top-5 sm:top-10 start-5 sm:start-10 w-12 sm:w-20 h-12 sm:h-20 bg-white/10 rounded-full blur-xl sm:blur-2xl" />
        <div className="absolute bottom-5 sm:bottom-10 end-5 sm:end-10 w-20 sm:w-32 h-20 sm:h-32 bg-white/10 rounded-full blur-2xl sm:blur-3xl" />

        {/* Content */}
        <div className="relative flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-12 p-4 sm:p-6 lg:p-12">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-start">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 sm:mb-6 border border-white/20">
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span className="text-xs sm:text-sm font-medium text-white/90">خبرنامه هفتگی</span>
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-black text-white leading-tight mb-3 sm:mb-4">
              به خبرنامه ما
              <span className="block text-amber-300">بپیوندید</span>
            </h2>

            {/* Description */}
            <p className="text-white/80 text-sm sm:text-base lg:text-lg mb-5 sm:mb-8 max-w-md mx-auto lg:mx-0">
              آخرین اخبار بازارهای مالی و تحلیل‌های تخصصی را مستقیماً در ایمیل خود دریافت کنید.
            </p>

            {/* Features - Hidden on small mobile */}
            <div className="hidden sm:flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 justify-center lg:justify-start">
              <div className="flex items-center gap-2 sm:gap-3 text-white/90">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                </div>
                <span className="text-xs sm:text-sm font-medium">اطلاع‌رسانی فوری</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-white/90">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center">
                  <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                </div>
                <span className="text-xs sm:text-sm font-medium">محتوای انحصاری</span>
              </div>
            </div>

            {/* Subscribe Form */}
            <div className="max-w-md mx-auto lg:mx-0">
              <SubscribeForm onSubmit={subscribeToNewsletter} />
            </div>

            {/* Trust Text */}
            <p className="mt-4 sm:mt-6 text-white/50 text-[10px] sm:text-xs">
              بیش از ۱۰,۰۰۰ کاربر عضو خبرنامه ما هستند
            </p>
          </div>

          {/* Image - Hidden on small mobile, shown on sm+ */}
          <div className="hidden sm:block flex-1 w-full max-w-sm lg:max-w-none">
            <div className="relative aspect-square lg:aspect-[4/3]">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-primary-400/30 rounded-2xl sm:rounded-3xl blur-xl sm:blur-2xl scale-90" />
              
              {/* Image Container */}
              <div className="relative h-full rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                <Image
                  alt="عضویت در خبرنامه"
                  src="/images/subcribe.svg"
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  priority
                />
              </div>

              {/* Floating Card - Adjusted for mobile */}
              <div className="absolute -bottom-2 -start-2 sm:bottom-4 sm:start-4 bg-white dark:bg-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl border border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">رایگان و بدون اسپم</p>
                    <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">هر زمان لغو اشتراک</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionSubscribe2;
