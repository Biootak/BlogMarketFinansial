import { auth } from '@/auth';
import { getAnnouncementById } from '@/lib/communication';
import { notFound, redirect } from 'next/navigation';
import { AnnouncementDetail } from './_components/AnnouncementDetail';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'جزئیات اعلان | داشبورد',
};

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth?callbackUrl=/dashboard/communication/announcements/${id}`);
  }
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) {
    redirect('/dashboard?error=forbidden');
  }

  const result = await getAnnouncementById(id);
  if (!result.success || !result.data) {
    notFound();
  }
  const a = result.data;
  return (
    <AnnouncementDetail
      id={a.id}
      title={a.title}
      body={a.body}
      status={a.status}
      channels={a.channels}
      audience={a.audience}
      audienceFilter={a.audienceFilter}
      scheduledAt={a.scheduledAt}
      publishedAt={a.publishedAt}
      expiresAt={a.expiresAt}
      createdAt={a.createdAt}
      updatedAt={a.updatedAt}
    />
  );
}
