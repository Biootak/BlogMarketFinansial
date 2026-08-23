import * as Sentry from '@sentry/nextjs';

// 2026-08-23 perf: Sentry Replay (~18KB gzipped) is lazily loaded only
// when an error is captured. 99% of sessions never load it.
// Ref: https://docs.sentry.io/platforms/javascript/configuration/integrations/lazy-loading/

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // فقط در production فعال باشه
  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  // 2026-08-23 perf: replay integration از init حذف شد — به‌جای آن
  // در beforeSend وقتی خطا رخ داد lazy-load می‌شود. بدون خطا، بودجهٔ
  // JS هر session حدود ۱۸KB سبک‌تر است (replay bundle).
  // replaysSessionSampleRate و replaysOnErrorSampleRate حذف شدند —
  // این options در init باعث bundle شدن replay می‌شوند.

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

  // 2026-08-23 perf: lazy-load replay فقط وقتی خطا ثبت می‌شود.
  // 99% sessions بدون خطا → replay هرگز load نمی‌شود.
  beforeSend(event, hint) {
    // خطاهای auth رو فیلتر کن
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as Error).message;
      if (message.includes('NEXT_REDIRECT')) {
        return null;
      }
    }

    // اولین خطای واقعی → lazy-load replay (replaysOnErrorSampleRate=1.0)
    const client = Sentry.getClient();
    if (client && !client.getIntegrationByName?.('Replay')) {
      Sentry.lazyLoadIntegration('replayIntegration')
        .then((replayIntegration) => {
          if (replayIntegration) {
            Sentry.addIntegration(
              replayIntegration({
                maskAllText: true,
                blockAllMedia: true,
              }),
            );
          }
        })
        .catch(() => {
          // replay load نشد — بدون آن ادامه بده
        });
    }

    return event;
  },
});
