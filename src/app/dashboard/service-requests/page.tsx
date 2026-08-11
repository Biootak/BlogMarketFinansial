import ServiceRequestsClient from '@/components/Dashboard/ServiceRequests/ServiceRequestsClient';
import { requireRole } from '@/lib/require-auth';
import { Role } from '@prisma/client';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';

export const metadata: Metadata = {
  title: 'مدیریت درخواست‌های خدمات | داشبورد',
};

export default async function ServiceRequestsPage() {
  // SUPPORT-fix: SUPPORT هم می‌تواند درخواست‌های خدمات را ببیند و پاسخ دهد
  const auth = await requireRole([Role.OWNER, Role.SUPERADMIN, Role.ADMIN, Role.SUPPORT]);
  if (!auth.success) redirect('/dashboard');

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'درخواست‌های خدمات' }]}
        title="درخواست‌های خدمات"
        description="مدیریت و پیگیری درخواست‌های خدمات کاربران"
        eyebrow="پشتیبانی"
        icon="ticket"
        accent="cyan"
      />
      <ServiceRequestsClient />
    </div>
  );
}

