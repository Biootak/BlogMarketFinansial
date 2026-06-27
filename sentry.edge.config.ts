import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // فقط در production فعال باشه
  enabled: process.env.NODE_ENV === 'production',

  // درصد نمونه‌گیری برای performance
  tracesSampleRate: 0.1,

  // تنظیمات اضافی
  environment: process.env.NODE_ENV,
});
