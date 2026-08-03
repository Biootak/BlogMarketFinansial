import { listPendingCustomerKyc } from '@/actions/customer-portal';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { KycReviewClient } from './_components/KycReviewClient';

export const metadata: Metadata = {
  title: 'بررسی KYC | داشبورد',
};

async function getKycQueue() {
  const records = await prisma.kycRecord.findMany({
    where: { submittedAt: { not: null }, reviewedAt: null },
    include: {
      User: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
    },
    orderBy: { submittedAt: 'asc' },
    take: 50,
  });
  return records.map((r) => ({
    id: r.id,
    userId: r.userId,
    fullName: r.fullName,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    selfieUrl: r.selfieUrl,
    docFrontUrl: r.docFrontUrl,
    docBackUrl: r.docBackUrl,
    user: r.User ? { name: r.User.name, email: r.User.email, phone: r.User.phoneNumber } : null,
  }));
}

export default async function KycReviewPage() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
    redirect('/dashboard');
  }

  const [records, customerRecords] = await Promise.all([
    getKycQueue(),
    listPendingCustomerKyc({ limit: 50 }),
  ]);

  return (
    <div className="at-page" dir="rtl">
      <KycReviewClient
        records={records}
        customerRecords={customerRecords.map((c) => ({
          id: c.id,
          customerId: c.customerId,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          docType: c.docType,
          docNumber: c.docNumber,
          fileUrl: c.fileUrl,
          level: c.level,
          exchangeId: c.exchangeId,
          exchangeName: c.exchangeName,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
