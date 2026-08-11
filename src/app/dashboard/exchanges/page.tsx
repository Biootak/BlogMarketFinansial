/**
 * صفحه مدیریت صراف‌ها — فقط OWNER و ADMIN پلتفرم
 *
 * Atrium 2026 — server wrapper. The actual UI lives in `ExchangesWorkspace`
 * (client). We:
 *   1. Authenticate + role-check (server)
 *   2. Fetch the exchange list with a single Prisma call (cached)
 *   3. Hand the data off to the client orchestrator
 *   4. Render the atelier PageHeader in the emerald accent (Building2 icon)
 */
import { getAllExchanges } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ExchangesWorkspace from './_components/ExchangesWorkspace';

export const metadata: Metadata = {
  title: 'مدیریت صراف‌ها | داشبورد',
  description: 'مشاهده، تأیید و مدیریت صرافی‌های عضو پلتفرم در یک نگاه.',
};

export default async function ExchangesPage() {
  const session = await auth();
  // SUPERADMIN = OWNER alias (G8-fix) — middleware ADMIN_ROLES already
  // lets SUPERADMIN through; keep the page check in sync.
  if (!session?.user || !['OWNER', 'SUPERADMIN', 'ADMIN'].includes(session.user.role as string)) {
    redirect('/dashboard');
  }

  const exchanges = await getAllExchanges();

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'صراف‌ها' }]}
        title="مدیریت صراف‌ها"
        description="ایجاد، تأیید و مدیریت صرافی‌های عضو پلتفرم."
        eyebrow="Atrium · ۲۰۲۶"
        accent="emerald"
        icon="building"
        actions={
          <a
            href="/dashboard/exchanges?status=PENDING"
            className="at-head__more"
            style={{ textDecoration: 'none' }}
          >
            <span>{`${exchanges.filter((e) => e.status === 'PENDING').length} در انتظار تأیید`}</span>
            <span aria-hidden>←</span>
          </a>
        }
      />
      <ExchangesWorkspace initialExchanges={exchanges} />
    </div>
  );
}
