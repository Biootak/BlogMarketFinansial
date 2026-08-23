import { StateHero } from '@/components/Dashboard/primitives/StateHero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تأیید درخواست',
  description: 'وضعیت تأیید تراکنش یا درخواست شما.',
  robots: { index: false },
};

export default function VerifyStatusPage() {
  return (
    <StateHero
      code="VR"
      mark="vault"
      tone="emerald"
      eyebrow="تأیید درخواست"
      title="درخواست شما در حال بررسی است"
      description="درخواست شما ثبت شده و تیم بررسی در حال رسیدگی به آن است. نتیجه از طریق اعلان‌ها و ایمیل به شما اطلاع داده می‌شود."
      showPath={false}
      helpItems={[
        'معمولاً بررسی درخواست‌ها کمتر از ۲۴ ساعت زمان می‌برد.',
        'وضعیت درخواست را از بخش «درخواست‌های من» دنبال کنید.',
        'اگر سندی ناقص باشد، از طریق اعلان به شما اطلاع می‌دهیم.',
        'سؤالی دارید؟ تیم پشتیبانی همیشه پاسخ‌گوست.',
      ]}
      meta={[
        { label: 'وضعیت', value: 'در حال بررسی' },
        { label: 'زمان تقریبی', value: 'کمتر از ۲۴ ساعت' },
        { label: 'اطلاع‌رسانی', value: 'اعلان + ایمیل' },
      ]}
      suggestedLinks={[
        { href: '/dashboard/my-requests', label: 'درخواست‌های من', sub: 'پیگیری وضعیت' },
        { href: '/', label: 'صفحهٔ اصلی', sub: 'بازگشت به خانه' },
      ]}
      primaryLink={{ href: '/dashboard', label: 'بازگشت به داشبورد', icon: 'layoutdashboard' }}
      secondaryLinks={[{ href: '/', label: 'صفحهٔ اصلی', icon: 'home' }]}
    />
  );
}
