import type { Metadata } from 'next';
import DeveloperPortalClient from './_components/DeveloperPortalClient';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'پنل توسعه‌دهندگان',
  description: 'مدیریت کلیدهای API، وب‌هوک‌ها و مستندات فنی اتصال به پلتفرم',
};

export const dynamic = 'force-dynamic';

export default async function DeveloperPortalPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/customer/developer');
  }
  return <DeveloperPortalClient />;
}
