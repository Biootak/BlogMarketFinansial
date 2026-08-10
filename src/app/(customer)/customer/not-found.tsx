'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function CustomerNotFound() {
  return (
    <NotFound
      eyebrow="خطای مسیریابی"
      title="این صفحه از پورتال مشتری پیدا نشد"
      description="ممکن است تراکنش/درخواست حذف شده یا شناسهٔ آن تغییر کرده باشد."
      primaryLink={{ href: '/customer/dashboard', label: 'پورتال مشتری', icon: 'userround' }}
      secondaryLinks={[
        { href: '/customer/transactions', label: 'تراکنش‌ها', icon: 'clipboardlist' },
        { href: '/customer/requests', label: 'درخواست‌ها' },
      ]}
      tone="emerald"
    />
  );
}
