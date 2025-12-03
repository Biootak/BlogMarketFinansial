import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // فقط در production فعال باشه
  enabled: process.env.NODE_ENV === 'production',

  // درصد نمونه‌گیری برای performance
  tracesSampleRate: 0.1, // 10% از transactions

  // درصد نمونه‌گیری برای replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // تنظیمات اضافی
  environment: process.env.NODE_ENV,

  // فیلتر کردن خطاهای غیرمهم
  ignoreErrors: [
    // خطاهای شبکه
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    // خطاهای مرورگر
    'ResizeObserver loop',
    'Non-Error promise rejection',
    // خطاهای third-party
    /^Script error\.?$/,
  ],

  // قبل از ارسال خطا
  beforeSend(event, hint) {
    // فیلتر کردن خطاهای خاص
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as Error).message;
      // خطاهای auth رو نفرست
      if (message.includes('NEXT_REDIRECT')) {
        return null;
      }
    }
    return event;
  },
});
