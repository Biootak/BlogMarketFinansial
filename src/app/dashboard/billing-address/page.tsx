import { getBillingAddress } from '@/actions/billingAddressActions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/Dashboard/primitives';
import { BillingAddressForm } from './_components/BillingAddressForm';

export const metadata: Metadata = {
  title: 'آدرس صورتحساب | داشبورد',
};

export default async function BillingAddressPage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/billing-address');

  const result = await getBillingAddress();
  const initial = result.success ? result.data : null;

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'آدرس صورتحساب' }]}
        title="آدرس صورتحساب"
        description="مدیریت آدرس دریافت صورتحساب و فاکتورها"
        eyebrow="حساب کاربری"
        icon="map-pin"
        accent="indigo"
      />
      <BillingAddressForm initial={initial} />
    </div>
  );
}

