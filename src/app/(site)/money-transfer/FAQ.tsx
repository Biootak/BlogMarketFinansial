'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';

const faqs = [
  {
    question: 'چگونه می‌توانم حواله ارزی انجام دهم؟',
    answer:
      'برای انجام حواله ارزی، ابتدا باید در سایت ثبت‌نام کنید. سپس می‌توانید از طریق پنل کاربری خود، درخواست حواله را ثبت کرده و مراحل را طی کنید.',
  },
  {
    question: 'چه ارزهایی برای حواله پشتیبانی می‌شوند؟',
    answer:
      'ما در حال حاضر حواله‌های دلار، یورو، پوند و درهم را پشتیبانی می‌کنیم. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
  },
  {
    question: 'زمان انتقال حواله چقدر است؟',
    answer:
      'زمان انتقال حواله بسته به نوع ارز و مقصد متفاوت است. معمولاً بین 1 تا 3 روز کاری طول می‌کشد.',
  },
];

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="mt-16">
      <h2 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
        سؤالات متداول
      </h2>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              type="button"
              className="flex justify-between items-center w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
            >
              <span className="font-medium text-gray-800 dark:text-gray-100">{faq.question}</span>
              <FaChevronDown
                className={`transform transition-transform duration-200 ${
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
                  <div className="p-4 text-gray-600 dark:text-gray-300">{faq.answer}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
