/**
 * /session-expired — Million-dollar session timeout state (2026)
 *
 * Same editorial composition as Forbidden, but with a strong focus on
 * re-authentication. Tokens-only, mobile-first, server component.
 */
import { LogIn, RefreshCw, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { StatePage } from '@/components/StatePage';

export const metadata: Metadata = {
  title: 'نشست منقضی شد | ورود مجدد',
  robots: { index: false },
};

export default function SessionExpiredPage() {
  return (
    <StatePage
      number="۴۰۱"
      eyebrow="نشست منقضی"
      title="زمان ورود شما به پایان رسیده است"
      lead="برای حفظ امنیت حساب، پس از مدتی عدم فعالیت، نشست شما به‌طور خودکار بسته شد. داده‌های شما ذخیره شده‌اند — فقط کافی است دوباره وارد شوید."
      cardTitle="چطور دوباره وارد شوم؟"
      cardBody="روی «ورود دوباره» بزنید. اگر گزینهٔ «مرا به خاطر بسپار» را فعال کنید، نشست شما تا ۳۰ روز معتبر خواهد بود."
      icon={ShieldAlert}
      helpList={[
        'دکمهٔ «ورود دوباره» را بزنید.',
        'ایمیل یا شماره تلفن خود را وارد کنید.',
        'کد ۶ رقمی ارسال‌شده را در کادر مربوطه وارد کنید.',
        'اختیاری: گزینهٔ «مرا به‌خاطر بسپار» را فعال کنید.',
      ]}
      actions={[
        { label: 'ورود دوباره', href: '/auth?step=email&intent=login', icon: LogIn, variant: 'primary' },
        { label: 'بازگشت به خانه', href: '/', icon: RefreshCw, variant: 'ghost' },
      ]}
      meta={[
        { label: 'کد', value: '۴۰۱' },
        { label: 'علت', value: 'Session Timeout' },
        { label: 'مدت نشست', value: '۳۰ روز' },
        { label: 'آخرین فعالیت', value: 'بیش از ۳۰ دقیقه پیش' },
      ]}
      foot={{
        label: 'مشکل در ورود؟',
        href: 'mailto:support@blogmarketfinansial.ir',
      }}
      tone="info"
    />
  );
}
