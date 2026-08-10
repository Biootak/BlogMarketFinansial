import { StateHero } from '@/components/Dashboard/primitives';
import { getSystemSettingsData } from '@/data/getSystemSettings';
/**
 * /session-expired — انقضای نشست (همان زبان طراحی صفحهٔ ۴۰۳).
 *
 * Same editorial composition as Forbidden, but with a strong focus on
 * re-authentication.
 */
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'نشست منقضی شد | ورود مجدد',
  robots: { index: false },
};

export default async function SessionExpiredPage() {
  const settings = await getSystemSettingsData();
  const supportEmail = settings.contactEmail ?? 'support@financialmarket.page';

  return (
    <StateHero
      code="۴۰۱"
      mark="session"
      tone="cyan"
      eyebrow="نشست منقضی"
      title="زمان ورود شما به پایان رسیده است"
      description="برای حفظ امنیت حساب، پس از مدتی عدم فعالیت، نشست شما به‌طور خودکار بسته شد. داده‌های شما ذخیره شده‌اند — فقط کافی است دوباره وارد شوید."
      showPath={false}
      helpItems={[
        'دکمهٔ «ورود دوباره» را بزنید.',
        'ایمیل یا شماره تلفن خود را وارد کنید.',
        'کد ۶ رقمی ارسال‌شده را در کادر مربوطه وارد کنید.',
        'اختیاری: گزینهٔ «مرا به‌خاطر بسپار» را فعال کنید تا نشست تا ۳۰ روز معتبر بماند.',
      ]}
      meta={[
        { label: 'کد', value: '۴۰۱' },
        { label: 'علت', value: 'Session Timeout' },
        { label: 'مدت نشست', value: '۳۰ روز' },
        { label: 'آخرین فعالیت', value: 'بیش از ۳۰ دقیقه پیش' },
      ]}
      suggestedLinks={[
        { href: '/auth?step=email&intent=login', label: 'ورود دوباره', sub: 'شروع مجدد ورود', icon: 'login' },
        { href: '/', label: 'صفحهٔ اصلی', sub: 'مرور عمومی سایت' },
      ]}
      primaryLink={{ href: '/auth?step=email&intent=login', label: 'ورود دوباره', icon: 'login' }}
      secondaryLinks={[
        { href: '/', label: 'بازگشت به خانه', icon: 'home' },
      ]}
      foot={{
        label: 'مشکل در ورود؟',
        href: `mailto:${supportEmail}`,
      }}
    />
  );
}
