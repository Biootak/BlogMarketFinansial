'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { logout } from '@/actions/auth-actions';
import { useToast } from '@/components/ui/use-toast';

/**
 * 2026-08-14: خروج یکپارچه — تنها مسیر خروج همه دکمه‌ها (هدر داشبورد،
 * سایدبار، سایت، پورتال مشتری).
 *
 * چرا این الگو؟
 *   - `router.refresh()` بعد از `signOut` (که کوکی را پاک کرده) صفحهٔ
 *     محافظت‌شدهٔ فعلی را دوباره fetch می‌کند → middleware به `/auth`
 *     ریدایرکت می‌کند → همزمان `router.push('/auth')` هم می‌رود → دو
 *     ناوبری رقابتی = «بعد از خروج هی رندر می‌شود» (لوپ رندر). اینجا
 *     فقط `router.replace('/auth')` — یک fetch تازه از صفحهٔ خروج، بدون رقابت.
 *   - `replace` نه `push`: کاربر لاگ‌اوت‌شده نباید با دکمهٔ back به داخل
 *     پورتال برگردد.
 *   - invalidation کش‌ها داخل action سرور `logout()` انجام می‌شود، نه سمت
 *     کلاینت — همه دکمه‌ها یکسان و مطمئن رفتار می‌کنند.
 */
export function useSignOut() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    try {
      const result = await logout();
      if (result.success) {
        toast({
          title: 'خروج موفق',
          description: 'شما با موفقیت از حساب کاربری خود خارج شدید.',
          variant: 'success',
        });
        router.replace(result.redirect ?? '/auth');
      } else {
        toast({
          title: 'خطا در خروج',
          description: result.error ?? 'مشکلی در خروج از حساب کاربری پیش آمد.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطای سیستمی',
        description: 'مشکلی در سیستم رخ داده است.',
        variant: 'destructive',
      });
    } finally {
      setPending(false);
    }
  };

  return { signOut, pending };
}
