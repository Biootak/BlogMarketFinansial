'use client';

import { Activity, LogIn, ScrollText, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { relative, stamp, type ToneKey } from './format';
import { useObs } from './ObsProvider';
import { ObsEmpty } from './ObsSection';
import s from './obs.module.css';

interface ActionMeta {
  label: string;
  icon: LucideIcon;
  tone: ToneKey;
}

const ACTION_META: Record<string, ActionMeta> = {
  LOGIN: { label: 'ورود کاربر', icon: LogIn, tone: 'info' },
  LOGOUT: { label: 'خروج کاربر', icon: LogIn, tone: 'idle' },
  SIGNUP: { label: 'ثبت‌نام', icon: ShieldCheck, tone: 'ok' },
  DEPOSIT: { label: 'واریز', icon: Wallet, tone: 'ok' },
  WITHDRAW: { label: 'برداشت', icon: Wallet, tone: 'warn' },
  TRANSFER: { label: 'انتقال', icon: Wallet, tone: 'warn' },
  KYC_APPROVED: { label: 'تأیید احراز هویت', icon: ShieldCheck, tone: 'ok' },
  KYC_REJECTED: { label: 'رد احراز هویت', icon: ShieldAlert, tone: 'bad' },
  KYC_SUBMITTED: { label: 'ارسال احراز هویت', icon: ShieldCheck, tone: 'info' },
  FRAUD_DETECTED: { label: 'تشخیص تقلب', icon: ShieldAlert, tone: 'bad' },
  FRAUD_BLOCKED: { label: 'مسدودسازی تقلب', icon: ShieldAlert, tone: 'bad' },
};

const fallbackMeta = (action: string): ActionMeta => ({
  label: action,
  icon: Activity,
  tone: 'idle',
});

/**
 * رد ممیزی — رویدادهای واقعی AuditLog در پنجرهٔ جاری.
 * جریان زمانی روی یک خط پیوسته با گرهٔ رنگی است نه فهرستی از آیکون‌های در کادر؛
 * خطِ پیوسته «توالی» را می‌رساند و کادرها آن را می‌شکستند.
 */
export function AuditTrail() {
  const { data } = useObs();
  if (!data) return null;

  if (data.audit.length === 0) {
    return (
      <ObsEmpty
        icon={ScrollText}
        title="رویداد ممیزی‌شده‌ای نداریم"
        hint="هر اقدام حساس (ورود، احراز هویت، تراکنش، تغییر تنظیمات) در AuditLog ثبت و همین‌جا به‌ترتیب زمان نمایش داده می‌شود."
      />
    );
  }

  return (
    <ul className={s.trail}>
      {data.audit.map((entry) => {
        const meta = ACTION_META[entry.action] ?? fallbackMeta(entry.action);
        const Icon = meta.icon;
        return (
          <li key={entry.id} className={s.trailRow} data-tone={meta.tone}>
            <span className={s.trailText}>
              <span className={s.trailAction}>
                <Icon size={14} strokeWidth={1.5} className={s.trailIcon} aria-hidden="true" />
                {meta.label}
              </span>
              <span className={s.trailMeta}>
                {entry.actorRole} · {entry.entityType} · {stamp(entry.createdAt)}
              </span>
            </span>
            <span className={s.time}>{relative(entry.createdAt, data.generatedAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}
