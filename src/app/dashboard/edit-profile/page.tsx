import { getProfileData } from '@/actions/getProfileData';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import ProfileForm from '@/components/ProfileForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { notFound } from 'next/navigation';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return notFound();
  }
  const profileData = await getProfileData(session.user.id);

  if (!profileData) {
    return notFound();
  }

  // ورود با «2fa=required» یعنی حساب مالک هنوز 2FA ندارد — بنر اجباری نمایش بده.
  // (فقط پس از ورود از loginWithPassword ست می‌شود؛ کاربر عادی با دست‌کاری
  // URL چیزی بیش از یک بنر نمی‌بیند.)
  const params = await searchParams;
  const twoFactorRequired = params['2fa'] === 'required';

  return (
    <div className="at-form" dir="rtl">
      <PageHeader
        variant="strip"
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'ویرایش پروفایل' }]}
        eyebrow="حساب کاربری"
        title="ویرایش پروفایل"
        description="اطلاعات حساب، تصویر و توضیحات نمایه‌ی عمومی"
        icon="user-circle"
        accent="violet"
      />

      {twoFactorRequired ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>احراز هویت دو مرحله‌ای (2FA) برای حساب مالک اجباری است</AlertTitle>
          <AlertDescription>
            برای محافظت از حساب مالک در برابر هک، باید همین حالا 2FA را از بخش «امنیت» فعال کنید.
            بدون فعال‌سازی آن، در ورودهای بعدی اجازه‌ی ورود داده نمی‌شود.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="at-form-section">
        <ProfileForm initialData={profileData as never} />
      </div>
    </div>
  );
}
