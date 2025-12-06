import { PostIcon, ProfileIcon, ThemeIcon } from '@/components/Icons';
import SideDropdown from '@/components/SideDropdown';
import getCurrentUser from '@/lib/current-user';
import type { Role } from '@prisma/client';
import Link from 'next/link';
import { Suspense } from 'react';
import LogoutButton from '../Auth/LogoutButton';
import Avatar from '../Avatar/Avatar';
import DarkModeSwitch from '../SwitchDarkMode/SwitchDarkMode2';

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
        <div
          className="
            overflow-hidden rounded-2xl sm:rounded-3xl
            bg-white/95 dark:bg-neutral-900/95
            backdrop-blur-xl backdrop-saturate-150
            border border-white/20 dark:border-neutral-700/50
            shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]
            dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]
            w-[280px] sm:w-[300px]
          "
        >
          <div className="relative flex flex-col p-2.5 sm:p-3">
            {/* User Info Header */}
            <div
              className="
                flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 mb-1.5 sm:mb-2
                bg-gradient-to-l from-slate-50/80 to-slate-100/50
                dark:from-neutral-800/60 dark:to-neutral-800/30
                rounded-xl sm:rounded-2xl border border-slate-100/80 dark:border-neutral-700/30
              "
            >
              <div className="relative">
                <Avatar
                  imgUrl={user?.profile?.avatar || user.image}
                  userName={user.name}
                  sizeClass="h-10 w-10 sm:h-12 sm:w-12"
                  radius="rounded-lg sm:rounded-xl"
                />
                <span className="absolute -bottom-0.5 -left-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-neutral-900" />
              </div>
              <div className="flex-grow text-right min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                  {user.name}
                </h4>
                <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            {canAccessPosts && (
              <div className="space-y-0.5 sm:space-y-1 mb-1.5 sm:mb-2">
                <MenuItem href="/dashboard/edit-profile" icon={ProfileIcon} text="پروفایل" />
                <MenuItem href="/dashboard/posts" icon={PostIcon} text="پست‌های من" />
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent my-1.5 sm:my-2" />

            {/* Dark Mode Switch */}
            <DarkModeSwitch className="px-0.5 sm:px-1" />

            {/* Divider */}
            <div className="h-px bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent my-1.5 sm:my-2" />

            {/* Logout */}
            <Suspense
              fallback={
                <div className="h-10 sm:h-11 p-2 animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-lg sm:rounded-xl" />
              }
            >
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
      className="
        group flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5
        rounded-lg sm:rounded-xl
        text-neutral-700 dark:text-neutral-200
        hover:bg-gradient-to-l hover:from-primary-50/80 hover:to-primary-100/50
        dark:hover:from-primary-900/30 dark:hover:to-primary-800/20
        hover:text-primary-700 dark:hover:text-primary-300
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
      "
    >
      <span
        className="
          flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9
          rounded-lg sm:rounded-xl
          bg-neutral-100/80 dark:bg-neutral-800/80
          group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40
          transition-all duration-150
        "
      >
        <Icon
          className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-150"
          aria-hidden="true"
        />
      </span>
      <span className="text-xs sm:text-sm font-medium">{text}</span>
    </Link>
  );
}
