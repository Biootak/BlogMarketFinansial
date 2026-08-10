'use client';

import { NotFound } from '@/components/Dashboard/primitives';

export default function DashboardNotFound() {
  return (
    <NotFound
      eyebrow="خطای مسیریابی"
      title="این صفحه پیدا نشد"
      description="شاید منتقل شده، حذف شده، یا اصلا وجود نداشته."
      primaryLink={{ href: '/dashboard', label: 'بازگشت به داشبورد', icon: 'home' }}
      secondaryLinks={[{ href: '/search', label: 'جستجو', icon: 'search' }]}
      tone="violet"
    />
  );
}
