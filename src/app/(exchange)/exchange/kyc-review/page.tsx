/**
 * /exchange/kyc-review — بررسی KYC مشتریان صرافی (پنل صراف)
 *
 * FIX (2026-08-01): صراف تا قبل از این صفحه نمی‌توانست KYC مشتریان خودش را
 * بررسی کند — فقط ادمین پلتفرم (/dashboard/kyc-review) دسترسی داشت و صراف
 * (EXCHANGE role) از /dashboard بلاک بود → گردش کار «مشتری ارسال KYC → صراف
 * تأیید» می‌ماند. این صفحه صف KYC خود صرافی را با tenant isolation نشان می‌دهد.
 *
 * دسترسی: OWNER / MANAGER / STAFF صرافی (VIEWER فقط مشاهدهٔ صف).
 */

import { listPendingCustomerKyc } from '@/actions/customer-portal';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ExchangeKycReviewClient } from './_components/ExchangeKycReviewClient';

export const metadata: Metadata = { title: 'بررسی KYC | پنل صرافی' };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExchangeKycReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/kyc-review');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const canWrite = membership.staffRole !== 'VIEWER';

  // listPendingCustomerKyc برای صراف، exchangeId را از getExchangeForUser()
  // resolve می‌کند (tenant-correct) — فقط records صرافی خودش برمی‌گردد.
  const records = await listPendingCustomerKyc({ limit: 100 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        title="بررسی احراز هویت"
        description="صف KYC مشتریان صرافی شما — تأیید یا رد با یک کلیک"
        breadcrumb={[{ label: 'پنل صرافی', href: '/exchange/dashboard' }, { label: 'بررسی KYC' }]}
        accent="emerald"
        icon="shield-check"
      />
      <ExchangeKycReviewClient
        records={records.map((r) => ({
          id: r.id,
          customerId: r.customerId,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          docType: r.docType,
          docNumber: r.docNumber,
          fileUrl: r.fileUrl,
          level: r.level,
          createdAt: r.createdAt.toISOString(),
        }))}
        canWrite={canWrite}
        exchangeName={membership.exchange.name ?? 'صرافی'}
      />
    </div>
  );
}
