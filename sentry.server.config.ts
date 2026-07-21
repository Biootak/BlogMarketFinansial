import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // فقط در production فعال باشه
  enabled: process.env.NODE_ENV === 'production',

  // 2026-06-14: use a `tracesSampler` instead of a flat
  // `tracesSampleRate`. We keep 10% for the bulk of the app, but
  // sample heavy endpoints (uploads, the future S3 proxy) at 1%
  // and database/Prisma transactions at 5% — those are the ones
  // that already get sampled for performance anyway.
  tracesSampler: (samplingContext) => {
    const url = samplingContext.request?.url || '';
    const name = samplingContext.transactionContext?.name || '';
    if (url.includes('/api/uploads') || url.includes('/api/pageview')) return 0.01;
    if (name.toLowerCase().includes('prisma') || name.toLowerCase().includes('db.')) return 0.05;
    return 0.1;
  },

  // تنظیمات اضافی
  environment: process.env.NODE_ENV,

  // فیلتر کردن خطاهای غیرمهم
  ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
});
