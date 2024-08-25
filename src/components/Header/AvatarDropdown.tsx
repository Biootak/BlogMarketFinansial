import { Suspense } from 'react';
import Link from 'next/link';
import { ProfileIcon, PostIcon } from '@/components/Icons';
import SideDropdown from '@/components/SideDropdown';
import SwitchDarkMode2 from '@/components/SwitchDarkMode/SwitchDarkMode2';
import { auth } from '@/auth';
import Logout from '../Auth/Loguot';
import Avatar from '../Avatar/Avatar';

export default async function AvatarDropdown() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return null;
  }

  return (
    <div className="AvatarDropdown">
      <Suspense fallback={<div>در حال بازگذاری</div>}>
        <SideDropdown>
          <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="relative grid grid-cols-1 gap-6 bg-white dark:bg-neutral-800 py-7 px-6">
              {/* اطلاعات کاربر */}
              <div className="flex items-center">
                <Avatar
                  imgUrl={user.image ?? undefined}
                  userName={user.name ?? undefined}
                  fontSize="text-md"
                  sizeClass="h-10 w-10"
                  radius="rounded-full"
                />
                <div className="flex-grow ms-3">
                  <h4 className="font-semibold">{user.name}</h4>
                  <p className="text-xs mt-0.5">{user.email}</p>
                </div>
              </div>
              <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />

              <Link
                href="/profile"
                className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
              >
                <ProfileIcon
                  className="flex-shrink-0 w-6 h-6 text-neutral-500 dark:text-neutral-300"
                  title="پروفایل"
                />
                <div className="ms-4">
                  <p className="text-sm font-medium">پروفایل</p>
                </div>
              </Link>

              <Link
                href="/my-posts"
                className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
              >
                <PostIcon
                  className="flex-shrink-0 w-6 h-6 text-neutral-500 dark:text-neutral-300"
                  title="پست‌های من"
                />
                <div className="ms-4">
                  <p className="text-sm font-medium">پست‌های من</p>
                </div>
              </Link>

              <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />

              <SwitchDarkMode2 />

              <Logout />
            </div>
          </div>
        </SideDropdown>
      </Suspense>
    </div>
  );
}
