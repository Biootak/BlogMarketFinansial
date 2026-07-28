import { auth } from '@/auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { TransferWizard } from './_components/TransferWizard';

export const metadata: Metadata = {
  title: 'انتقال وجه | داشبورد',
  description: 'انتقال P2P سریع و امن به سایر کاربران',
};

export default async function TransferPage() {
  const session = await auth();
  if (!session?.user) {
    // M1-fix: هماهنگ با middleware که از /auth استفاده می‌کند (نه /signin).
    // ناهماهنگی قبلی باعث می‌شد کاربر با نشست منقضی به /signin برود که 404 می‌زد.
    redirect('/auth?callbackUrl=/dashboard/transfer');
  }

  return (
    <div className="at-page" dir="rtl">
      <TransferWizard />
    </div>
  );
}
