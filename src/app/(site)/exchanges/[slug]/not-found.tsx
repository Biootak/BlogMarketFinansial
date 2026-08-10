import { NotFound } from '@/components/Dashboard/primitives';

export default function ExchangeSlugNotFound() {
  return (
    <NotFound
      eyebrow="صرافی یافت نشد"
      title="این صرافی پیدا نشد"
      description="صرافی مورد نظر ممکن است حذف شده یا آدرس آن تغییر کرده باشد."
      primaryLink={{ href: '/exchanges', label: 'فهرست صرافی‌ها', icon: 'search' }}
      secondaryLinks={[
        { href: '/', label: 'صفحهٔ اصلی', icon: 'home' },
      ]}
      tone="violet"
    />
  );
}