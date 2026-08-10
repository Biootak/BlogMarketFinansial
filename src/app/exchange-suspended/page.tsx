/**
 * /exchange-suspended — تعلیق صرافی (همان زبان طراحی صفحهٔ ۴۰۳).
 *
 * جایگزین نسخهٔ قبلی که layout اختصاصی + CSS جدا داشت — حالا از StateHero
 * (همان طراحی premium صفحهٔ ۴۰۳) با نماد هشدار و شناسهٔ پیگیری استفاده می‌کند.
 */

import { StateHero } from '@/components/Dashboard/primitives';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'دسترسی معلق | صرافی',
  robots: { index: false },
};

function formatJalali(d: Date) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default async function ExchangeSuspendedPage() {
  const settings = await getSystemSettingsData();
  const supportPhone = settings.contactPhone?.trim() || null;
  const supportEmail = settings.contactEmail ?? 'support@financialmarket.page';
  const now = new Date();

  return (
    <StateHero
      code="SUS"
      mark="suspended"
      tone="rose"
      eyebrow="صرافی تعلیق‌شده"
      title="دسترسی پنل صرافی شما موقتاً مسدود است"
      description="به‌منظور رعایت مقررات و حفاظت از کاربران، فعالیت صرافی شما روی پلتفرم به حالت تعلیق درآمده است. برای رفع انسداد، مراحل زیر را دنبال کنید."
      showPath={false}
      helpItems={[
        'تأییدیه‌های هویتی و اسناد رسمی صرافی را مرور کنید.',
        'هرگونه مغایرت گزارش‌شده از طرف تیم رعایت را برطرف کنید.',
        'پس از تأیید، دسترسی پنل به‌طور خودکار فعال خواهد شد.',
      ]}
      meta={[
        { label: 'تاریخ تعلیق', value: formatJalali(now) },
        { label: 'ساعت', value: formatTime(now) },
        { label: 'شناسه پیگیری', value: `SUS-${now.getTime().toString(36).toUpperCase().slice(-8)}` },
        { label: 'اولویت بررسی', value: 'بالا' },
      ]}
      suggestedLinks={[
        { href: '/', label: 'صفحهٔ اصلی', sub: 'مرور عمومی سایت', icon: 'home' },
        ...(supportPhone
          ? [{ href: `tel:${supportPhone}`, label: 'تماس با پشتیبانی', sub: 'پاسخگویی سریع', icon: 'phone' }]
          : []),
      ]}
      // 2026-07-31: لینک اصلی باید به / (صفحه اصلی) برود، نه /dashboard.
      // کاربر EXCHANGE با صرافی suspended از طریق middleware از /dashboard
      // به /exchange/dashboard و سپس دوباره به /exchange-suspended هدایت می‌شد
      // (redirect loop). با / کاربر به صفحه اصلی عمومی می‌رود و از حلقه خارج می‌شود.
      primaryLink={{ href: '/', label: 'بازگشت به صفحه اصلی', icon: 'home' }}
      secondaryLinks={
        supportPhone
          ? [{ href: `tel:${supportPhone}`, label: 'تماس با پشتیبانی', icon: 'phone' }]
          : []
      }
      foot={{
        label: 'نیاز به کمک بیشتر؟',
        href: `mailto:${supportEmail}`,
      }}
    />
  );
}
