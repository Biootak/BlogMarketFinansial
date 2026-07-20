'use client';

import { AlertCircle, AtSign, CheckCircle2, Eye, EyeOff, Info, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FieldValues, Path, useForm } from 'react-hook-form';

import type { AuthResult } from '@/actions/auth-actions';
import type { VerificationEmailIntent } from '@/lib/tokens';

export type { AuthResult };

export type InternalStep = 'email' | 'register' | 'login' | 'verify' | 'recover' | 'set-password';

export type FlowIntent = VerificationEmailIntent;
export type NoticeTone = 'error' | 'success' | 'info';
export type AuthNotice = { tone: NoticeTone; message: string };

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
    title: 'با ایمیل ادامه دهید',
    subtitle: 'ایمیل‌تان را وارد کنید تا مناسب‌ترین مسیر باز شود.',
    aside: '',
  },
  register: {
    eyebrow: 'ساخت حساب',
    title: 'حساب جدید بسازید',
    subtitle: 'اطلاعات پایه‌تان را وارد کنید تا حساب آماده شود.',
    aside: '',
  },
  login: {
    eyebrow: 'ورود',
    title: 'خوش برگشتید',
    subtitle: 'رمز عبور را وارد کنید یا با یک ارائه‌دهنده اجتماعی ادامه دهید.',
    aside: '',
  },
  verify: {
    eyebrow: 'تأیید ایمیل',
    title: 'کد ایمیل را وارد کنید',
    subtitle: 'کد ۶ رقمی ارسال‌شده را وارد کنید.',
    aside: '',
    help: 'کد را وارد کنید؛ بعد از کامل شدن، با دکمه «تأیید» ادامه دهید.',
  },
  recover: {
    eyebrow: 'بازیابی رمز عبور',
    title: 'رمز عبور را بازیابی کنید',
    subtitle: 'کد بازیابی به ایمیل‌تان ارسال می‌شود.',
    aside: '',
  },
  'set-password': {
    eyebrow: 'رمز عبور جدید',
    title: 'رمز جدید بسازید',
    subtitle: 'یک رمز امن انتخاب کنید.',
    aside: '',
  },
};

export const INTENT_LABEL: Record<FlowIntent, string> = {
  register: 'فعال‌سازی حساب',
  login: 'ورود امن',
  reverify: 'تأیید مجدد ایمیل',
  recover: 'بازیابی رمز عبور',
  'service-verify': 'تأیید درخواست خدمات',
};

export function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: '' };
  let p = 0;
  if (pw.length >= 8) p++;
  if (pw.length >= 12) p++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) p++;
  if (/\d/.test(pw)) p++;
  if (/[^A-Za-z0-9]/.test(pw)) p++;
  const score = Math.min(4, Math.max(0, p - 1)) as 0 | 1 | 2 | 3 | 4;
  return { score, label: ['', 'ضعیف', 'قابل قبول', 'خوب', 'عالی'][score] };
}

export function formatCooldown(ms: number): string {
  return Math.max(0, Math.ceil(ms / 1000)).toLocaleString('fa-IR');
}

export function readInitialStep(step: string | null, intent: string | null): InternalStep {
  const allowed: InternalStep[] = [
    'email',
    'register',
    'login',
    'verify',
    'recover',
    'set-password',
  ];
  if (step && allowed.includes(step as InternalStep)) return step as InternalStep;
  if (intent === 'register') return 'register';
  if (intent === 'login') return 'login';
  if (intent === 'recover') return 'recover';
  return 'email';
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Shared UI primitives                                                      */
/* ────────────────────────────────────────────────────────────────────────── */

/** Password field with eye-toggle + optional strength bar */
export function PasswordField<TFieldValues extends FieldValues>({
  name,
  id,
  label,
  autoComplete,
  error,
  registration,
  showStrength = false,
  autoFocus = false,
}: {
  name: Path<TFieldValues>;
  id: string;
  label: string;
  autoComplete: string;
  error?: string;
  registration: ReturnType<typeof useForm<TFieldValues>>['register'];
  showStrength?: boolean;
  autoFocus?: boolean;
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
          // biome-ignore lint/a11y/noAutofocus: intentional per-field focus
          autoFocus={autoFocus}
          aria-invalid={Boolean(error) || undefined}
          className={`auth-input auth-input--with-action${error ? ' auth-input--invalid' : ''}`}
          dir="ltr"
          {...field}
          onChange={(e) => {
            field.onChange(e);
            setValue(e.target.value);
          }}
        />
        <button
          type="button"
          className="auth-input-action"
          onClick={() => setVisible((v) => !v)}
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
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={
                  strength.score >= s
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

/** Locked email chip — shows confirmed email with a change button */
export function LockedEmailChip({
  email,
  onChangeEmail,
  label = 'ادامه به عنوان',
}: {
  email: string;
  onChangeEmail: () => void;
  label?: string;
}) {
  return (
    <div className="auth-email-chip" aria-label={`${label}: ${email}`}>
      <span className="auth-email-chip__icon" aria-hidden="true">
        <AtSign />
      </span>
      <span className="auth-email-chip__content">
        <span className="auth-email-chip__label">{label}</span>
        <span className="auth-email-chip__address" dir="ltr">
          {email}
        </span>
      </span>
      <button
        type="button"
        className="auth-email-chip__change"
        onClick={onChangeEmail}
        aria-label={`تغییر ایمیل — اکنون: ${email}`}
      >
        <Pencil aria-hidden="true" />
        تغییر
      </button>
    </div>
  );
}

/** Notice / alert banner */
export function NoticeBanner({ notice }: { notice: AuthNotice | null }) {
  if (!notice) return null;
  const cls =
    notice.tone === 'error'
      ? 'auth-alert'
      : notice.tone === 'success'
        ? 'auth-notice auth-notice--success'
        : 'auth-notice';
  const Icon =
    notice.tone === 'error' ? AlertCircle : notice.tone === 'success' ? CheckCircle2 : Info;
  return (
    <p className={cls} aria-live="polite">
      <Icon aria-hidden="true" />
      <span>{notice.message}</span>
    </p>
  );
}

/** Context summary — kept for backward compat but hidden via CSS */
export function ContextSummary({
  step: _step,
  email: _email,
  intent: _intent,
}: {
  step: InternalStep;
  email: string;
  intent: FlowIntent;
}) {
  return null;
}
