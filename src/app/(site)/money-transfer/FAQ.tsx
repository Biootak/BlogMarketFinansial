'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';

const faqs = [
  {
    question: 'نرخ‌های ارز هر چند وقت به‌روزرسانی می‌شوند؟',
    answer:
      'نرخ‌های ارز در سایت بیوتاک به صورت دوره‌ای و بر اساس تغییرات بازار به‌روزرسانی می‌شوند. شما می‌توانید آخرین نرخ‌ها را در بخش "لیست نرخ‌های ارز" مشاهده کنید.',
  },
  {
    question: 'چگونه می‌توانم درخواست حواله ثبت کنم؟',
    answer:
      'برای ثبت درخواست حواله، کافیست فرم درخواست را در همین صفحه پر کنید یا از طریق واتساپ و تلگرام با پشتیبانی ما در ارتباط باشید. کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.',
  },
  {
    question: 'کدام ارزها پشتیبانی می‌شوند؟',
    answer:
      'ما طیف گسترده‌ای از ارزها را پشتیبانی می‌کنیم، از جمله دلار آمریکا، یورو، پوند انگلیس، درهم امارات، لیر ترکیه، دلار کانادا، دلار استرالیا و افغانی. برای اطلاع از لیست کامل، به جداول نرخ در بالای صفحه مراجعه کنید.',
  },
  {
    question: 'آیا امکان حواله به افغانستان وجود دارد؟',
    answer:
      'بله، حواله به افغانستان یکی از خدمات اصلی ماست. شما می‌توانید به صورت افغانی یا دلار به افغانستان حواله ارسال کنید. نرخ‌های مربوطه در بخش "نرخ اسعار سرای شاهزاده" قابل مشاهده است.',
  },
  {
    question: 'حداقل و حداکثر مبلغ حواله چقدر است؟',
    answer:
      'حداقل و حداکثر مبلغ حواله بسته به نوع ارز و مقصد متفاوت است. برای اطلاع از جزئیات، لطفاً با پشتیبانی تماس بگیرید یا فرم درخواست را پر کنید تا کارشناسان ما راهنمایی کنند.',
  },
  {
    question: 'چگونه می‌توانم از صحت نرخ‌ها مطمئن شوم؟',
    answer:
      'نرخ‌های نمایش داده شده در سایت بر اساس نرخ‌های بازار آزاد و صرافی‌های معتبر است. با این حال، نرخ نهایی در زمان انجام تراکنش ممکن است کمی متفاوت باشد. برای دریافت نرخ دقیق، با پشتیبانی تماس بگیرید.',
  },
];

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="relative overflow-hidden" dir="rtl">
      {/* Decorative Elements */}
      <div className="hidden sm:block absolute -top-20 -left-20 w-72 h-72 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="hidden sm:block absolute -bottom-20 -right-20 w-72 h-72 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-12 lg:mb-16 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-50 dark:bg-violet-500/10 rounded-full mb-4">
          <HelpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-medium text-violet-600 dark:text-violet-400">پاسخ به سوالات شما</span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4">
          سؤالات متداول
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          پاسخ سوالات رایج درباره خدمات انتقال ارز
        </p>
      </div>

      {/* FAQ Items */}
      <div className="max-w-3xl mx-auto space-y-4 relative">
        {faqs.map((faq, index) => {
          const isActive = activeIndex === index;
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`group relative bg-white dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden ${
                isActive
                  ? 'border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-500/10'
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveIndex(isActive ? null : index)}
                className="flex items-center justify-between w-full p-5 lg:p-6 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-2xl"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500'
                  }`}>
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className={`font-semibold text-base lg:text-lg transition-colors duration-300 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}>
                    {faq.question}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isActive ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                  }`}
                >
                  <ChevronDown className="w-5 h-5" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  >
                    <div className="px-5 lg:px-6 pb-5 lg:pb-6 pr-[4.5rem] lg:pr-[5rem]">
                      <div className="h-px bg-gradient-to-l from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-4" />
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm lg:text-base">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Contact CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          سوال دیگری دارید؟
        </p>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-300"
        >
          <MessageCircle className="w-5 h-5" />
          <span>با ما در تماس باشید</span>
        </a>
      </motion.div>
    </div>
  );
}
