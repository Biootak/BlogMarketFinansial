import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';

import ProfileForm from '@/components/ProfileForm';
import { getProfileData } from '@/actions/getProfileData';

export default async function ProfilePage() {
  const profileData = await getProfileData();

  if (!profileData) {
    return notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">پروفایل کاربری</h1>
      <ProfileForm initialData={profileData} />
    </div>
  );
}
