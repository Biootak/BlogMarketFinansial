'use client';

/**
 * SettingsContent — «اتاق تنظیمات»
 * ----------------------------------------------------------------------------
 *  - Security:    تغییر رمز، 2FA، logout
 *  - Notifications:  کانال‌های اطلاع‌رسانی
 *  - Privacy:     لاگ‌ها و فعالیت‌ها
 *  - Danger Zone: حذف حساب (read-only)
 */

import type { CustomerProfile } from '@/actions/customer-portal';
import { SectionHeader } from '@/app/(customer)/customer/_lib/customer-ui';
import { TwoFactorSection } from '@/components/Dashboard/Profile/TwoFactorSection';
import {
  Bell,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Trash2,
  UserCog,
} from 'lucide-react';
import s from './SettingsContent.module.css';

interface Props {
  profile: CustomerProfile;
}

export default function SettingsContent({ profile }: Props) {
  return (
    <div className={s.root} dir="rtl">
      {/* ── Security ────────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={Lock} title="امنیت" sub="رمز عبور و احراز هویت دو مرحله‌ای" />
        <div className={s.list}>
          <Item
            icon={KeyRound}
            title="تغییر رمز عبور"
            description="رمز فعلی و رمز جدید را وارد کنید"
            action="تغییر"
            tone="brand"
          />
          <Item
            icon={ShieldCheck}
            title="دستگاه‌های فعال"
            description="مدیریت دستگاه‌های متصل به حساب"
            action="مشاهده"
            tone="brand"
          />
          <Item
            icon={LogOut}
            title="خروج از همه دستگاه‌ها"
            description="پایان تمام sessionهای فعال"
            action="خروج"
            tone="warning"
          />
        </div>

        {/* Two-factor authentication — full management panel */}
        <div className={s.twofaSlot}>
          <TwoFactorSection userEmail={profile.email ?? undefined} />
        </div>
      </section>

      {/* ── Notification channels ────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={Bell} title="کانال‌های اطلاع‌رسانی" sub="از کجا می‌خواهید اعلان دریافت کنید" />
        <div className={s.list}>
          <Item
            icon={Mail}
            title="ایمیل"
            description={profile.email ?? 'ایمیل ثبت نشده'}
            action="ویرایش"
            tone="brand"
          />
          <Item
            icon={MessageCircle}
            title="پیامک (SMS)"
            description={profile.phone}
            action="ویرایش"
            tone="brand"
          />
          <Item
            icon={Phone}
            title="تماس صوتی"
            description="فقط برای رویدادهای امنیتی"
            action="غیرفعال"
            tone="neutral"
          />
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={UserCog} title="حریم خصوصی" sub="مدیریت داده‌های شما" />
        <div className={s.list}>
          <Item
            icon={UserCog}
            title="اشتراک‌گذاری اطلاعات با صرافی"
            description="صرافی می‌تواند الگوهای تراکنش شما را ببیند"
            action="تغییر"
            tone="brand"
          />
          <Item
            icon={ShieldCheck}
            title="گزارش فعالیت حساب"
            description="دریافت گزارش ماهانه فعالیت‌ها"
            action="فعال"
            tone="amber"
          />
        </div>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────── */}
      <section className={s.danger}>
        <SectionHeader icon={Trash2} title="منطقه خطر" sub="اقدامات برگشت‌ناپذیر" />
        <div className={s.list}>
          <Item
            icon={Trash2}
            title="حذف حساب"
            description="حساب شما برای همیشه غیرفعال می‌شود. این عملیات قابل بازگشت نیست."
            action="درخواست حذف"
            tone="danger"
          />
        </div>
      </section>
    </div>
  );
}

// ── Item helper ─────────────────────────────────────────────────────────── //

function Item({
  icon: Icon,
  title,
  description,
  action,
  tone,
}: {
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  action: string;
  tone: 'brand' | 'amber' | 'warning' | 'danger' | 'neutral';
}) {
  return (
    <div className={s.item} data-tone={tone}>
      <span className={s.itemIcon} aria-hidden>
        <Icon size={12} />
      </span>
      <div className={s.itemMain}>
        <span className={s.itemTitle}>{title}</span>
        <span className={s.itemDesc}>{description}</span>
      </div>
      <button type="button" className={s.itemAction} data-tone={tone}>
        {action}
      </button>
    </div>
  );
}
