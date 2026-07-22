import { getBillingAddress } from '@/actions/billingAddressActions';
import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BillingAddressForm } from './_components/BillingAddressForm';

export const metadata: Metadata = {
  title: 'آدرس صورتحساب | داشبورد',
};

export default async function BillingAddressPage() {
  const session = await auth();
  if (!session?.user) redirect('/signin?callbackUrl=/dashboard/billing-address');

  const result = await getBillingAddress();
  const initial = result.success ? result.data : null;

  return (
    <div className="at-page" dir="rtl">
      <BillingAddressForm initial={initial} />
    </div>
  );
}
