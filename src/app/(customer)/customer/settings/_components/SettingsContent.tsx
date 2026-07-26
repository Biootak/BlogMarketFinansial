'use client';

import { logout } from '@/actions/auth-actions';
import type { CustomerProfile } from '@/actions/customer-portal';
import { Section } from '@/components/Dashboard/primitives';
import { Bell, Lock, LogOut, Shield, Smartphone } from 'lucide-react';
import Link from 'next/link';
import s from './SettingsContent.module.css';

interface Props {
  profile: CustomerProfile;
}

interface SettingRowProps {
  icon: typeof Lock;
  title: string;
  description: string;
  action?: React.ReactNode;
  danger?: boolean;
}

function SettingRow({ icon: Icon, title, description, action, danger = false }: SettingRowProps) {
  return (
    <div className={s.settingRow} data-danger={danger}>
      <div className={s.settingIcon} data-danger={danger} aria-hidden>
        <Icon className="w-4 h-4" />
      </div>
      <div className={s.settingBody}>
        <span className={s.settingTitle}>{title}</span>
        <span className={s.settingDesc}>{description}</span>
      </div>
      {action && <div className={s.settingAction}>{action}</div>}
    </div>
  );
}

export default function SettingsContent({ profile }: Props) {
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={s.root}>
      {/* Account status */}
      <div className={s.statusBanner} data-status={profile.status}>
        <Shield className="w-5 h-5 flex-shrink-0" aria-hidden />
        <div className={s.statusText}>
          <span className={s.statusTitle}>وضعیت حساب</span>
          <span className={s.statusValue}>
            {profile.status === 'ACTIVE'
              ? 'حساب شما فعال است'
              : profile.status === 'FROZEN'
                ? 'حساب شما موقتاً منجمد شده — با پشتیبانی تماس بگیرید'
                : profile.status === 'PROSPECT'
                  ? 'حساب در انتظار فعال‌سازی'
                  : 'حساب بسته شده است'}
          </span>
        </div>
      </div>

      {/* Security */}
      <Section title="امنیت">
        <div className={s.settingsList}>
          <SettingRow
            icon={Lock}
            title="رمز عبور"
            description="تغییر رمز عبور حساب کاربری"
            action={
              <Link href="/auth?tab=reset-password" className={s.actionLink}>
                تغییر
              </Link>
            }
          />
          <SettingRow
            icon={Smartphone}
            title="احراز دو مرحله‌ای"
            description="افزایش امنیت با تأیید دو مرحله‌ای"
            action={
              <Link href="/customer/settings/2fa" className={s.actionLink}>
                پیکربندی
              </Link>
            }
          />
          <SettingRow
            icon={Shield}
            title="احراز هویت KYC"
            description={
              profile.kycStatus === 'APPROVED'
                ? 'هویت شما تأیید شده است'
                : 'برای تراکنش‌های بالا احراز هویت الزامی است'
            }
            action={
              profile.kycStatus !== 'APPROVED' ? (
                <Link href="/customer/kyc" className={s.actionLinkAccent}>
                  شروع
                </Link>
              ) : undefined
            }
          />
        </div>
      </Section>

      {/* Notifications */}
      <Section title="اعلان‌ها">
        <div className={s.settingsList}>
          <SettingRow
            icon={Bell}
            title="اعلان‌های تراکنش"
            description="دریافت پیام برای هر تراکنش انجام‌شده"
            action={<span className={s.comingSoon}>به زودی</span>}
          />
        </div>
      </Section>

      {/* Account actions */}
      <Section title="حساب کاربری">
        <div className={s.settingsList}>
          <SettingRow
            icon={LogOut}
            title="خروج از حساب"
            description="خروج از پنل مشتری در این دستگاه"
            action={
              <button type="button" className={s.actionDanger} onClick={handleLogout}>
                خروج
              </button>
            }
            danger
          />
        </div>
      </Section>

      {/* Support */}
      <div className={s.supportBlock}>
        <p className={s.supportText}>
          برای تغییر اطلاعات هویتی یا درخواست‌های خاص با صرافی{' '}
          <strong>{profile.exchange.name}</strong> تماس بگیرید.
        </p>
        {profile.exchange.phone && (
          <a href={`tel:${profile.exchange.phone}`} className={s.supportPhone} dir="ltr">
            {profile.exchange.phone}
          </a>
        )}
      </div>
    </div>
  );
}
