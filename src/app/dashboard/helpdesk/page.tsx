import { Suspense } from 'react';
import { getTicketSnapshot } from '@/lib/tickets';
import { HelpdeskHub } from './_components/HelpdeskHub';
import { HelpdeskLoading } from './_components/HelpdeskLoading';
import s from './helpdesk.module.css';

export const revalidate = 30;
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'مرکز پشتیبانی | داشبورد',
  description: 'نمای پروازی تیکت‌ها بر اساس اولویت و وضعیت',
};

export default async function HelpdeskPage() {
  const res = await getTicketSnapshot();
  const tickets = res.success && res.data ? res.data.tickets : [];

  return (
    <main className={s.page} dir="rtl">
      <Suspense fallback={<HelpdeskLoading />}>
        <HelpdeskHub initialTickets={tickets} />
      </Suspense>
    </main>
  );
}
