/**
 * /exchange/kyc-review — Vault Command Center (Exchange Edition)
 *
 * بررسی KYC مشتریان صرافی — پنل صراف
 *
 * دسترسی: OWNER / MANAGER / STAFF صرافی (VIEWER فقط مشاهدهٔ صف).
 */

import { listPendingCustomerKyc } from '@/actions/customer-portal';
import { getExchangeForUser } from '@/actions/exchanges';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { Metadata } from 'next/types';
import { redirect } from 'next/navigation';
import { ExchangeKycReviewClient } from './_components/ExchangeKycReviewClient';

export const metadata: Metadata = { title: 'مرکز بررسی احراز هویت | پنل صرافی' };

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExchangeKycReviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/exchange/kyc-review');

  const membership = await getExchangeForUser();
  if (!membership) redirect('/dashboard');

  const canWrite = membership.staffRole !== 'VIEWER';

  const records = await listPendingCustomerKyc({ limit: 100 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-5)' }}>
      <PageHeader
        variant="compact"
        title="مرکز بررسی احراز هویت"
        description={`پنل ${membership.exchange.name ?? 'صرافی'} — تأیید یا رد مدارک مشتریان`}
        breadcrumb={[
          { label: 'پنل صرافی', href: '/exchange/dashboard' },
          { label: 'بررسی KYC' },
        ]}
        eyebrow="احراز هویت"
        icon="shield-check"
        accent="emerald"
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
      />
    </div>
  );
}