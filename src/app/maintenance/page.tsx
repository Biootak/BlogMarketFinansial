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
  // 2026-07-29: پیام سفارشی ادمین ارشد دریافت می‌شود — اگر خالی باشد متن پیش‌فرض نمایش می‌دهیم
  const settings = await getSystemSettingsData();
  const siteName = settings.siteName ?? 'Financial Market';
  const customMessage = settings.maintenanceMessage?.trim();
  const leadMessage =
    customMessage && customMessage.length > 0
      ? customMessage
      : `${siteName} در حال ارتقای زیرساخت و بهبود تجربهٔ کاربری است. خیلی زود برمی‌گردیم. از صبر و همراهی شما سپاسگزاریم.`;
  const now = new Date();

  return (
    <StatePage
        number="MNT"
        eyebrow="در حال به‌روزرسانی"
        title="سایت موقتاً در دسترس نیست"
        lead={leadMessage}
        cardTitle="چه خبر است؟"
        cardBody="مهندسان ما در حال اعمال تغییرات زیرساختی، بهبود امنیت، و افزایش سرعت سایت هستند. این فرایند معمولاً کمتر از ۳۰ دقیقه طول می‌کشد."
        icon={Construction}
        helpList={[
          'تمام داده‌ها و حساب‌های شما امن هستند.',
          'تراکنش‌های در جریان پس از پایان به‌روزرسانی ادامه می‌یابند.',
          ...(settings.telegram ? ['برای اطلاع فوری، کانال تلگرام ما را دنبال کنید.'] : []),
        ]}
        actions={[
          { label: 'تلاش مجدد', href: '/', icon: RefreshCw, variant: 'primary' },
          ...(settings.telegram
            ? [
                {
                  label: 'تلگرام پشتیبانی',
                  href: settings.telegram,
                  icon: ArrowLeft,
                  variant: 'ghost' as const,
                  external: true,
                },
              ]
            : []),
        ]}
        meta={[
          { label: 'تخمین پایان', value: 'کمتر از ۳۰ دقیقه' },
          { label: 'زمان فعلی', value: formatJalali(now) },
          { label: 'نسخه', value: '۲۰۲۶.۰۷' },
          { label: 'وضعیت', value: 'Maintenance' },
        ]}
        foot={{
          label: 'سوال فوری دارید؟',
          href: `mailto:${settings.contactEmail ?? 'support@financialmarket.page'}`,
        }}
        tone="warn"
      />
  );
}
