import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SiteGuideContent } from './_components/SiteGuideContent';

export const dynamic = 'force-dynamic';

export default async function SiteGuidePage() {
  const session = await auth();
  if (!session?.user) redirect('/auth?callbackUrl=/dashboard/site-guide');
  const role = session.user.role ?? '';
  if (!['OWNER', 'SUPERADMIN', 'ADMIN'].includes(role)) redirect('/forbidden');
  return (
    <div className="route-frame">
      <SiteGuideContent userRole={role as 'OWNER' | 'SUPERADMIN' | 'ADMIN'} />
    </div>
  );
}
