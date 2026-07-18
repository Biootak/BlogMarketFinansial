import { type Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import MyRequestsClient from './_components/MyRequestsClient';

export const metadata: Metadata = {
  title: 'درخواست‌های من | داشبورد',
};

export default async function MyRequestsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth');
  }

  return (
    <div className="at-page" dir="rtl">
      <MyRequestsClient />
    </div>
  );
}
