'use client';

import Avatar from '@/components/Avatar/Avatar';
import { logout } from '@/actions/auth-actions';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

interface UserPanelCardProps {
  userName: string;
  userEmail?: string;
  userImage?: string | null;
  userSub?: string;
  isCollapsed?: boolean;
  className?: string;
}

export function UserPanelCard({
  userName,
  userEmail,
  userImage,
  userSub,
  isCollapsed = false,
  className,
}: UserPanelCardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        toast({
          title: 'خروج موفق',
          description: 'شما با موفقیت از حساب کاربری خود خارج شدید.',
          variant: 'success',
        });
        router.push('/auth');
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'مشکلی در خروج از حساب رخ داد.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className={cn('flex items-center gap-3 p-4 border-t border-neutral-200/60 dark:border-neutral-700/50', className)}>
      <div className="relative shrink-0">
        <Avatar
          imgUrl={userImage}
          userName={userName}
          sizeClass="h-9 w-9"
        />
      </div>
      
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {userName}
          </p>
          {(userSub || userEmail) && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              {userSub || userEmail}
            </p>
          )}
        </div>
      )}

      {!isCollapsed && (
        <button
          type="button"
          onClick={handleLogout}
          className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 dark:hover:bg-red-900/20 transition-all duration-200 text-neutral-500"
          title="خروج"
        >
          <LogOut className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
