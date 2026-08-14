'use client';

import { useSignOut } from '@/components/Auth/useSignOut';
import { cn } from '@/lib/utils';
import { IoExitOutline } from 'react-icons/io5';
import Loading from '../Button/Loading';

/**
 * 2026-08-14: دکمه خروج سایت — از مسیر یکپارچه `useSignOut`.
 * قبلاً `signOut` از next-auth/react صدا زده می‌شد (POST آهسته به
 * /api/auth/signout — بعضی مواقع عملاً hang می‌کرد) و بعد `router.refresh()`
 * + `router.push('/')` داشت که بعد از پاک شدن کوکی لوپ رندر می‌ساخت.
 * حالا: action سرور logout() (کوکی + invalidation کش‌ها) + toast +
 * router.replace — بدون refresh.
 */
const LogoutButton = () => {
  const { signOut, pending: isLoading } = useSignOut();

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={isLoading}
      className={cn(
        'group flex items-center gap-3 w-full p-2.5 text-right',
        'rounded-xl',
        'hover:bg-gradient-to-l hover:from-red-50/80 hover:to-red-100/50',
        'dark:hover:from-red-900/20 dark:hover:to-red-800/10',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50',
        isLoading && 'opacity-70 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center w-9 h-9',
          'rounded-xl',
          'bg-neutral-100/80 dark:bg-neutral-800/80',
          'group-hover:bg-red-100/80 dark:group-hover:bg-red-900/30',
          'transition-all duration-300',
        )}
      >
        {isLoading ? (
          <Loading size="sm" variant="neutral" />
        ) : (
          <IoExitOutline className="w-5 h-5 text-neutral-500 dark:text-neutral-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300" />
        )}
      </span>
      <span
        className={cn(
          'text-sm font-medium',
          'text-neutral-700 dark:text-neutral-200',
          'group-hover:text-red-700 dark:group-hover:text-red-300',
          'transition-colors duration-300',
        )}
      >
        {isLoading ? 'در حال خروج…' : 'خروج'}
      </span>
    </button>
  );
};

export default LogoutButton;
