import { StatePage } from '@/components/StatePage';
import { getSystemSettingsData } from '@/data/getSystemSettings';
/**
 * /forbidden — 403 page (میلیون دلاری — ۲۰۲۶)
 *
 * Asymmetric editorial composition. Number, eyebrow, lead, meta grid
 * on the left; focal action card with help list and CTAs on the right.
 * Server Component, tokens-only, mobile-first.
 */
import { Home, LogIn, ShieldOff } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'دسترسی غیرمجاز | ۴۰۳',
  robots: { index: false },
};

export default async function ForbiddenPage() {
  const settings = await getSystemSettingsData();
  const supportEmail = settings.contactEmail ?? 'support@financialmarket.page';

  return (
    <StatePage
      number="403"
      eyebrow="دسترسی محدود"
      title="به این بخش دسترسی ندارید"
      lead="حساب شما اجازهٔ ورود به این صفحه را ندارد. اگر فکر می‌کنید این یک اشتباه است، با تیم پشتیبانی تماس بگیرید یا دوباره وارد شوید."
      cardTitle="چه کار کنم؟"
      cardBody="اگر مالک حساب هستید، احتمالاً نشست شما منقضی شده یا نقش شما تغییر کرده است. در غیر این صورت، این صفحه فقط برای کاربران ویژه قابل مشاهده است."
      icon={ShieldOff}
      helpList={[
        'از حساب کاربری خود خارج و دوباره وارد شوید.',
        'نقش حساب خود را در «تنظیمات > حساب کاربری» بررسی کنید.',
        'اگر مالک سایت هستید، با پشتیبانی تماس بگیرید.',
      ]}
      actions={[
        { label: 'ورود دوباره', href: '/auth', icon: LogIn, variant: 'primary' },
        { label: 'بازگشت به خانه', href: '/', icon: Home, variant: 'ghost' },
      ]}
      meta={[
        { label: 'کد خطا', value: '۴۰۳' },
        { label: 'دسته‌بندی', value: 'Authentication' },
        { label: 'اولویت', value: 'متوسط' },
        { label: 'شناسه', value: 'AUTH-DENIED' },
      ]}
      foot={{
        label: 'نیاز به کمک دارید؟',
        href: `mailto:${supportEmail}`,
      }}
      tone="warn"
    />
  );
}
