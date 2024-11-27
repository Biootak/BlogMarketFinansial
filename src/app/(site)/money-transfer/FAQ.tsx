'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from 'lucide-react';

const faqs = [
  {
    question: 'مراحل انجام حواله ارزی چیست؟',
    answer:
      'برای انجام حواله ارزی، ابتدا در سایت ثبت‌نام کنید. سپس از طریق پنل کاربری، درخواست حواله را ثبت کرده و مبلغ مورد نظر را به حساب اعلام شده واریز نمایید. پس از تأیید واریزی، حواله شما در اسرع وقت انجام خواهد شد. یا به پشتیبانی برا ثبت سفارش پیام دهید .',
  },
  {
    question: 'کدام ارزها برای حواله پشتیبانی می‌شوند؟',
    answer:
      'ما طیف گسترده‌ای از ارزها را پشتیبانی می‌کنیم، از جمله دلار آمریکا، یورو، پوند انگلیس، کرون و حواله به افغانستان. برای اطلاع از لیست کامل ارزها و نرخ‌های روز، لطفاً به بخش "نرخ‌های لحظه‌ای ارز" مراجعه فرمایید.',
  },
  {
    question: 'زمان تقریبی انجام حواله چقدر است؟',
    answer:
      'زمان انجام حواله بسته به نوع ارز، مقصد و شرایط بانکی متفاوت است. معمولاً حواله‌های رایج مانند دلار و یورو بین 1 تا 2 روز کاری انجام می‌شوند. برای سایر ارزها، این زمان ممکن است تا 3 روز کاری افزایش یابد. در موارد خاص و فوری، امکان انجام حواله در همان روز نیز وجود دارد.',
  },
  {
    question: 'آیا برای انجام حواله نیاز به مراجعه حضوری است؟',
    answer:
      'خیر، تمامی مراحل انجام حواله به صورت آنلاین و از طریق پنل کاربری انجام می‌شود. تنها در موارد خاص و برای مبالغ بسیار بالا ممکن است نیاز به ارائه مدارک تکمیلی باشد که آن هم به صورت آنلاین قابل انجام است.',
  },
  {
    question: 'کارمزد حواله‌های ارزی چقدر است؟',
    answer:
      'کارمزد حواله‌ها بسته به نوع ارز، مبلغ و مقصد متفاوت است. ما تلاش می‌کنیم کمترین کارمزد را در بازار ارائه دهیم. برای اطلاع از کارمزد دقیق حواله مورد نظر خود، می‌توانید در پنل کاربری یک پیش‌فاکتور دریافت کنید یا با پشتیبانی تماس بگیرید.',
  },
  {
    question: 'آیا انجام حواله ارزی نیاز به ارائه مدارک خاصی دارد؟',
    answer:
      'برای حواله‌های با مبالغ معمول، تنها نیاز به احراز هویت اولیه در سایت است. برای مبالغ بالاتر، ممکن است نیاز به ارائه مدارکی مانند گذرنامه، کارت ملی یا مدارک مربوط به منشأ وجه باشد. این روند برای رعایت قوانین مبارزه با پولشویی و تضمین امنیت تراکنش‌های شماست.',
  },
];

export default function Component() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="mt-8 sm:mt-16 rtl" dir="rtl">
      <h2 className="text-2xl sm:text-xl font-bold text-center mb-6 sm:mb-8 text-gray-800 dark:text-gray-100">
        سؤالات متداول
      </h2>
      <div className="space-y-3 sm:space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              className="flex justify-between items-center w-full p-3 sm:p-4 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            >
              <span className="font-medium text-sm sm:text-base text-gray-800 dark:text-gray-100">
                {faq.question}
              </span>
              <ChevronDownIcon
                className={`w-4 h-4 sm:w-5 sm:h-5 transform transition-transform duration-200 ${
                  activeIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {activeIndex === index && (
                <motion.div
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: 'auto' },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                >
                  <div className="p-3 sm:p-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
