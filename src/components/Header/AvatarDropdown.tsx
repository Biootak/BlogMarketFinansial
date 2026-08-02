'use client';

import { PostIcon, ProfileIcon } from '@/components/Icons';
import SideDropdown from '@/components/SideDropdown';
import type { Role } from '@prisma/client';
import Link from 'next/link';
import { Suspense } from 'react';
import { HiOutlineHome, HiOutlineShieldCheck, HiOutlineUserCircle } from 'react-icons/hi2';
import LogoutButton from '../Auth/LogoutButton';
import Avatar from '../Avatar/Avatar';
import DarkModeSwitch from '../SwitchDarkMode/SwitchDarkMode2';

// 2026-07-29: هر نقش اکنون مسیر ورود صحیح خود را در منو می‌بیند.
// قبلاً فقط ADMIN/AUTHOR/OWNER لینک پروفایل/پست‌ها داشتند — CUSTOMER،
// MERCHANT، EXCHANGE و SUPPORT هیچ لینکی به پورتالشان نداشتند و فقط
// Dark Mode + Logout می‌دیدند. این اصلاح، مسیر پیش‌فرض هر نقش را
// اضافه می‌کند تا کاربر هرگز «از سایت به پورتالش» گم نشود.
const PORTAL_HOMES: Record<string, { label: string; href: string } | null> = {
  OWNER: { label: 'داشبورد مدیریت', href: '/dashboard' },
  SUPERADMIN: { label: 'داشبورد مدیریت', href: '/dashboard' },
  ADMIN: { label: 'داشبورد مدیریت', href: '/dashboard' },
  AUTHOR: { label: 'داشبورد', href: '/dashboard' },
  SUPPORT: { label: 'داشبورد پشتیبانی', href: '/dashboard' },
  USER: { label: 'درخواست‌های من', href: '/dashboard/my-requests' },
  CUSTOMER: { label: 'پورتال مشتری', href: '/customer/dashboard' },
  TEST_CUSTOMER: { label: 'پورتال مشتری', href: '/customer/dashboard' },
  MERCHANT: { label: 'پورتال پذیرنده', href: '/customer/dashboard' },
  EXCHANGE: { label: 'پنل صرافی', href: '/exchange/dashboard' },
};

const isAdminOrAuthor = (userRole: Role | undefined) => {
  return userRole === 'ADMIN' || userRole === 'AUTHOR' || userRole === 'OWNER';
};

interface AvatarDropdownProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: Role;
    profile?: { avatar?: string | null } | null;
  };
}

/**
 * Client component — receives the session `user` from `AuthStatus`
 * (`useSession`). Previously it was a server component reading
 * `getCurrentUser()` (`auth()`), which pulled the entire `@auth/core`
 * server runtime (bcrypt, prisma, @upstash) into the client bundle because
 * it was rendered inside a client component. The session is already
 * available client-side, so there is no need for a server read here.
 */
export default function AvatarDropdown({ user }: AvatarDropdownProps) {
  if (!user?.name) {
    return null;
  }

  const canAccessPosts = isAdminOrAuthor(user.role);
  const portal = PORTAL_HOMES[(user.role as string | undefined) ?? ''] ?? null;
  const isCustomerRole =
    user.role === 'CUSTOMER' || user.role === 'TEST_CUSTOMER' || user.role === 'MERCHANT';

  return (
    <div className="AvatarDropdown">
      <SideDropdown>
        <div
          className="
            overflow-hidden rounded-3xl
            bg-white/95 dark:bg-neutral-900/95
            backdrop-blur-xl backdrop-saturate-150
            border border-white/20 dark:border-neutral-700/50
            shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]
            dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]
          "
        >
          <div className="relative flex flex-col p-3">
            {/* User Info Header */}
            <div
              className="
                flex items-center gap-3 p-3 mb-2
                bg-gradient-to-l from-slate-50/80 to-slate-100/50
                dark:from-neutral-800/60 dark:to-neutral-800/30
                rounded-2xl border border-slate-100/80 dark:border-neutral-700/30
              "
            >
              <div className="relative">
                <Avatar
                  imgUrl={user.profile?.avatar ?? user.image ?? null}
                  userName={user.name}
                  sizeClass="h-12 w-12"
                  radius="rounded-xl"
                />
                <span className="absolute -bottom-0.5 -end-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-neutral-900" />
              </div>
              <div className="flex-grow text-right min-w-0">
                <h4 className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
                  {user.name}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Portal Home — برای همهٔ نقش‌ها، مسیر پیش‌فرض پورتال‌شان */}
            {portal && (
              <div className="space-y-1 mb-2">
                <MenuItem href={portal.href} icon={HiOutlineHome} text={portal.label} />
              </div>
            )}

            {/* Menu Items for content creators */}
            {canAccessPosts && (
              <div className="space-y-1 mb-2">
                <MenuItem href="/dashboard/edit-profile" icon={ProfileIcon} text="پروفایل" />
                <MenuItem href="/dashboard/posts" icon={PostIcon} text="پست‌های من" />
              </div>
            )}

            {/* Customer Portal — quick links */}
            {isCustomerRole && (
              <div className="space-y-1 mb-2">
                <MenuItem href="/customer/profile" icon={HiOutlineUserCircle} text="پروفایل من" />
                <MenuItem href="/customer/accounts" icon={ProfileIcon} text="حساب‌ها" />
                <MenuItem href="/customer/transactions" icon={PostIcon} text="تراکنش‌ها" />
                <MenuItem href="/customer/security" icon={HiOutlineShieldCheck} text="مرکز امنیت" />
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent my-2" />

            {/* Dark Mode Switch */}
            <DarkModeSwitch className="px-1" />

            {/* Divider */}
            <div className="h-px bg-gradient-to-l from-transparent via-neutral-200 dark:via-neutral-700 to-transparent my-2" />

            {/* Logout */}
            <Suspense
              fallback={
                <div className="h-11 p-2 animate-pulse bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
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
}: {
  href: string;
  icon: React.ElementType;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="
        group flex items-center gap-3 p-2.5
        rounded-xl
        text-neutral-700 dark:text-neutral-200
        hover:bg-gradient-to-l hover:from-primary-50/80 hover:to-primary-100/50
        dark:hover:from-primary-900/30 dark:hover:to-primary-800/20
        hover:text-primary-700 dark:hover:text-primary-300
        transition-all duration-300 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50
      "
    >
      <span
        className="
          flex items-center justify-center w-9 h-9
          rounded-xl
          bg-neutral-100/80 dark:bg-neutral-800/80
          group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40
          transition-all duration-300
        "
      >
        <Icon
          className="w-5 h-5 text-neutral-500 dark:text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-300"
          aria-hidden="true"
        />
      </span>
      <span className="text-sm font-medium">{text}</span>
    </Link>
  );
}
