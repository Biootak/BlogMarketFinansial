'use client';

import dynamic from 'next/dynamic';

/**
 * QuickActionsGate — دکمه‌های اکشن شناور فقط در دسکتاپ (≥768px) دیده می‌شوند.
 * ----------------------------------------------------------------------------
 * 2026-08-15 (mobile perf): JS این کامپوننت با `ssr:false` از bundle اولیه
 * خارج شد (الگوی CryptoTickerSliderLazy) — روی موبایل CSS-hidden است ولی
 * hydration آن در first-load همهٔ صفحات (حتی موبایل) اجرا می‌شد. حالا فقط
 * بعد از mount کلاینت لود می‌شود → TBT کمتر روی موبایل. loading=null → بدون
 * CLS (کامپوننت شناور است).
 */
const QuickActions = dynamic(() => import('./QuickActions'), {
  ssr: false,
  loading: () => null,
});

const QuickActionsGate = () => {
  return <QuickActions />;
};

export default QuickActionsGate;
