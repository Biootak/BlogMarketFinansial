import { getProfileData } from '@/actions/getProfileData';
import ProfileForm from '@/components/ProfileForm';
import { Sparkles, User } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function ProfilePage() {
  const profileData = await getProfileData();

  if (!profileData) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-gradient-to-br from-emerald-400/15 to-cyan-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4 sm:mb-5 md:mb-6">
            <User className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent mb-2 sm:mb-3">
            پروفایل کاربری
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            اطلاعات خود را مدیریت کنید
          </p>
        </div>

        {/* Main Card */}
        <div className="relative">
          {/* Card Glow Effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl sm:rounded-3xl blur-xl opacity-60" />

          {/* Card Content */}
          <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 p-4 sm:p-6 md:p-8 lg:p-10">
            <ProfileForm initialData={profileData} />
          </div>
        </div>
      </div>
    </div>
  );
}
