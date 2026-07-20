/**
 * /dashboard/transfer-providers — مدیریت صرافی‌های جدول مقایسه نرخ
 *
 * OWNER/ADMIN می‌توانند provider های پلتفرمی را ایجاد/ویرایش کنند
 * و provider های صرافی‌ها را فعال/غیرفعال کنند.
 */

import { getTransferProviders } from '@/actions/transfer-providers';
import { auth } from '@/auth';
import { requireAdmin } from '@/lib/require-auth';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TransferProvidersWorkspace from './_components/TransferProvidersWorkspace';

export const metadata: Metadata = { title: 'مدیریت صرافی‌های مقایسه' };

export default async function TransferProvidersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const authResult = await requireAdmin();
  if (!authResult.success) redirect('/dashboard');

  const rows = await getTransferProviders();

  return <TransferProvidersWorkspace initialRows={rows} />;
}
