import ServiceRequestsClient from '@/components/Dashboard/ServiceRequests/ServiceRequestsClient';
import { requireRole } from '@/lib/require-auth';
import { Role } from '@prisma/client';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'مدیریت درخواست‌های خدمات | داشبورد',
};

export default async function ServiceRequestsPage() {
  // SUPPORT-fix: SUPPORT هم می‌تواند درخواست‌های خدمات را ببیند و پاسخ دهد
  const auth = await requireRole([Role.OWNER, Role.SUPERADMIN, Role.ADMIN, Role.SUPPORT]);
  if (!auth.success) redirect('/dashboard');

  return (
    <div className="at-page" dir="rtl">
      <ServiceRequestsClient />
    </div>
  );
}
