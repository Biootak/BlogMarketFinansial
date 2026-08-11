/**
 * /2fa-setup — Two-Factor Authentication (TOTP) Center برای حساب مالک/ادمین.
 *
 * چرا: 2FA برای OWNER/SUPERADMIN اجباری و دائمی است — gate در layout های
 * داشبورد (admin/exchange) بدون 2FA اجازهٔ ورود نمی‌دهد و به این صفحه هدایت
 * می‌کند. این صفحه عمداً OUTSIDE درخت /dashboard است تا تحت gate قرار
 * نگیرد (loop نشود)؛ به همین دلیل design system داشبورد را خودش بارگذاری
 * می‌کند (layout.tsx همین پوشه) تا ظاهر «میلیون‌دلاری» حفظ شود.
 */

import TwoFactorCenter from '@/app/(customer)/customer/2fa/_components/TwoFactorCenter';
import { auth } from '@/auth';
import { PageHeader, Spotlight } from '@/components/Dashboard/primitives';
import prisma from '@/lib/db';
import { Role } from '@prisma/client';
import { ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import s from './2fa-setup.module.css';

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

/** برچسب نقش برای متون صفحه — مالک یا سوپرادمین. */
function roleLabel(role: string | undefined): string {
  if (role === Role.OWNER) return 'مالک';
  if (role === Role.SUPERADMIN) return 'سوپرادمین';
  return 'مدیر';
}

export default async function Dashboard2FAPage() {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }
  const initial = await load2FAState(session.user.id);
  const label = roleLabel(session.user.role);

  return (
    <div className={s.page} dir="rtl">
      {/* depth — اورب‌های گرادیانی شناور */}
      <span className={`${s.orb} ${s.orbA}`} aria-hidden />
      <span className={`${s.orb} ${s.orbB}`} aria-hidden />
      <span className={`${s.orb} ${s.orbC}`} aria-hidden />

      <div className={s.frame}>
        <PageHeader
          variant="strip"
          eyebrow={`امنیت حساب ${label}`}
          title="احراز هویت دو مرحله‌ای (2FA)"
          description={`برای حساب ${label}، 2FA اجباری است. با فعال‌سازی، در هر ورود یک کد ۶ رقمی از اپلیکیشن authenticator لازم است.`}
          breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: '۲ مرحله‌ای' }]}
          icon="key-round"
          accent="emerald"
        />

        <section className={s.panel}>
          {/* نور تعقیب‌کنندهٔ نشانگر — الگوی Vercel/Linear */}
          <Spotlight tone="accent" />
          <div className={s.panelHead}>
            <span className={s.seal} aria-hidden>
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2 className={s.sealTitle}>درگاه امنیتی {label}</h2>
              <p className={s.sealSub}>رمز دومِ ورود — حفاظت دائمی در برابر دسترسی غیرمجاز</p>
            </div>
            <span className={s.badge}>اجباری · TOTP</span>
          </div>
          <div className={s.panelBody}>
            <TwoFactorCenter initial={initial} redirectTo="/dashboard" />
          </div>
        </section>

        <footer className={s.trust}>
          <ShieldCheck size={16} />
          <span>استاندارد RFC 6238 (TOTP)</span>
          <span>·</span>
          <span>کد جدید هر ۳۰ ثانیه</span>
          <span>·</span>
          <span>سازگار با Google Authenticator، 1Password، Bitwarden</span>
        </footer>
      </div>
    </div>
  );
}
