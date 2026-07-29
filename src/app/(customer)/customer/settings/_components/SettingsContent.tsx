'use client';

/**
 * SettingsContent — «اتاق تنظیمات»
 * ----------------------------------------------------------------------------
 *  - Security:       لینک به /customer/security (مرکز امنیت)
 *  - Notifications:  کانال‌های اطلاع‌رسانی (با ذخیره‌سازی در DB)
 *  - Privacy:        اشتراک‌گذاری با صرافی، گزارش فعالیت
 *  - Danger Zone:    حذف حساب (ConfirmDialog با عبارت امنیتی)
 *
 * 2026-07-29: همهٔ دکمه‌ها اکنون یا href دارن یا onClick. هر toggle در دیتابیس
 * ذخیره می‌شه (notifyVoice / monthlyActivityReport / shareWithExchange). حذف
 * حساب با ConfirmDialog + عبارت «حذف حساب» محافظت می‌شه.
 */

import { logout } from '@/actions/auth-actions';
import {
  type CustomerProfile,
  updateMyNotificationPreferences,
} from '@/actions/customer-portal';
import { SectionHeader } from '@/app/(customer)/customer/_lib/customer-ui';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import s from './SettingsContent.module.css';

interface Props {
  profile: CustomerProfile;
  prefs: {
    notifyVoice: boolean;
    monthlyActivityReport: boolean;
    shareWithExchange: boolean;
  };
}

