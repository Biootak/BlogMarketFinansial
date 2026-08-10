import { NotFound } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'صفحه یافت نشد | ۴۰۴',
  description: 'صفحه‌ای که دنبال آن می‌گردید وجود ندارد یا منتقل شده است.',
  robots: { index: false, follow: false },
};

export default function RootNotFound() {
  return (
    <NotFound
      eyebrow="خطای مسیریابی"
      title="این مسیر در نقشهٔ ما نیست"
      description="صفحه‌ای که دنبال آن می‌گردید وجود ندارد، منتقل شده یا شاید هرگز ساخته نشده است."
      suggestedLinks={[
        { href: '/', label: 'صفحهٔ اصلی', sub: 'تازه‌ترین گزارش‌ها و تحلیل‌ها' },
        { href: '/exchanges', label: 'صرافی‌ها', sub: 'مقایسه نرخ صرافی‌های معتبر' },
        { href: '/archive', label: 'آرشیو مقالات', sub: 'مطالب آموزشی و تحلیلی' },
        { href: '/authors', label: 'نویسندگان', sub: 'تیم تولید محتوا' },
      ]}
      primaryLink={{ href: '/', label: 'صفحهٔ اصلی', icon: 'home' }}
      secondaryLinks={[{ href: '/archive', label: 'جستجو در آرشیو', icon: 'search' }]}
      tone="violet"
    />
  );
}
