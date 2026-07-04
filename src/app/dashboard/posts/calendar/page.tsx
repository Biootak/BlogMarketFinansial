import { checkRole } from '@/lib/auth';
import AtelierMonthCalendar from '@/components/Dashboard/DashboardPage/atelier/tiles/AtelierMonthCalendar';
import { getScheduledPosts } from '@/actions/postActions';
import { notFound } from 'next/navigation';

export default async function DashboardPostsCalendar() {
  const session = await checkRole(['OWNER', 'ADMIN', 'AUTHOR']);
  if (!session) {
    return notFound();
  }

  const scheduled = await getScheduledPosts();
  const posts = scheduled.success && Array.isArray(scheduled.data)
    ? scheduled.data
    : [];

  return (
    <div className="at-calendar-page">
      <AtelierMonthCalendar scheduledPosts={posts} />
    </div>
  );
}
