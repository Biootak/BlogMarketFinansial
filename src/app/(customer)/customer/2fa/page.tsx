/**
 * /customer/2fa — Two-Factor Authentication (TOTP) Center
 *
 * Customer Portal: فعال‌سازی، غیرفعال‌سازی، بازیابی کدهای پشتیبان.
 *
 * نکتهٔ امنیتی: این صفحه فقط برای CUSTOMER/TEST_CUSTOMER/MERCHANT (و platform
 * admins برای پشتیبانی). در production باید rate-limit روی اقدام setup/verify
 * اعمال شود.
 */

import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import { requireCustomerAccess } from '@/lib/customer-auth';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TwoFactorCenter from './_components/TwoFactorCenter';

export const metadata: Metadata = {
  title: 'احراز هویت دو مرحله‌ای | پنل مشتری',
  description: 'فعال‌سازی و مدیریت 2FA با اپلیکیشن authenticator',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Initial2FA = {
  enabled: boolean;
  hasBackupCodes: boolean;
  verifiedAt: string | null;
  lastUsedAt: string | null;
  channel: 'TOTP' | null;
};

async function load2FAState(userId: string): Promise<Initial2FA> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      TwoFactorBackupCode: { select: { id: true }, take: 1 },
    },
  });
  if (!user) {
    return {
      enabled: false,
      hasBackupCodes: false,
      verifiedAt: null,
      lastUsedAt: null,
      channel: null,
    };
  }
  return {
    enabled: user.twoFactorEnabled,
    hasBackupCodes: user.TwoFactorBackupCode.length > 0,
    verifiedAt: null,
    lastUsedAt: null,
    channel: user.twoFactorEnabled ? 'TOTP' : null,
  };
}

export default async function Customer2FAPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth?callbackUrl=/customer/2fa');
  }
  // اطمینان از اینکه کاربر واقعاً Customer Portal دارد (و platform admin نیست که ناخواسته وارد شده)
  const access = await requireCustomerAccess();
  if (!access.ok) {
    redirect('/dashboard');
  }

  const initial = await load2FAState(session.user.id);

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ds-space-6)' }}>
      <PageHeader
        eyebrow="امنیت"
        title="احراز هویت دو مرحله‌ای"
        description="یک لایهٔ امنیتی اضافی برای حساب شما. با هر ورود، یک کد ۶ رقمی از اپلیکیشن authenticator لازم است."
        breadcrumb={[
          { href: '/customer/dashboard', label: 'پنل مشتری' },
          { label: 'امنیت' },
          { label: '۲ مرحله‌ای' },
        ]}
        icon="key-round"
        accent="emerald"
      />
      <TwoFactorCenter initial={initial} />
    </div>
  );
}
