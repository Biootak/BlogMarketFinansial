'use client';

import { useEffect, useId, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues, type Path, type SubmitHandler } from 'react-hook-form';
import type { z } from 'zod';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import {
  EmailLookupSchema,
  LoginSchema,
  RegisterSchema,
  SetPasswordSchema,
} from '@/schemas';
import {
  lookupEmail,
  loginWithPassword,
  recoverPassword,
  registerUser,
  resendOtp,
  setNewPassword,
  type AuthResult,
  verifyOtp,
} from '@/actions/auth-actions';
import type { VerificationEmailIntent } from '@/lib/tokens';

import OtpDialPad, { type OtpDialPadHandle } from './OtpDialPad';
import SocialProviders from './SocialProviders';
import type { InternalStep } from './StepProgress';

type FlowIntent = VerificationEmailIntent;
type NoticeTone = 'error' | 'success' | 'info';

type AuthNotice = {
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

const RESEND_COOLDOWN_MS = 60_000;

const STEP_COPY: Record<InternalStep, StepCopy> = {
  email: {
    eyebrow: 'ورود یا ساخت حساب',
    title: 'با ایمیل یا حساب اجتماعی ادامه دهید',
    subtitle: 'ایمیل‌تان را وارد کنید تا سریع‌ترین مسیر مناسب حسابتان را ببینید.',
    aside: 'اگر قبلاً با گوگل یا گیت‌هاب ثبت‌نام کرده‌اید، می‌توانید همان‌جا ادامه دهید یا ایمیل را وارد کنید تا مسیر درست برایتان باز شود.',
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
    aside: 'اگر این حساب قبلاً فقط با گوگل یا گیت‌هاب ساخته شده باشد، ورود با کد ایمیلی برایتان فعال می‌شود.',
  },
  verify: {
    eyebrow: 'تأیید ایمیل',
    title: 'کد شش‌رقمی را بررسی و تأیید کنید',
    subtitle: 'کد ارسال‌شده به ایمیل‌تان را وارد کنید. پس از کامل شدن کد، دکمه تأیید برای ادامه فعال می‌شود.',
    aside: 'اگر کدی دریافت نکردید، چند ثانیه صبر کنید و سپس دوباره ارسال را بزنید. پوشه spam را هم بررسی کنید.',
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

const INTENT_LABEL: Record<FlowIntent, string> = {
  register: 'فعال‌سازی حساب',
  login: 'ورود امن',
  reverify: 'تأیید مجدد ایمیل',
  recover: 'بازیابی رمز عبور',
};

const SECURITY_POINTS = [
  'اگر قبلاً با گوگل یا گیت‌هاب حساب ساخته‌اید، از همان دکمه‌ها یا ایمیل اصلی‌تان استفاده کنید.',
  'اگر کد به دستتان نرسید، spam را بررسی کنید و پس از پایان شمارش، ارسال مجدد را بزنید.',
  'تمام عملیات حساس روی سرور انجام می‌شود و کدها زمان انقضا و محدودیت تلاش دارند.',
] as const;

function scorePassword(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
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

function formatCooldown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  return totalSeconds.toLocaleString('fa-IR');
}

function readInitialStep(step: string | null, intent: string | null): InternalStep {
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

function PasswordField<TFieldValues extends FieldValues>({
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
      <label htmlFor={id} className="auth-label">{label}</label>
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

function NoticeBanner({ notice }: { notice: AuthNotice | null }) {
  if (!notice) return null;

  const toneClass =
    notice.tone === 'error'
      ? 'auth-alert'
      : notice.tone === 'success'
        ? 'auth-notice auth-notice--success'
        : 'auth-notice';

  const Icon = notice.tone === 'error' ? AlertCircle : notice.tone === 'success' ? CheckCircle2 : Mail;

  return (
    <p className={toneClass} aria-live="polite">
      <Icon aria-hidden="true" />
      <span>{notice.message}</span>
    </p>
  );
}

function ContextSummary({ step, email, intent }: { step: InternalStep; email: string; intent: FlowIntent }) {
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

export default function AuthFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStep = readInitialStep(searchParams.get('step'), searchParams.get('intent'));
  const initialEmail = searchParams.get('email') ?? '';
  const initialIntent = searchParams.get('intent');

  const [step, setStep] = useState<InternalStep>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [intent, setIntent] = useState<FlowIntent>(
    initialIntent === 'login' || initialIntent === 'reverify' || initialIntent === 'recover'
      ? initialIntent
      : 'register',
  );
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [otpInvalid, setOtpInvalid] = useState(false);
  // 2026-06-24: P0-1. Holds the single-use secret minted by
  // verifyOtp when intent='recover'. setNewPassword MUST receive this
  // — without it, password reset is wide open. Held in React state so
  // a hard refresh forces the user through OTP again (which also
  // invalidates any leaked token after 5 min).
  const [resetToken, setResetToken] = useState<string | null>(null);

  const statusRegionId = useId();
  const copy = STEP_COPY[step];

  useEffect(() => {
    if (cooldownMs <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownMs((current) => (current > 1000 ? current - 1000 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownMs]);

  const syncUrl = (nextStep: InternalStep, nextEmail: string, nextIntent: FlowIntent) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', nextStep);

    if (nextEmail) params.set('email', nextEmail);
    else params.delete('email');

    if (nextStep === 'email') {
      params.delete('intent');
    } else {
      params.set('intent', nextIntent);
    }

    router.replace(`/auth?${params.toString()}`, { scroll: false });
  };

  const moveTo = (nextStep: InternalStep, options?: { email?: string; intent?: FlowIntent; notice?: AuthNotice | null }) => {
    const nextEmail = options?.email ?? email;
    const nextIntent = options?.intent ?? intent;

    setStep(nextStep);
    setEmail(nextEmail);
    setIntent(nextIntent);
    if (options && 'notice' in options) {
      setNotice(options.notice ?? null);
    }
    // Clear the reset secret when we leave the set-password step —
    // any subsequent navigate forward must re-verify.
    if (nextStep !== 'set-password') {
      setResetToken(null);
    }
    syncUrl(nextStep, nextEmail, nextIntent);
  };

  const handleResult = (result: AuthResult) => {
    if (!result.success) {
      setNotice({ tone: 'error', message: result.error });
      if (typeof result.cooldownMs === 'number') {
        setCooldownMs(result.cooldownMs);
      }
      return;
    }

    const nextEmail = result.email ?? email;
    const nextIntent = (result.intent ?? intent) as FlowIntent;
    setEmail(nextEmail);
    setIntent(nextIntent);

    // 2026-06-24: P0-1 — capture the reset secret for set-password step.
    if (typeof result.resetToken === 'string') {
      setResetToken(result.resetToken);
    }

    // F4: surface the success notice even on the redirect path so
    // screen-reader users hear "تأیید شد، در حال انتقال" before the
    // page changes.
    setNotice({ tone: 'success', message: result.message });

    if (result.redirect) {
      router.push(result.redirect);
      return;
    }

    if (result.step) {
      moveTo(result.step as InternalStep, {
        email: nextEmail,
        intent: nextIntent,
        notice: { tone: 'success', message: result.message },
      });
    }
  };

  return (
    <section className="auth-card auth-fade-in" aria-labelledby="auth-title">
      <div className="auth-card-inner">
        <div className="auth-card-grid">
          <div className="auth-main-panel">
            <div className="auth-shell-band" aria-label="خلاصهٔ فرایند احراز هویت">
              <p className="auth-shell-eyebrow">{copy.eyebrow}</p>
              <div className="auth-card-header">
                <h1 id="auth-title" className="auth-form-heading">{copy.title}</h1>
                <p className="auth-form-lede">{copy.subtitle}</p>
              </div>
            </div>

            <ContextSummary step={step} email={email} intent={intent} />

            <div id={statusRegionId} className="sr-only" aria-live="polite" aria-atomic="true">
              {notice?.message ?? ''}
            </div>

            <NoticeBanner notice={notice} />

            {step === 'email' ? (
              <EmailStep
                onResult={handleResult}
                onMoveTo={moveTo}
              />
            ) : null}

            {step === 'register' ? (
              <RegisterStep
                initialEmail={email}
                onResult={handleResult}
                onBack={() => moveTo('email', { notice: null, intent: 'register' })}
              />
            ) : null}

            {step === 'login' ? (
              <LoginStep
                initialEmail={email}
                onResult={handleResult}
                onRecover={() => moveTo('recover', { notice: null, intent: 'recover' })}
                onBack={() => moveTo('email', { notice: null, intent: 'login' })}
              />
            ) : null}

            {step === 'recover' ? (
              <RecoverStep
                initialEmail={email}
                onResult={handleResult}
                onBack={() => moveTo('login', { notice: null, intent: 'login' })}
              />
            ) : null}

            {step === 'verify' ? (
              <VerifyStep
                email={email}
                intent={intent}
                cooldownMs={cooldownMs}
                invalid={otpInvalid}
                helpText={copy.help ?? STEP_COPY.verify.help ?? ''}
                onResult={handleResult}
                onCooldownChange={setCooldownMs}
                onInvalidChange={setOtpInvalid}
                onBack={() => {
                  const fallbackStep: InternalStep = intent === 'recover' ? 'recover' : intent === 'login' ? 'login' : 'register';
                  moveTo(fallbackStep, { notice: null, intent });
                }}
              />
            ) : null}

            {step === 'set-password' ? (
              <SetPasswordStep
                email={email}
                resetToken={resetToken}
                onResult={handleResult}
                onBack={() => {
                  setResetToken(null);
                  moveTo('verify', { notice: null, intent: 'recover' });
                }}
              />
            ) : null}

            <p className="auth-fineprint">
              با ادامه، <Link href="/terms" className="auth-link">قوانین و مقررات</Link> و{' '}
              <Link href="/privacy-policy" className="auth-link">حریم خصوصی</Link> را می‌پذیرید.
            </p>
          </div>

          <aside className="auth-aside-panel" aria-label="راهنمای احراز هویت">
            <div className="auth-aside-hero">
              <span className="auth-aside-kicker">
                <ShieldCheck aria-hidden="true" />
                راهنمای سریع
              </span>
              <p className="auth-aside-copy">{copy.aside}</p>
            </div>

            <div className="auth-aside-metric" aria-label="خلاصه مسیر فعلی">
              <span className="auth-aside-metric-label">اکنون در این بخش هستید</span>
              <strong className="auth-aside-metric-value">
                {step === 'verify' ? INTENT_LABEL[intent] : copy.title}
              </strong>
            </div>

            <ul className="auth-aside-list">
              {SECURITY_POINTS.map((item) => (
                <li key={item} className="auth-aside-list-item">
                  <Sparkles aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}

function EmailStep({
  onResult,
  onMoveTo,
}: {
  onResult: (result: AuthResult) => void;
  onMoveTo: (nextStep: InternalStep, options?: { email?: string; intent?: FlowIntent; notice?: AuthNotice | null }) => void;
}) {
  type Values = z.infer<typeof EmailLookupSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(EmailLookupSchema),
    defaultValues: { email: '' },
  });
  const [isPending, startTransition] = useTransition();
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      const result = await lookupEmail(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form auth-stage-form--compact">
      <SocialProviders />

      <div className="auth-divider" aria-hidden="true">
        <span className="auth-divider-label">یا ادامه با ایمیل</span>
      </div>

      <div className="auth-fieldset">
        <label htmlFor="auth-email" className="auth-label">ایمیل</label>
        <input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          placeholder="you@example.com"
          aria-invalid={Boolean(form.formState.errors.email) || undefined}
          className={`auth-input${form.formState.errors.email ? ' auth-input--invalid' : ''}`}
          {...form.register('email')}
        />
        {form.formState.errors.email?.message ? (
          <span className="auth-error">{form.formState.errors.email.message}</span>
        ) : null}
      </div>

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال بررسی…' : 'ادامه'}
      </button>

      <button
        type="button"
        className="auth-link-row"
        onClick={() => onMoveTo('recover', { intent: 'recover', notice: null })}
      >
        <Mail aria-hidden="true" />
        بازیابی رمز عبور
      </button>
    </form>
  );
}

function RegisterStep({
  initialEmail,
  onResult,
  onBack,
}: {
  initialEmail: string;
  onResult: (result: AuthResult) => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof RegisterSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: initialEmail,
      password: '',
    },
  });
  const [isPending, startTransition] = useTransition();
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('email', values.email);
      formData.append('password', values.password);
      const result = await registerUser(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت و تغییر ایمیل
      </button>

      <div className="auth-fieldset">
        <label htmlFor="register-name" className="auth-label">نام نمایشی</label>
        <input
          id="register-name"
          type="text"
          autoComplete="name"
          aria-invalid={Boolean(form.formState.errors.name) || undefined}
          className={`auth-input${form.formState.errors.name ? ' auth-input--invalid' : ''}`}
          {...form.register('name')}
        />
        {form.formState.errors.name?.message ? <span className="auth-error">{form.formState.errors.name.message}</span> : null}
      </div>

      <div className="auth-fieldset">
        <label htmlFor="register-email" className="auth-label">ایمیل</label>
        <input
          id="register-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          aria-invalid={Boolean(form.formState.errors.email) || undefined}
          className={`auth-input${form.formState.errors.email ? ' auth-input--invalid' : ''}`}
          {...form.register('email')}
        />
        {form.formState.errors.email?.message ? <span className="auth-error">{form.formState.errors.email.message}</span> : null}
      </div>

      <PasswordField<Values>
        name="password"
        id="password"
        label="رمز عبور"
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
        registration={form.register}
        showStrength
      />

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ساخت حساب…' : 'ایجاد حساب'}
      </button>
    </form>
  );
}

function LoginStep({
  initialEmail,
  onResult,
  onRecover,
  onBack,
}: {
  initialEmail: string;
  onResult: (result: AuthResult) => void;
  onRecover: () => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof LoginSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: initialEmail,
      password: '',
    },
  });
  const [isPending, startTransition] = useTransition();
  const [visible, setVisible] = useState(false);
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);
      const result = await loginWithPassword(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت
      </button>

      <SocialProviders />

      <div className="auth-divider" aria-hidden="true">
        <span className="auth-divider-label">یا ورود با رمز عبور</span>
      </div>

      <div className="auth-fieldset">
        <label htmlFor="login-email" className="auth-label">ایمیل</label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          aria-invalid={Boolean(form.formState.errors.email) || undefined}
          className={`auth-input${form.formState.errors.email ? ' auth-input--invalid' : ''}`}
          {...form.register('email')}
        />
        {form.formState.errors.email?.message ? <span className="auth-error">{form.formState.errors.email.message}</span> : null}
      </div>

      <div className="auth-fieldset">
        <div className="auth-label-row">
          <label htmlFor="login-password" className="auth-label">رمز عبور</label>
          <button type="button" className="auth-link-quiet" onClick={onRecover}>
            فراموشی رمز عبور
          </button>
        </div>
        <div className="auth-input-wrap">
          <input
            id="login-password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            dir="ltr"
            aria-invalid={Boolean(form.formState.errors.password) || undefined}
            className={`auth-input auth-input--with-action${form.formState.errors.password ? ' auth-input--invalid' : ''}`}
            {...form.register('password')}
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
        {form.formState.errors.password?.message ? <span className="auth-error">{form.formState.errors.password.message}</span> : null}
      </div>

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ورود…' : 'ورود'}
      </button>
    </form>
  );
}

function RecoverStep({
  initialEmail,
  onResult,
  onBack,
}: {
  initialEmail: string;
  onResult: (result: AuthResult) => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof EmailLookupSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(EmailLookupSchema),
    defaultValues: { email: initialEmail },
  });
  const [isPending, startTransition] = useTransition();
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      const result = await recoverPassword(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت به ورود
      </button>

      <div className="auth-fieldset">
        <label htmlFor="recover-email" className="auth-label">ایمیل</label>
        <input
          id="recover-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          aria-invalid={Boolean(form.formState.errors.email) || undefined}
          className={`auth-input${form.formState.errors.email ? ' auth-input--invalid' : ''}`}
          {...form.register('email')}
        />
        {form.formState.errors.email?.message ? <span className="auth-error">{form.formState.errors.email.message}</span> : null}
        <span className="auth-helper">اگر این ایمیل در سامانه وجود داشته باشد، کد بازیابی ارسال می‌شود.</span>
      </div>

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ارسال…' : 'ارسال کد بازیابی'}
      </button>
    </form>
  );
}

function VerifyStep({
  email,
  intent,
  cooldownMs,
  invalid,
  helpText,
  onResult,
  onCooldownChange,
  onInvalidChange,
  onBack,
}: {
  email: string;
  intent: FlowIntent;
  cooldownMs: number;
  invalid: boolean;
  helpText: string;
  onResult: (result: AuthResult) => void;
  onCooldownChange: (value: number) => void;
  onInvalidChange: (value: boolean) => void;
  onBack: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const otpRef = useRef<OtpDialPadHandle>(null);
  const [otpCode, setOtpCode] = useState('');
  const canSubmitOtp = otpCode.length === 6 && !isPending;

  const submitCode = (code: string) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('code', code);
      formData.append('intent', intent);
      const result = await verifyOtp(formData);
      onInvalidChange(!result.success);
      if (!result.success) {
        otpRef.current?.focus();
      }
      onResult(result);
    });
  };

  const handleResend = () => {
    if (isPending || cooldownMs > 0) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('intent', intent);
      const result = await resendOtp(formData);
      onInvalidChange(false);
      setOtpCode('');
      onResult(result);
      if (result.success) {
        onCooldownChange(RESEND_COOLDOWN_MS);
      } else if (typeof result.cooldownMs === 'number') {
        onCooldownChange(result.cooldownMs);
      }
    });
  };

  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} className="auth-stage-form">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت
      </button>

      <div className="auth-verify-summary">
        <span className="auth-verify-chip">{INTENT_LABEL[intent]}</span>
        <p className="auth-helper">
          کد برای <span dir="ltr" className="auth-inline-email">{email}</span> ارسال شده است.
        </p>
      </div>

      <div className="auth-fieldset">
        <label htmlFor="otp-input" className="auth-label">کد یک‌بارمصرف</label>
        <OtpDialPad
          ref={otpRef}
          onComplete={submitCode}
          onChange={(value) => {
            setOtpCode(value);
            if (invalid) onInvalidChange(false);
          }}
          invalid={invalid}
          disabled={isPending}
          autoSubmit={false}
          describedBy="otp-help"
        />
        <p id="otp-help" className="auth-helper">{helpText}</p>
      </div>

      <div className="auth-verify-actions">
        <button
          type="button"
          className="auth-cta"
          onClick={() => submitCode(otpCode)}
          disabled={!canSubmitOtp}
          aria-busy={isPending || undefined}
        >
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isPending ? 'در حال تأیید…' : 'تأیید و ادامه'}
        </button>

        <button
          type="button"
          className="auth-cta-secondary"
          onClick={handleResend}
          disabled={isPending || cooldownMs > 0}
          aria-busy={isPending || undefined}
        >
          {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {cooldownMs > 0 ? `ارسال مجدد در ${formatCooldown(cooldownMs)} ثانیه` : 'ارسال دوباره کد'}
        </button>
      </div>
    </form>
  );
}

