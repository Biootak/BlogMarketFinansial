/**
 * /kyc — احراز هویت چند مرحله‌ای (KYC Onboarding)
 */

import { getMyKycRecord } from '@/actions/kyc-onboarding';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import KycWizard from './KycWizard';

export const metadata: Metadata = {
  title: 'احراز هویت | KYC',
  description: 'تکمیل مدارک احراز هویت برای استفاده از خدمات مالی',
};

export default async function KycPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth?callbackUrl=/kyc');

  const [record, userRecord] = await Promise.all([
    getMyKycRecord(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phoneNumber: true },
    }),
  ]);

  const hasPhone = !!userRecord?.phoneNumber;

  return <KycWizard initialRecord={record} hasPhone={hasPhone} />;
}
