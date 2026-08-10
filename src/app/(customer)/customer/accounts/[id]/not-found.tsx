'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function AccountNotFound() {
  return (
    <NotFound
      title="حساب یافت نشد"
      description="شناسه حساب نامعتبر است یا این حساب متعلق به شما نیست."
      primaryLink={{ href: '/customer/accounts', label: 'بازگشت به فهرست' }}
      tone="emerald"
      spotlight={false}
      showPath={false}
      variant="inline"
    />
  );
}