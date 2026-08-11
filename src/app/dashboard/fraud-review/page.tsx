import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { FraudReviewClient } from './_components/FraudReviewClient';

export const metadata: Metadata = {
  title: 'صف بررسی تقلب | داشبورد',
};

async function getFraudQueue() {
  const reviews = await prisma.fraudReview.findMany({
    where: { status: 'OPEN' },
    include: {
      Customer: { select: { fullName: true, phone: true } },
      Exchange: { select: { name: true, displayName: true } },
    },
    orderBy: { riskScore: 'desc' },
    take: 50,
  });
  return reviews.map((r) => ({
    id: r.id,
    exchangeId: r.exchangeId,
    exchangeName: r.Exchange.displayName ?? r.Exchange.name,
    customerId: r.customerId,
    customerName: r.Customer?.fullName ?? null,
    customerPhone: r.Customer?.phone ?? null,
    txnId: r.txnId,
    reason: r.reason,
    riskScore: r.riskScore,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

export default async function FraudReviewPage() {
  const session = await auth();
  if (!session?.user || !['ADMIN', 'OWNER', 'SUPERADMIN'].includes(session.user.role ?? '')) {
    redirect('/dashboard');
  }

  const reviews = await getFraudQueue();

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'بررسی تقلب' }]}
        title="صف بررسی تقلب"
        description="بررسی و تصمیم‌گیری روی تراکنش‌های مشکوک"
        eyebrow="امنیت"
        icon="alert-triangle"
        accent="rose"
      />
      <FraudReviewClient reviews={reviews} />
    </div>
  );
}