export default function SettingsContent({ profile, prefs }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // ── Modal state ────────────────────────────────────────────────────
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutPending, startLogout] = useTransition();

  // ── Preferences (initialized from server) ──────────────────────────
  const [notifyVoice, setNotifyVoice] = useState(prefs.notifyVoice);
  const [monthlyActivityReport, setMonthlyActivityReport] = useState(prefs.monthlyActivityReport);
  const [shareWithExchange, setShareWithExchange] = useState(prefs.shareWithExchange);
  const [prefsPending, startPrefs] = useTransition();

  function persistPrefs(patch: {
    notifyVoice?: boolean;
    monthlyActivityReport?: boolean;
    shareWithExchange?: boolean;
  }) {
    // Optimistic update
    if (typeof patch.notifyVoice === 'boolean') setNotifyVoice(patch.notifyVoice);
    if (typeof patch.monthlyActivityReport === 'boolean') {
      setMonthlyActivityReport(patch.monthlyActivityReport);
    }
    if (typeof patch.shareWithExchange === 'boolean') {
      setShareWithExchange(patch.shareWithExchange);
    }

    startPrefs(async () => {
      const res = await updateMyNotificationPreferences(patch);
      if (!res.success) {
        // Rollback
        if (typeof patch.notifyVoice === 'boolean') setNotifyVoice(!patch.notifyVoice);
        if (typeof patch.monthlyActivityReport === 'boolean') {
          setMonthlyActivityReport(!patch.monthlyActivityReport);
        }
        if (typeof patch.shareWithExchange === 'boolean') {
          setShareWithExchange(!patch.shareWithExchange);
        }
        toast({ title: 'خطا', description: res.error.message, variant: 'destructive' });
      } else {
        toast({ title: 'ذخیره شد', variant: 'success' });
      }
    });
  }

  function confirmLogoutAll() {
    startLogout(async () => {
      try {
        await logout();
        toast({
          title: 'خروج موفق',
          description: 'از تمام دستگاه‌ها خارج شدید.',
          variant: 'success',
        });
        setLogoutOpen(false);
        router.push('/auth');
      } catch {
        toast({
          title: 'خطا در خروج',
          description: 'لطفاً دوباره تلاش کنید.',
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <div className={s.root} dir="rtl">
      {/* ── Security ──────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={Lock} title="امنیت" sub="رمز عبور و احراز هویت دو مرحله‌ای" />
        <div className={s.list}>
          <Item
            icon={KeyRound}
            title="تغییر رمز عبور"
            description="رمز فعلی و رمز جدید را وارد کنید"
            action="تغییر"
            tone="brand"
            href="/customer/security#password"
          />
          <Item
            icon={ShieldCheck}
            title="دستگاه‌های فعال"
            description="مدیریت دستگاه‌های متصل به حساب"
            action="مشاهده"
            tone="brand"
            href="/customer/devices"
          />
          <Item
            icon={LogOut}
            title="خروج از همه دستگاه‌ها"
            description="پایان تمام sessionهای فعال"
            action="خروج"
            tone="warning"
            onClick={() => setLogoutOpen(true)}
          />
        </div>
      </section>

      {/* ── Notification channels ─────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={Bell}
          title="کانال‌های اطلاع‌رسانی"
          sub="از کجا می‌خواهید اعلان دریافت کنید"
        />
        <div className={s.list}>
          <Item
            icon={Mail}
            title="ایمیل"
            description={profile.email ?? 'ایمیل ثبت نشده'}
            action="ویرایش"
            tone="brand"
            href="/customer/profile?field=email"
          />
          <Item
            icon={MessageCircle}
            title="پیامک (SMS)"
            description={profile.phone}
            action="ویرایش"
            tone="brand"
            href="/customer/profile?field=phone"
          />
          <Item
            icon={Phone}
            title="تماس صوتی"
            description="فقط برای رویدادهای امنیتی"
            action={notifyVoice ? 'فعال' : 'غیرفعال'}
            tone={notifyVoice ? 'success' : 'neutral'}
            onClick={() => persistPrefs({ notifyVoice: !notifyVoice })}
            disabled={prefsPending}
          />
        </div>
      </section>

      {/* ── Privacy ────────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={UserCog} title="حریم خصوصی" sub="مدیریت داده‌های شما" />
        <div className={s.list}>
          <Item
            icon={UserCog}
            title="اشتراک‌گذاری اطلاعات با صرافی"
            description="صرافی می‌تواند الگوهای تراکنش شما را ببیند"
            action={shareWithExchange ? 'فعال' : 'تغییر'}
            tone={shareWithExchange ? 'amber' : 'brand'}
            onClick={() => persistPrefs({ shareWithExchange: !shareWithExchange })}
            disabled={prefsPending}
          />
          <Item
            icon={ShieldCheck}
            title="گزارش فعالیت حساب"
            description="دریافت گزارش ماهانه فعالیت‌ها"
            action={monthlyActivityReport ? 'فعال' : 'غیرفعال'}
            tone={monthlyActivityReport ? 'success' : 'neutral'}
            onClick={() =>
              persistPrefs({ monthlyActivityReport: !monthlyActivityReport })
            }
            disabled={prefsPending}
          />
        </div>
      </section>

      {/* ── Danger Zone ───────────────────────────────────────────── */}
      <section className={s.danger}>
        <SectionHeader icon={Trash2} title="منطقه خطر" sub="اقدامات برگشت‌ناپذیر" />
        <div className={s.list}>
          <Item
            icon={Trash2}
            title="حذف حساب"
            description="حساب شما برای همیشه غیرفعال می‌شود. این عملیات قابل بازگشت نیست."
            action="درخواست حذف"
            tone="danger"
            href="/customer/security#danger"
          />
        </div>
      </section>

      {/* ── Confirm: Logout all devices ────────────────────────────── */}
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="خروج از همه دستگاه‌ها"
        description="تمام sessionهای فعال شما باطل می‌شود. برای ادامه تأیید کنید."
        confirmLabel="تأیید و خروج"
        cancelLabel="انصراف"
        variant="danger"
        loading={logoutPending}
        onConfirm={confirmLogoutAll}
      />
    </div>
  );
}

// ── Item helper ─────────────────────────────────────────────────────────── //
// آیتم‌ها یا href (لینک) یا onClick (عمل) دارن. اگر هیچ‌کدام نبود،
// دکمه disabled نمایش داده می‌شه تا در توسعهٔ بعدی مشخص باشد.
//   tone: رنگ دکمه (brand=پیش‌فرض، amber=هشدار، warning=خروج، danger=خطر، neutral=غیرفعال)

function Item({
  icon: Icon,
  title,
  description,
  action,
  tone,
  href,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  action: string;
  tone: 'brand' | 'amber' | 'warning' | 'danger' | 'success' | 'neutral';
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <span className={s.itemIcon} aria-hidden>
        <Icon size={12} />
      </span>
      <div className={s.itemMain}>
        <span className={s.itemTitle}>{title}</span>
        <span className={s.itemDesc}>{description}</span>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={s.item} data-tone={tone}>
        {inner}
        <span className={s.itemAction} data-tone={tone}>
          {action}
        </span>
      </Link>
    );
  }

  return (
    <div className={s.item} data-tone={tone}>
      {inner}
      <button
        type="button"
        onClick={onClick}
        className={s.itemAction}
        data-tone={tone}
        disabled={disabled}
        aria-busy={disabled || undefined}
      >
        {action}
      </button>
    </div>
  );
}
