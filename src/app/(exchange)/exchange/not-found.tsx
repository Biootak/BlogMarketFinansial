'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function ExchangeNotFound() {
  return (
    <NotFound
      eyebrow="خطای مسیریابی"
      title="این صفحه از پنل صرافی پیدا نشد"
      description="ممکن است تراکنش/مشتری حذف شده یا شناسهٔ آن تغییر کرده باشد."
      primaryLink={{ href: '/exchange/dashboard', label: 'پنل صرافی', icon: 'store' }}
      secondaryLinks={[
        { href: '/exchange/transactions', label: 'تراکنش‌ها', icon: 'clipboardlist' },
        { href: '/exchange/customers', label: 'مشتریان' },
      ]}
      tone="amber"
    />
  );
}