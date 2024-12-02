import { Suspense } from 'react';
import Link from 'next/link';
import { ProfileIcon, PostIcon, ThemeIcon } from '@/components/Icons';
import SideDropdown from '@/components/SideDropdown';
import Avatar from '../Avatar/Avatar';
import getCurrentUser from '@/lib/current-user';
import LogoutButton from '../Auth/LogoutButton';
import DarkModeSwitch from '../SwitchDarkMode/SwitchDarkMode2';
import type { Role } from '@prisma/client';

// Helper function to check if user is admin or author
const isAdminOrAuthor = (userRole: Role | undefined) => {
  return userRole === 'ADMIN' || userRole === 'AUTHOR' || userRole === 'SUPER_ADMIN';
};

export default async function AvatarDropdown() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const canAccessPosts = isAdminOrAuthor(user.role);

  return (
    <div className="AvatarDropdown">
      <SideDropdown>
        <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="relative flex flex-col bg-white dark:bg-neutral-800 p-2">
            {/* User Info */}
            <div className="flex items-center p-2 mb-2 border-b border-neutral-200 dark:border-neutral-700">
              <Avatar
                imgUrl={user?.profile?.avatar || user.image}
                userName={user.name}
                sizeClass="h-10 w-10"
                radius="rounded-full"
              />
              <div className="flex-grow mr-3 text-right">
                <h4 className="font-semibold text-sm">{user.name}</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
              </div>
            </div>
            {canAccessPosts && (
              <>
                <MenuItem href={'/dashboard/edit-profile'} icon={ProfileIcon} text="پروفایل" />

                <MenuItem href="/dashboard/posts" icon={PostIcon} text="پست‌های من" />
              </>
            )}

            <div className="w-full my-2 border-t border-neutral-200 dark:border-neutral-700" />

            <DarkModeSwitch className="px-2" />

            <Suspense fallback={<div className="h-10 p-2" />}>
              <LogoutButton />
            </Suspense>
          </div>
        </div>
      </SideDropdown>
    </div>
  );
}

function MenuItem({
  href,
  icon: Icon,
  text,
}: { href: string; icon: React.ElementType; text: string }) {
  return (
    <Link
      href={href}
      className="flex items-center p-2 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
    >
      <Icon
        className="flex-shrink-0 w-6 h-6 text-neutral-500 dark:text-neutral-300 ml-4"
        aria-hidden="true"
      />
      <span className="text-sm font-medium">{text}</span>
    </Link>
  );
}
