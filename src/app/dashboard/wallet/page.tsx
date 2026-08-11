import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { WalletClient } from './_components/WalletClient';

export const metadata: Metadata = {
  title: 'کیف پول | داشبورد',
  description: 'موجودی و تاریخچه تراکنش‌های کیف پول شما',
};

type WalletData = {
  customerId: string;
  fullName: string;
  kycLevel: string;
  kycStatus: string;
  accounts: Array<{
    id: string;
    currency: string;
    balance: string;
    status: string;
    type: string;
  }>;
};

async function getWalletData(userId: string): Promise<WalletData | null> {
  const customer = await prisma.customer.findFirst({
    where: { userId },
    select: {
      id: true,
      fullName: true,
      kycLevel: true,
      kycStatus: true,
      FintechAccount: {
        select: { id: true, currency: true, balance: true, status: true, type: true },
        where: { status: 'ACTIVE' },
      },
    },
  });

  if (!customer) return null;

  return {
    customerId: customer.id,
    fullName: customer.fullName,
    kycLevel: customer.kycLevel,
    kycStatus: customer.kycStatus,
    accounts: customer.FintechAccount.map((a) => ({
      id: a.id,
      currency: a.currency,
      balance: a.balance.toString(),
      status: a.status,
      type: a.type,
    })),
  };
}

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth?callbackUrl=/dashboard/wallet');
  }

  // CUSTOMER/TEST_CUSTOMER/MERCHANT: پورتال اختصاصی خودشان
  const role = session.user.role as string;
  if (role === 'CUSTOMER' || role === 'TEST_CUSTOMER' || role === 'MERCHANT') {
    redirect('/customer/wallet');
  }

  const walletData = await getWalletData(session.user.id ?? '');

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'کیف پول' }]}
        title="کیف پول"
        description="موجودی و تاریخچه تراکنش‌های کیف پول شما"
        eyebrow="مالی"
        icon="wallet"
        accent="emerald"
      />
      <WalletClient walletData={walletData} userRole={role} />
    </div>
  );
}
