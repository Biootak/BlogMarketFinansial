'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function TransactionNotFound() {
  return (
    <NotFound
      title="تراکنش یافت نشد"
      description="شناسه تراکنش نامعتبر است یا این تراکنش متعلق به شما نیست."
      primaryLink={{ href: '/customer/transactions', label: 'بازگشت به فهرست' }}
      tone="emerald"
      spotlight={false}
      showPath={false}
      variant="inline"
    />
  );
}
