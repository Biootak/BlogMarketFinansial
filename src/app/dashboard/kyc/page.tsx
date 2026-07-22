import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getMyKycRecord } from '@/actions/kyc-onboarding';
import { KycOnboardingClient } from './_components/KycOnboardingClient';

export const metadata: Metadata = {
  title: 'احراز هویت (KYC) | داشبورد',
  description: 'تکمیل اطلاعات هویتی برای استفاده از خدمات مالی',
};

export default async function KycPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/signin?callbackUrl=/dashboard/kyc');
  }

  const kycRecord = await getMyKycRecord();

  return (
    <div className="at-page" dir="rtl">
      <KycOnboardingClient initialRecord={kycRecord} />
    </div>
  );
}
