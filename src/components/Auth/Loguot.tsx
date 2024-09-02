'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IoExitOutline } from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { logout } from '@/actions/auth-actions';
import Loading from '../Button/Loading';

const Logout = () => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logout();
        router.push('/signin');
        router.refresh();
        toast({
          title: 'خروج موفق',
          description: 'شما با موفقیت از حساب کاربری خود خارج شدید.',
          variant: 'success',
        });
      } catch (error) {
        console.error('Logout error:', error);
        toast({
          title: 'خطا',
          description: 'مشکلی در خروج از حساب رخ داد. لطفاً دوباره تلاش کنید.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isPending}
      variant="ghost"
      className={cn(
        'w-full justify-start text-right hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
        'transition-all duration-200 ease-in-out',
      )}
    >
      {isPending ? (
        <>
          <Loading />
          <span className="mr-2">در حال خروج</span>
        </>
      ) : (
        <>
          <IoExitOutline className="w-5 h-5 ml-2 text-neutral-500 dark:text-neutral-400" />
          <span>خروج</span>
        </>
      )}
    </Button>
  );
};

export default Logout;
