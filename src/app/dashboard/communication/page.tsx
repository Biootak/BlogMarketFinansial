import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { CommunicationHub } from '@/app/dashboard/communication/_components/CommunicationHub';
import { PageHeader } from '@/components/Dashboard/primitives';
import { getCommunicationSnapshot } from '@/lib/communication';
import s from './communication.module.css';

export const dynamic = 'force-dynamic';

export default async function CommunicationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/communication');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getCommunicationSnapshot();
  const initialData = result.success ? result.data : undefined;

  return (
    <div dir="rtl" className={s.page}>
      <PageHeader
        eyebrow="پلتفرم"
        title="مرکز ارتباطات"
        description="اعلان‌های درون‌برنامه‌ای، کمپین‌های ایمیلی و SMS، و پیام‌رسانی push. همه داده‌ها واقعی."
        icon="megaphone"
        accent="violet"
        breadcrumb={[
          { href: '/dashboard', label: 'داشبورد' },
          { label: 'مرکز ارتباطات' },
        ]}
      />
      <CommunicationHub initialData={initialData} />
    </div>
  );
}
