import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getProfileData } from '@/actions/profile';
import ProfileForm from '@/components/ProfileForm';

export default async function ProfilePage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/api/auth/signin?callbackUrl=/profile');
  }

  const profileData = await getProfileData();

  if (!profileData) {
    return <div>خطا در بارگذاری اطلاعات پروفایل. لطفاً دوباره تلاش کنید.</div>;
  }

  return <ProfileForm initialData={profileData} />;
}
