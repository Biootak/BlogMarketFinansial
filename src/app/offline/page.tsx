/**
 * /offline — Million-dollar offline/network state (2026)
 *
 * Used by:
 *   - service-worker offline.html
 *   - Next.js client fallback when fetch fails
 *
 * Note: this is a Server Component but it has no DB calls — fully static
 * and cacheable so it can be served from a CDN edge or a SW cache.
 */
import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import type { Metadata } from 'next';
import { StatePage } from '@/components/StatePage';
import { getSystemSettingsData } from '@/data/getSystemSettings';

export const metadata: Metadata = {
  title: 'اتصال برقرار نیست | آفلاین',
  robots: { index: false },
};

export default async function OfflinePage() {
  const settings = await getSystemSettingsData();
  const supportEmail = settings.contactEmail ?? 'support@financialmarket.page';

  return (
    <StatePage
      number="OFF"
      eyebrow="حالت آفلاین"
      title="ارتباط با اینترنت برقرار نیست"
      lead="به نظر می‌رسد اتصال اینترنت شما قطع شده یا سیگنال ضعیف است. می‌توانید صفحاتی که قبلاً بازدید کرده‌اید را مرور کنید."
      cardTitle="چه کار کنم؟"
      cardBody="Wi-Fi یا دادهٔ موبایل خود را بررسی کنید. در بسیاری از موارد، روشن و خاموش کردن حالت پرواز مشکل را حل می‌کند."
      icon={CloudOff}
      helpList={[
        'Wi-Fi یا دادهٔ سیم‌کارت را خاموش و دوباره روشن کنید.',
        'مودم یا روتر را یک‌بار ری‌استارت کنید.',
        'صفحه را رفرش کنید یا دکمهٔ «تلاش مجدد» را بزنید.',
        'اگر مشکل ادامه داشت، با پشتیبانی شبکه تماس بگیرید.',
      ]}
      actions={[
        { label: 'تلاش مجدد', href: '/', icon: RefreshCw, variant: 'primary' },
        { label: 'وضعیت سرویس', href: '/api/system-status', icon: Wifi, variant: 'ghost' },
      ]}
      meta={[
        { label: 'وضعیت', value: 'Offline' },
        { label: 'آخرین همگام‌سازی', value: 'چند لحظه پیش' },
        { label: 'پشتیبانی', value: '۲۴/۷' },
        { label: 'نوع خطا', value: 'Network' },
      ]}
      foot={{
        label: 'سرویس از کار افتاده؟',
        href: `mailto:${supportEmail}`,
      }}
      tone="danger"
    />
  );
}
