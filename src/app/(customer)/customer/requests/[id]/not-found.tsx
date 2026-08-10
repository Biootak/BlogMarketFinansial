'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function RequestNotFound() {
  return (
    <NotFound
      title="درخواست یافت نشد"
      description="شناسه درخواست نامعتبر است یا این درخواست متعلق به شما نیست."
      primaryLink={{ href: '/customer/requests', label: 'بازگشت به فهرست' }}
      tone="emerald"
      spotlight={false}
      showPath={false}
      variant="inline"
    />
  );
}