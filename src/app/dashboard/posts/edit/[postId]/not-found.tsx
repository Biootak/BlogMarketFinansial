'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function PostEditNotFound() {
  return (
    <NotFound
      eyebrow="پست یافت نشد"
      title="این پست پیدا نشد"
      description="پست مورد نظر ممکن است حذف شده یا شناسهٔ آن تغییر کرده باشد."
      primaryLink={{ href: '/dashboard/posts', label: 'فهرست پست‌ها', icon: 'home' }}
      tone="violet"
      showPath={false}
    />
  );
}