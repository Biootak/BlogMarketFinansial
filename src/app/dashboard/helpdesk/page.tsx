import { getTicketSnapshot } from '@/lib/tickets';
import { Suspense } from 'react';
import { HelpdeskHub } from './_components/HelpdeskHub';
import { HelpdeskLoading } from './_components/HelpdeskLoading';
import s from './helpdesk.module.css';

// HelpdeskHub uses useSearchParams — Suspense boundary needed.
// The outer Suspense already provides the boundary, inner Suspense for polling
// skeleton is additional. The page itself has two Suspense layers deliberately.

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
        {/* Inner Suspense for useSearchParams in HelpdeskHub */}
        <Suspense fallback={null}>
          <HelpdeskHub initialTickets={tickets} />
        </Suspense>
      </Suspense>
    </main>
  );
}
