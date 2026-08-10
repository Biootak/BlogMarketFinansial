import type { Metadata } from 'next';
import { Forbidden } from '@/components/Dashboard/primitives';

export const metadata: Metadata = {
  title: 'دسترسی غیرمجاز | ۴۰۳',
  description: 'شما اجازهٔ دسترسی به این صفحه را ندارید.',
  robots: { index: false, follow: false },
};

export default function ForbiddenPage() {
  return (
    <Forbidden
      eyebrow="خطای دسترسی"
      title="دسترسی شما به این بخش مجاز نیست"
      description="شما اجازهٔ دسترسی به این صفحه را ندارید. ممکن است نقش حساب شما برای این بخش کافی نباشد یا دسترسی شما موقتاُ محدود شده باشد."
      suggestedLinks={[
        { href: '/dashboard', label: 'داشبورد', sub: 'پیشخوان حساب شما' },
        { href: '/dashboard/wallet', label: 'کیف پول', sub: 'موجودی و تراکنش‌ها' },
        { href: '/', label: 'صفحهٔ اصلی', sub: 'خانهٔ سایت' },
        { href: '/contact', label: 'پشتیبانی', sub: 'تماس با تیم ما' },
      ]}
      primaryLink={{ href: '/dashboard', label: 'بازگشت به داشبورد', icon: 'layoutdashboard' }}
      secondaryLinks={[
        { href: '/', label: 'صفحهٔ اصلی', icon: 'home' },
      ]}
      tone="rose"
    />
  );
}
