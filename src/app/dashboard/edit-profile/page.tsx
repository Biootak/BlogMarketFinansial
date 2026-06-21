import { notFound } from 'next/navigation';
import ProfileForm from '@/components/ProfileForm';
import { getProfileData } from '@/actions/getProfileData';
import { auth } from '@/auth';
import { User, Sparkles } from 'lucide-react';

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
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-6">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent mb-3">
            پروفایل کاربری
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            اطلاعات خود را مدیریت کنید
          </p>
        </div>

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
