import { StateHero } from '@/components/Dashboard/primitives';
import { getSystemSettingsData } from '@/data/getSystemSettings';
/**
 * /maintenance — وضعیت تعمیرات (همان زبان طراحی صفحهٔ ۴۰۳).
 *
 * Used by middleware when SystemSettings.maintenanceMode is enabled.
 * Editor-friendly: admins can preview the page at any time.
 */
import type { Metadata } from 'next';

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

  const telegram = settings.telegram?.trim() ?? null;

  return (
    <StateHero
      code="MNT"
      mark="maintenance"
      tone="amber"
      eyebrow="در حال به‌روزرسانی"
      title="سایت موقتاً در دسترس نیست"
      description={leadMessage}
      showPath={false}
      helpItems={[
        'تمام داده‌ها و حساب‌های شما امن هستند.',
        'تراکنش‌های در جریان پس از پایان به‌روزرسانی ادامه می‌یابند.',
        ...(telegram ? ['برای اطلاع فوری، کانال تلگرام ما را دنبال کنید.'] : []),
      ]}
      meta={[
        { label: 'تخمین پایان', value: 'کمتر از ۳۰ دقیقه' },
        { label: 'زمان فعلی', value: formatJalali(now) },
        { label: 'نسخه', value: '۲۰۲۶.۰۷' },
        { label: 'وضعیت', value: 'Maintenance' },
      ]}
      suggestedLinks={[
        { href: '/', label: 'صفحهٔ اصلی', sub: 'بررسی دوباره پس از پایان' },
        ...(telegram
          ? [{ href: telegram, label: 'کانال تلگرام', sub: 'اطلاع‌رسانی فوری', icon: 'telegram' }]
          : []),
      ]}
      primaryLink={{ href: '/', label: 'تلاش مجدد', icon: 'refresh' }}
      secondaryLinks={
        telegram ? [{ href: telegram, label: 'تلگرام پشتیبانی', icon: 'telegram' }] : []
      }
      foot={{
        label: 'سؤال فوری دارید؟',
        href: `mailto:${settings.contactEmail ?? 'support@financialmarket.page'}`,
      }}
    />
  );
}
