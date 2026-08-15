'use client';

import dynamic from 'next/dynamic';

/**
 * MobileBottomNavGate — ناوبری پایین فقط در موبایل دیده می‌شود.
 * ----------------------------------------------------------------------------
 * 2026-08-15 (mobile perf): JS این نوار با `ssr:false` از bundle اولیهٔ همهٔ
 * صفحات خارج شد (الگوی CryptoTickerSliderLazy/MenuDrawer) — فقط بعد از mount
 * کلاینت لود می‌شود. روی موبایل‌های ضعیف، حذف hydration آن از main thread در
 * لحظهٔ لود اولیه = TBT کمتر. loading=null تا skeleton اضافه‌ای نمایش داده
 * نشود (CLS صفر — نوار در پایین viewport است).
 */
const MobileBottomNav = dynamic(() => import('./MobileBottomNav'), {
  ssr: false,
  loading: () => null,
});

const MobileBottomNavGate = () => {
  return <MobileBottomNav />;
};

export default MobileBottomNavGate;
