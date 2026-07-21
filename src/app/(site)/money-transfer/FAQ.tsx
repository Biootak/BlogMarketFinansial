'use client';

/**
 * FAQ — Native <details> accordion with CSS interpolate-size (2026)
 * ---------------------------------------------------------------------------
 * Replaces framer-motion AnimatePresence with native <details> +
 * ::details-content + interpolate-size: allow-keywords.
 *
 * Why this is better:
 *  - Zero JS animation runtime — height transitions are CSS-native
 *  - Free keyboard handling (Enter/Space to toggle)
 *  - Screen reader announcements built-in
 *  - Works without JS (progressive enhancement)
 *  - Smaller bundle: removes motion-shim dependency from this page
 *
 * Design: Linear-style clean list with subtle borders, no heavy gradients.
 */

import { HelpCircle, MessageCircle } from 'lucide-react';

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
  return (
    <div dir="rtl">
      {/* Header */}
      <div className="text-center mb-12 lg:mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
          <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            پاسخ به سوالات شما
          </span>
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
          سؤالات متداول
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          پاسخ سوالات رایج درباره خدمات انتقال ارز
        </p>
      </div>

      {/* FAQ Items — native <details> with CSS interpolate-size */}
      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((faq, index) => (
          <details key={faq.question} className="mt-faq-item group">
            <summary className="mt-faq-trigger">
              <span className="mt-faq-index" aria-hidden>
                {String(index + 1).padStart(2, '۰')}
              </span>
              <span className="mt-faq-question">{faq.question}</span>
              <span className="mt-faq-chevron" aria-hidden>
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true">
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </summary>
            <div className="mt-faq-content">
              <p className="mt-faq-answer">{faq.answer}</p>
            </div>
          </details>
        ))}
      </div>

      {/* Contact CTA */}
      <div className="mt-12 text-center">
        <p className="text-slate-500 dark:text-slate-400 mb-4">سوال دیگری دارید؟</p>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-200"
        >
          <MessageCircle className="w-5 h-5" />
          <span>با ما در تماس باشید</span>
        </a>
      </div>
    </div>
  );
}
