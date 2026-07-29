import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { HelpdeskHub } from '@/app/dashboard/helpdesk/_components/HelpdeskHub';
import { PageHeader } from '@/components/Dashboard/primitives';
import { getTicketSnapshot } from '@/lib/tickets';
import s from './helpdesk.module.css';

export const dynamic = 'force-dynamic';

export default async function HelpdeskPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/dashboard/helpdesk');
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN', 'AUTHOR'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getTicketSnapshot();
  const initialData = result.success ? result.data : undefined;

  return (
    <div dir="rtl" className={s.page}>
      <PageHeader
        eyebrow="پلتفرم"
        title="مرکز تیکت‌ها"
        description="سیستم تیکت داخلی — پشتیبانی، SLA، ارجاع، و یادداشت‌های داخلی تیم."
        icon="ticket"
        accent="indigo"
        breadcrumb={[
          { href: '/dashboard', label: 'داشبورد' },
          { label: 'تیکت‌ها' },
        ]}
      />
      <HelpdeskHub initialData={initialData} />
    </div>
  );
}
