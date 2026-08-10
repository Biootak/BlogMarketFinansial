'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function ExchangeCustomerNotFound() {
  return (
    <NotFound
      title="مشتری یافت نشد"
      description="شناسه مشتری نامعتبر است یا این مشتری وجود ندارد."
      primaryLink={{ href: '/exchange/customers', label: 'بازگشت به فهرست' }}
      tone="amber"
      spotlight={false}
      showPath={false}
      variant="inline"
    />
  );
}
