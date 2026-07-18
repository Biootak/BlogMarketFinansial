'use client';

// 2026-06-24: P2 lazy-load helpers shared between AuthFlow.redesign
// and each extracted step component. Keeping these in a single file
// means a step's dynamic chunk only has to import the small shared
// bag (this file) plus its own deps, not the whole 1100-line flow.

import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FieldValues, Path, useForm } from 'react-hook-form';

import type { AuthResult } from '@/actions/auth-actions';
import type { VerificationEmailIntent } from '@/lib/tokens';

export type { AuthResult };

export type InternalStep = 'email' | 'register' | 'login' | 'verify' | 'recover' | 'set-password';

export type FlowIntent = VerificationEmailIntent;
export type NoticeTone = 'error' | 'success' | 'info';

export type AuthNotice = {
  tone: NoticeTone;
  message: string;
};

type StepCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  aside: string;
  help?: string;
};

export const RESEND_COOLDOWN_MS = 60_000;

export const STEP_COPY: Record<InternalStep, StepCopy> = {
  email: {
    eyebrow: 'ورود یا ساخت حساب',
    title: 'با ایمیل یا حساب اجتماعی ادامه دهید',
    subtitle: 'ایمیل‌تان را وارد کنید تا سریع‌ترین مسیر مناسب حسابتان را ببینید.',
    aside:
      'اگر قبلاً با گوگل یا گیت‌هاب ثبت‌نام کرده‌اید، می‌توانید همان‌جا ادامه دهید یا ایمیل را وارد کنید تا مسیر درست برایتان باز شود.',
  },
  register: {
    eyebrow: 'ساخت حساب',
    title: 'حساب جدیدتان را تکمیل کنید',
    subtitle: 'یک نام نمایشی و رمز عبور امن انتخاب کنید تا حساب‌تان آماده شود.',
    aside: 'بعد از ثبت اطلاعات، یک کد شش‌رقمی برای تأیید ایمیل دریافت می‌کنید.',
  },
  login: {
    eyebrow: 'ورود',
    title: 'به حساب خود برگردید',
    subtitle: 'رمز عبور را وارد کنید یا با ارائه‌دهنده اجتماعی وارد شوید.',
    aside:
      'اگر این حساب قبلاً فقط با گوگل یا گیت‌هاب ساخته شده باشد، ورود با کد ایمیلی برایتان فعال می‌شود.',
  },
  verify: {
    eyebrow: 'تأیید ایمیل',
    title: 'کد شش‌رقمی را بررسی و تأیید کنید',
    subtitle:
      'کد ارسال‌شده به ایمیل‌تان را وارد کنید. پس از کامل شدن کد، دکمه تأیید برای ادامه فعال می‌شود.',
    aside:
      'اگر کدی دریافت نکردید، چند ثانیه صبر کنید و سپس دوباره ارسال را بزنید. پوشه spam را هم بررسی کنید.',
    help: 'کد را دقیق وارد کنید؛ بعد از کامل شدن، با دکمه «تأیید و ادامه» مسیرتان تکمیل می‌شود.',
  },
  recover: {
    eyebrow: 'بازیابی رمز عبور',
    title: 'دسترسی به حساب را برگردانید',
    subtitle: 'ایمیل حساب را وارد کنید تا در صورت وجود، کد بازیابی برایتان ارسال شود.',
    aside: 'برای حفظ حریم خصوصی، نتیجه این مرحله برای همه ایمیل‌ها مشابه نمایش داده می‌شود.',
  },
  'set-password': {
    eyebrow: 'رمز عبور جدید',
    title: 'یک رمز عبور تازه تعریف کنید',
    subtitle: 'رمزی انتخاب کنید که استفاده روزانه و امنیت مناسب را هم‌زمان پوشش دهد.',
    aside: 'پس از ثبت رمز جدید، بلافاصله می‌توانید وارد داشبورد شوید.',
  },
};

export const INTENT_LABEL: Record<FlowIntent, string> = {
  register: 'فعال‌سازی حساب',
  login: 'ورود امن',
  reverify: 'تأیید مجدد ایمیل',
  recover: 'بازیابی رمز عبور',
  'service-verify': 'تأیید درخواست خدمات',
};

export const SECURITY_POINTS = [
  'اگر قبلاً با گوگل یا گیت‌هاب حساب ساخته‌اید، از همان دکمه‌ها یا ایمیل اصلی‌تان استفاده کنید.',
  'اگر کد به دستتان نرسید، spam را بررسی کنید و پس از پایان شمارش، ارسال مجدد را بزنید.',
  'تمام عملیات حساس روی سرور انجام می‌شود و کدها زمان انقضا و محدودیت تلاش دارند.',
] as const;

