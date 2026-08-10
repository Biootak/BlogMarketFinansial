import { NotFound } from '@/components/Dashboard/primitives';

export default function SiteNotFound() {
  return (
    <NotFound
      eyebrow="مسیر گم شده"
      title="صفحه‌ای که دنبال آن می‌گردید پیدا نشد"
      description="ممکن است لینک قدیمی باشد، صفحه منتقل شده باشد، یا آدرس را اشتباه وارد کرده باشید."
      suggestedLinks={[
        { href: '/', label: 'صفحهٔ اصلی', sub: 'تازه‌ترین گزارش‌ها و تحلیل‌ها' },
        { href: '/exchanges', label: 'صرافی‌ها', sub: 'مقایسه نرخ صرافی‌های معتبر' },
        { href: '/money-transfer', label: 'حوالهٔ ارزی', sub: 'ارسال امن به افغانستان و منطقه' },
        { href: '/archive', label: 'آرشیو مقالات', sub: 'مطالب آموزشی و تحلیلی' },
      ]}
      primaryLink={{ href: '/', label: 'بازگشت به خانه', icon: 'home' }}
      secondaryLinks={[{ href: '/search', label: 'جستجو در سایت', icon: 'search' }]}
      tone="violet"
    />
  );
}
