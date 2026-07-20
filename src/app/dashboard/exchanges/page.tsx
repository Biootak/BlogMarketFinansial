/**
 * صفحه مدیریت صراف‌ها — فقط OWNER و ADMIN پلتفرم
 */
import { getAllExchanges } from '@/actions/exchanges';
import { PageHeader } from '@/components/Dashboard/primitives';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import ExchangesWorkspace from './_components/ExchangesWorkspace';

export const metadata: Metadata = {
  title: 'مدیریت صراف‌ها | داشبورد',
};

export default async function ExchangesPage() {
  const session = await auth();
  if (!session?.user || !['OWNER', 'ADMIN'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  const exchanges = await getAllExchanges();

  return (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ds-space-6)',
      }}
    >
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'صراف‌ها' }]}
        title="مدیریت صراف‌ها"
        description="ایجاد، تأیید و مدیریت صراف‌های عضو پلتفرم"
      />
      <ExchangesWorkspace initialExchanges={exchanges} />
    </main>
  );
}
