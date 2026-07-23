import { getProfileData } from '@/actions/getProfileData';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import ProfileForm from '@/components/ProfileForm';
import { notFound } from 'next/navigation';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return notFound();
  }
  const profileData = await getProfileData(session.user.id);

  if (!profileData) {
    return notFound();
  }

  return (
    <div className="at-form" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'ویرایش پروفایل' }]}
        eyebrow="حساب کاربری"
        title="ویرایش پروفایل"
        description="اطلاعات حساب، تصویر و توضیحات نمایه‌ی عمومی"
        icon="user-circle"
        accent="violet"
      />

      <div className="at-form-section">
        <ProfileForm initialData={profileData as never} />
      </div>
    </div>
  );
}
