import { auth } from '@/auth';
import { getAnnouncementById } from '@/lib/communication';
import { notFound, redirect } from 'next/navigation';
import { EditAnnouncementForm } from './_components/EditAnnouncementForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ویرایش اعلان | داشبورد',
};

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth?callbackUrl=/dashboard/communication/announcements/${id}/edit`);
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getAnnouncementById(id);
  if (!result.success || !result.data) {
    notFound();
  }
  return <EditAnnouncementForm announcement={result.data} />;
}
