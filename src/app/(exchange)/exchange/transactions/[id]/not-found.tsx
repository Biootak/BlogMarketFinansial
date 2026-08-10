'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function ExchangeTransactionNotFound() {
  return (
    <NotFound
      title="تراکنش یافت نشد"
      description="شناسه تراکنش نامعتبر است یا این تراکنش متعلق به صرافی شما نیست."
      primaryLink={{ href: '/exchange/transactions', label: 'بازگشت به فهرست' }}
      tone="amber"
      spotlight={false}
      showPath={false}
      variant="inline"
    />
  );
}