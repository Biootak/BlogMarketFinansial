'use client';

/**
 * FAQ — Native <details> accordion with CSS interpolate-size (2026)
 * Design system classes only: mt-faq-item, mt-faq-trigger, mt-section-header, etc.
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
      {/* Header — design system classes */}
      <div className="mt-section-header mt-section-header--center">
        <span className="mt-eyebrow">
          <HelpCircle className="w-3 h-3" aria-hidden />
          پاسخ به سوالات شما
        </span>
        <h2 className="mt-section-title">سؤالات متداول</h2>
        <p className="mt-section-lead">پاسخ سوالات رایج درباره خدمات انتقال ارز</p>
      </div>

      {/* FAQ Items — native <details> accordion */}
      <div className="max-w-3xl mx-auto space-y-2">
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
      <div className="mt-8 text-center">
        <p className="mt-section-lead mx-auto mb-4">سوال دیگری دارید؟</p>
        <a
          href="#contact"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors duration-200"
        >
          <MessageCircle className="w-4 h-4" />
          <span>با ما در تماس باشید</span>
        </a>
      </div>
    </div>
  );
}
