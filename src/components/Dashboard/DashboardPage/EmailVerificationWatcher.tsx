'use client';

/**
 * EmailVerificationWatcher — وقتی وضعیت تأیید ایمیل تغییر کند
 * (false → true)، یک router.refresh() فراخوانی می‌کند تا UI به‌روز شود.
 *
 * بدون polling اضافی: فقط وقتی useSession() update شد واکنش نشان می‌دهد.
 * next-auth خودش session را ۶۰ ثانیه refetch می‌کند (sliding window).
 *
 * 2026-07-29 (R17-fix): قبلاً کاربر باید صفحه را reload می‌کرد تا
 * Badge «ایمیل تأیید نشده» به «ایمیل تأیید شده» تغییر کند. حالا
 * session listener این کار را خودکار انجام می‌دهد.
 */

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface Props {
  initialVerified: boolean;
}

export function EmailVerificationWatcher({ initialVerified }: Props) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const verifiedRef = useRef(initialVerified);

  useEffect(() => {
    const current = Boolean(session?.user?.emailVerified);
    // فقط وقتی false → true تغییر کرد (تأیید تازه)
    if (current && !verifiedRef.current) {
      verifiedRef.current = current;
      router.refresh();
    } else if (current !== verifiedRef.current) {
      verifiedRef.current = current;
    }
  }, [session?.user?.emailVerified, router]);

  // session را حداقل هر ۹۰ ثانیه به‌روز می‌کنیم — sliding-window
  useEffect(() => {
    const id = setInterval(() => {
      update().catch(() => {
        // silent — اگر session منقضی شده باشد، middleware redirect می‌کند
      });
    }, 90_000);
    return () => clearInterval(id);
  }, [update]);

  return null;
}

export default EmailVerificationWatcher;
