/**
 * /dashboard/2fa — Two-Factor Authentication (TOTP) Center برای حساب مالک/ادمین.
 *
 * چرا: 2FA برای OWNER/SUPERADMIN اجباری و دائمی است (فعال‌سازی در layout
 * داشبورد gate می‌شود — بدون 2FA کسی نمی‌تواند از داشبورد استفاده کند).
 * این صفحه نقطه‌ی فعال‌سازی اجباری است؛ برای همین زیر gate نیست.
 */

import TwoFactorCenter from '@/app/(customer)/customer/2fa/_components/TwoFactorCenter';
import { auth } from '@/auth';
import { PageHeader } from '@/components/Dashboard/primitives';
import prisma from '@/lib/db';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'احراز هویت دو مرحله‌ای | داشبورد',
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

export default async function Dashboard2FAPage() {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }
  const initial = await load2FAState(session.user.id);
  // سرور برای OWNER/SUPERADMIN غیرفعال‌سازی را همیشه رد می‌کند — UI هم نباید دکمه نشان دهد.
  const canDisable =
    session.user.role !== 'OWNER' && session.user.role !== 'SUPERADMIN';

  return (
    <div className="route-frame" dir="rtl">
      <PageHeader
        variant="compact"
        eyebrow="امنیت حساب"
        title="احراز هویت دو مرحله‌ای"
        description="برای حساب مالک، 2FA اجباری است. با فعال‌سازی، در هر ورود یک کد ۶ رقمی از اپلیکیشن authenticator لازم است."
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'امنیت' },
          { label: '۲ مرحله‌ای' },
        ]}
        icon="key-round"
        accent="emerald"
      />
      <TwoFactorCenter initial={initial} canDisable={canDisable} />
    </div>
  );
}
