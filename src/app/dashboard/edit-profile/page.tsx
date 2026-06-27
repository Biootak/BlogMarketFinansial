import { notFound } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';
import { getProfileData } from '@/actions/getProfileData';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';

export default async function ProfilePage() {
  // 2026-06-14: getProfileData is now an unstable_cache wrapper that
  // takes a userId, so we have to resolve the session here. The
  // per-user cache key still gives us the same dedup benefit
  // across re-renders of the dashboard.
  const session = await auth();
  if (!session?.user?.id) {
    return notFound();
  }
  const profileData = await getProfileData(session.user.id);

  if (!profileData) {
    return notFound();
  }

  return (
    <div className="min-h-screen">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-gradient-to-br from-emerald-400/15 to-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container max-w-2xl mx-auto px-4 py-12">
        <PageHeader
          breadcrumb={[
            { label: 'داشبورد', href: '/dashboard' },
            { label: 'ویرایش پروفایل' },
          ]}
          title="ویرایش پروفایل"
          className="mb-10"
        />

        {/* Main Card */}
        <div className="relative">
          {/* Card Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-60" />
          
          {/* Card Content */}
          <div className="dash-panel relative p-8 md:p-10">
            <ProfileForm initialData={profileData as never} />
          </div>
        </div>
      </div>
    </div>
  );
}
