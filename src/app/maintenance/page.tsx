/**
 * /maintenance — Million-dollar maintenance state (2026)
 *
 * Used by middleware when SystemSettings.maintenanceMode is enabled.
 * Editor-friendly: admins can preview the page at any time.
 *
 * Asymmetric editorial composition. Tokens-only, mobile-first.
 */
import { ArrowLeft, Construction, RefreshCw } from 'lucide-react';
import type { Metadata } from 'next';
import { StatePage } from '@/components/StatePage';
import { getSystemSettingsData } from '@/data/getSystemSettings';

export const metadata: Metadata = {
  title: 'در حال به‌روزرسانی | صفحهٔ موقت',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

function formatJalali(d: Date) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16);
  }
}

export default async function MaintenancePage() {
  // we read settings so any site-specific message override can be picked up
  // in the future without a separate round-trip. Today we render a generic
  // but branded message.
  const settings = await getSystemSettingsData();
  const siteName = settings.siteName ?? 'Financial Market';
  const now = new Date();

  return (
    <StatePage
        number="MNT"
        eyebrow="در حال به‌روزرسانی"
        title="سایت موقتاً در دسترس نیست"
        lead={`${siteName} در حال ارتقای زیرساخت و بهبود تجربهٔ کاربری است. خیلی زود برمی‌گردیم. از صبر و همراهی شما سپاسگزاریم.`}
        cardTitle="چه خبر است؟"
        cardBody="مهندسان ما در حال اعمال تغییرات زیرساختی، بهبود امنیت، و افزایش سرعت سایت هستند. این فرایند معمولاً کمتر از ۳۰ دقیقه طول می‌کشد."
        icon={Construction}
        helpList={[
          'تمام داده‌ها و حساب‌های شما امن هستند.',
          'تراکنش‌های در جریان پس از پایان به‌روزرسانی ادامه می‌یابند.',
          'برای اطلاع فوری، کانال تلگرام ما را دنبال کنید.',
        ]}
        actions={[
          { label: 'تلاش مجدد', href: '/', icon: RefreshCw, variant: 'primary' },
          {
            label: 'تلگرام پشتیبانی',
            href: settings.telegram ?? 'https://t.me/blogmarketfinansial',
            icon: ArrowLeft,
            variant: 'ghost',
            external: true,
          },
        ]}
        meta={[
          { label: 'تخمین پایان', value: 'کمتر از ۳۰ دقیقه' },
          { label: 'زمان فعلی', value: formatJalali(now) },
          { label: 'نسخه', value: '۲۰۲۶.۰۷' },
          { label: 'وضعیت', value: 'Maintenance' },
        ]}
        foot={{
          label: 'سوال فوری دارید؟',
          href: 'mailto:support@blogmarketfinansial.ir',
        }}
        tone="warn"
      />
  );
}