function SetPasswordStep({
  email,
  resetToken,
  onResult,
  onBack,
}: {
  email: string;
  // 2026-06-24: P0-1. setNewPassword refuses without this. If it's
  // null (e.g. the user refreshed the page), we force them back to
  // re-verify rather than render a form that would 403 on submit.
  resetToken: string | null;
  onResult: (result: AuthResult) => void;
  onBack: () => void;
}) {
  type Values = z.infer<typeof SetPasswordSchema>;
  const form = useForm<Values>({
    resolver: zodResolver(SetPasswordSchema),
    // F6: validate on blur instead of only on submit, so the user
    // sees errors as they fix them rather than after a round-trip.
    mode: 'onBlur',
    defaultValues: {
      email,
      password: '',
    },
  });
  const [isPending, startTransition] = useTransition();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const strength = useMemo(() => scorePassword(value), [value]);
  const busy = isPending || form.formState.isSubmitting;

  const onSubmit: SubmitHandler<Values> = (values) => {
    if (!resetToken) {
      onResult({
        success: false,
        error:
          'نشست بازنشانی منقضی شده است. لطفاً دوباره درخواست کد کنید',
      });
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', values.email);
      formData.append('password', values.password);
      formData.append('resetToken', resetToken);
      const result = await setNewPassword(formData);
      onResult(result);
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="auth-stage-form">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowRight aria-hidden="true" />
        بازگشت
      </button>

      <input type="hidden" {...form.register('email')} />

      <div className="auth-fieldset">
        <label htmlFor="set-password" className="auth-label">رمز عبور جدید</label>
        <div className="auth-input-wrap">
          <input
            id="set-password"
            type={visible ? 'text' : 'password'}
            autoComplete="new-password"
            dir="ltr"
            aria-invalid={Boolean(form.formState.errors.password) || undefined}
            className={`auth-input auth-input--with-action${form.formState.errors.password ? ' auth-input--invalid' : ''}`}
            {...form.register('password', {
              onChange: (event) => {
                setValue(event.target.value);
              },
            })}
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
        {form.formState.errors.password?.message ? <span className="auth-error">{form.formState.errors.password.message}</span> : null}
        {value ? (
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

      <button type="submit" className="auth-cta" disabled={busy} aria-busy={busy || undefined}>
        {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {busy ? 'در حال ثبت…' : 'ثبت رمز جدید'}
      </button>
    </form>
  );
}
