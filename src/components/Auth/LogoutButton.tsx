'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoExitOutline } from 'react-icons/io5';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { getSession, signOut } from 'next-auth/react';
import { CacheService } from '@/services/cacheService';
import Loading from '../Button/Loading';

const LogoutButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // پاک کردن کش کاربر قبل از خروج
      const session = await getSession();
      if (session?.user?.id) {
        await CacheService.invalidateUserProfile(session.user.id);
      }

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
        'flex items-center w-full p-2 text-right transition duration-150 ease-in-out rounded-lg',
        'hover:bg-neutral-100 dark:hover:bg-neutral-700',
        'focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50',
      )}
    >
      {isLoading ? (
        <Loading size="sm" variant="neutral" className="ml-4" />
      ) : (
        <IoExitOutline className="w-6 h-6 ml-4 text-neutral-500 dark:text-neutral-300" />
      )}
      <span className="text-sm font-medium">{isLoading ? 'در حال خروج' : 'خروج'}</span>
    </button>
  );
};

export default LogoutButton;
