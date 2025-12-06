'use client';

import {
  invalidateDashboardCache,
  invalidatePublicCache,
  invalidateUserCache,
} from '@/actions/cacheActions';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { getSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { IoExitOutline } from 'react-icons/io5';
import Loading from '../Button/Loading';

const LogoutButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const session = await getSession();

      await Promise.all([
        session?.user?.id ? invalidateUserCache(session.user.id) : Promise.resolve(),
        invalidatePublicCache(),
        invalidateDashboardCache(),
      ]);

      await signOut({ redirect: true, callbackUrl: '/' });
      toast({
        title: 'موفقیت',
        description: 'شما با موفقیت خارج شدید',
        variant: 'success',
      });
    } catch (error) {
      console.error('خطا در خروج:', error);
      toast({
        title: 'خطا',
        description: 'مشکلی در خروج رخ داد. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
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
        {isLoading ? 'در حال خروج...' : 'خروج'}
      </span>
    </button>
  );
};

export default LogoutButton;