export function scorePassword(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: '' };

  let points = 0;
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;

  const score = Math.min(4, Math.max(0, points - 1)) as 0 | 1 | 2 | 3 | 4;
  const labels = ['', 'ضعیف', 'قابل قبول', 'خوب', 'عالی'];
  return { score, label: labels[score] };
}

export function formatCooldown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return totalSeconds.toLocaleString('fa-IR');
}

export function readInitialStep(step: string | null, intent: string | null): InternalStep {
  const allowedSteps: InternalStep[] = [
    'email',
    'register',
    'login',
    'verify',
    'recover',
    'set-password',
  ];

  if (step && allowedSteps.includes(step as InternalStep)) {
    return step as InternalStep;
  }

  switch (intent) {
    case 'register':
      return 'register';
    case 'login':
      return 'login';
    case 'recover':
      return 'recover';
    default:
      return 'email';
  }
}

/**
 * Reusable password field with eye-toggle + optional strength meter.
 * Generic over the form's FieldValues so it can be used inside any
 * react-hook-form form without a wrapper component.
 */
export function PasswordField<TFieldValues extends FieldValues>({
  name,
  id,
  label,
  autoComplete,
  error,
  registration,
  showStrength = false,
}: {
  name: Path<TFieldValues>;
  id: string;
  label: string;
  autoComplete: string;
  error?: string;
  registration: ReturnType<typeof useForm<TFieldValues>>['register'];
  showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const strength = useMemo(() => scorePassword(value), [value]);
  const field = registration(name);

  return (
    <div className="auth-fieldset">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error) || undefined}
          className={`auth-input auth-input--with-action${error ? ' auth-input--invalid' : ''}`}
          dir="ltr"
          {...field}
          onChange={(event) => {
            field.onChange(event);
            setValue(event.target.value);
          }}
        />
        <button
          type="button"
          className="auth-input-action"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error ? <span className="auth-error">{error}</span> : null}
      {showStrength && value ? (
        <div className="auth-strength" aria-live="polite">
          <div className="auth-strength-track" aria-hidden="true">
            {[1, 2, 3, 4].map((segment) => (
              <span
                key={segment}
                className={
                  strength.score >= segment
                    ? `auth-strength-seg auth-strength-seg--on-${strength.score}`
                    : 'auth-strength-seg'
                }
              />
            ))}
          </div>
          <span className="auth-strength-label">قدرت رمز: {strength.label}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Notice banner — wrapper around the success/error/info pills used
 * across every step. `key` is set on the consumer side so each
 * re-mount forces a fresh aria-live announcement.
 */
export function NoticeBanner({ notice }: { notice: AuthNotice | null }) {
  if (!notice) return null;

  const toneClass =
    notice.tone === 'error'
      ? 'auth-alert'
      : notice.tone === 'success'
        ? 'auth-notice auth-notice--success'
        : 'auth-notice';

  const Icon =
    notice.tone === 'error' ? AlertCircle : notice.tone === 'success' ? CheckCircle2 : Mail;

  return (
    <p className={toneClass} aria-live="polite">
      <Icon aria-hidden="true" />
      <span>{notice.message}</span>
    </p>
  );
}

/**
 * Status banner above the active step — tells the user what the flow
 * is currently doing. Pure presentational; the parent owns the step.
 */
export function ContextSummary({
  step,
  email,
  intent,
}: {
  step: InternalStep;
  email: string;
  intent: FlowIntent;
}) {
  const summary =
    step === 'email'
      ? 'ایمیل را وارد کنید یا مستقیماً با گوگل و گیت‌هاب ادامه دهید.'
      : step === 'register'
        ? 'تنها چند اطلاعات پایه مانده تا حسابتان ساخته شود.'
        : step === 'login'
          ? 'اگر رمز عبور یادتان نیست، همین‌جا مسیر بازیابی را باز کنید.'
          : step === 'recover'
            ? 'پس از دریافت کد، می‌توانید رمز عبور جدید تعریف کنید.'
            : step === 'set-password'
              ? 'بعد از ثبت رمز جدید، ورود شما بلافاصله تکمیل می‌شود.'
              : `کد برای ${email ? `ایمیل ${email}` : 'ایمیل شما'} ارسال شده و برای ${INTENT_LABEL[intent]} استفاده می‌شود.`;

  return (
    <div className="auth-context" aria-live="polite">
      <span className="auth-context-badge">
        <KeyRound aria-hidden="true" />
        وضعیت فعلی
      </span>
      <p className="auth-context-copy">{summary}</p>
    </div>
  );
}
