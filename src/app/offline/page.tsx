import { StateHero } from '@/components/Dashboard/primitives/StateHero';
import { getSystemSettingsData } from '@/data/getSystemSettings';
/**
 * /offline — حالت آفلاین (همان زبان طراحی صفحهٔ ۴۰۳).
 *
 * Used by:
 *   - service-worker offline.html
 *   - Next.js client fallback when fetch fails
 *
 * Note: this is a Server Component but it has no DB calls — fully static
 * and cacheable so it can be served from a CDN edge or a SW cache.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'اتصال برقرار نیست | آفلاین',
  robots: { index: false },
};

export default async function OfflinePage() {
  const settings = await getSystemSettingsData();
  const supportEmail = settings.contactEmail ?? 'support@financialmarket.page';

  return (
    <StateHero
      code="OFF"
      mark="offline"
      tone="cyan"
      eyebrow="حالت آفلاین"
      title="ارتباط با اینترنت برقرار نیست"
      description="به نظر می‌رسد اتصال اینترنت شما قطع شده یا سیگنال ضعیف است. می‌توانید صفحاتی که قبلاً بازدید کرده‌اید را مرور کنید."
      showPath={false}
      helpItems={[
        'Wi-Fi یا دادهٔ سیم‌کارت را خاموش و دوباره روشن کنید.',
        'مودم یا روتر را یک‌بار ری‌استارت کنید.',
        'صفحه را رفرش کنید یا دکمهٔ «تلاش مجدد» را بزنید.',
        'اگر مشکل ادامه داشت، با پشتیبانی شبکه تماس بگیرید.',
      ]}
      meta={[
        { label: 'وضعیت', value: 'Offline' },
        { label: 'آخرین همگام‌سازی', value: 'چند لحظه پیش' },
        { label: 'پشتیبانی', value: '۲۴/۷' },
        { label: 'نوع خطا', value: 'Network' },
      ]}
      suggestedLinks={[
        { href: '/', label: 'صفحهٔ اصلی', sub: 'ادامهٔ مرور سایت' },
        {
          href: '/api/system-status',
          label: 'وضعیت سرویس',
          sub: 'بررسی سلامت سرویس‌ها',
          icon: 'shield',
        },
      ]}
      primaryLink={{ href: '/', label: 'تلاش مجدد', icon: 'refresh' }}
      secondaryLinks={[{ href: '/api/system-status', label: 'وضعیت سرویس', icon: 'shield' }]}
      foot={{
        label: 'سرویس از کار افتاده؟',
        href: `mailto:${supportEmail}`,
      }}
    />
  );
}
