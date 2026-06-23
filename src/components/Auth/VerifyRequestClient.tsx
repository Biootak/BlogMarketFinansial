'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Info, Loader2 } from 'lucide-react';

import OtpDialPad, { type OtpDialPadHandle } from '@/components/Auth/OtpDialPad';

const RESEND_COOLDOWN_MS = 60_000;

export default function VerifyRequestClient() {
  const router = useRouter();
  const search = useSearchParams();
  const email = (search.get('email') ?? '').trim();
  const rawIntent = search.get('intent');
  const intent: 'register' | 'login' | 'reverify' | 'recover' =
    rawIntent === 'login' || rawIntent === 'reverify' || rawIntent === 'recover'
      ? rawIntent
      : 'register';
  const redirect = search.get('redirect') || '/dashboard';

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState<number>(RESEND_COOLDOWN_MS);
  const [invalid, setInvalid] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const dialRef = useRef<OtpDialPadHandle>(null);
  const statusId = useId();

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const id = window.setInterval(() => {
      setCooldownMs((c) => (c > 0 ? c - 1000 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownMs]);

  const submitCode = (code: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('email', email);
      fd.append('code', code);
      fd.append('intent', intent);
      const { verifyOtp } = await import('@/actions/auth-actions');
      const result = await verifyOtp(fd);
      if (!result.success) {
        setErrorMsg(result.error ?? 'کد نامعتبر است.');
        setInvalid(true);
        dialRef.current?.clear();
        window.setTimeout(() => setInvalid(false), 600);
        if (typeof result.cooldownMs === 'number') {
          setCooldownMs(result.cooldownMs);
        }
        return;
      }
      setStatusMsg('تأیید شد. در حال انتقال…');
      router.push(redirect);
    });
  };

  const onResend = () => {
    if (cooldownMs > 0 || isPending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append('email', email);
      fd.append('intent', intent);
      const { resendOtp } = await import('@/actions/auth-actions');
      const result = await resendOtp(fd);
      if (result.success) {
        setStatusMsg('کد دوباره ارسال شد.');
        setErrorMsg(null);
        setCooldownMs(RESEND_COOLDOWN_MS);
      } else {
        setErrorMsg(result.error ?? 'ارسال مجدد ناموفق بود.');
        if (typeof result.cooldownMs === 'number') {
          setCooldownMs(result.cooldownMs);
        }
      }
    });
  };

  const remainingSec = Math.ceil(cooldownMs / 1000);
  const resendLabel = cooldownMs > 0
    ? `ارسال مجدد در ${remainingSec.toLocaleString('fa-IR')} ثانیه`
    : 'ارسال مجدد کد';

  const busy = isPending;

  return (
    <div className="auth-card auth-fade-in">
      <div className="auth-card-inner">
        <div className="auth-card-header">
          <p className="auth-form-lede" style={{ textTransform: 'uppercase', fontSize: 'var(--ds-text-xs)', letterSpacing: '0.12em', fontWeight: 600, color: 'oklch(60% 0.02 240)' }}>
            تأیید ایمیل
          </p>
          <h1 className="auth-form-heading">کد یک‌بار مصرف را وارد کنید</h1>
          <p className="auth-form-lede">
            کد شش‌رقمی به <span dir="ltr" style={{ fontWeight: 600 }}>{email || '—'}</span> ارسال شد.
          </p>
        </div>

        <p id={statusId} aria-live="polite" className="sr-only">
          {errorMsg ?? statusMsg ?? ''}
        </p>

        <form noValidate onSubmit={(e) => e.preventDefault()} className="auth-tabpanel">
          <div className="auth-fieldset">
            <label htmlFor="otp-input" className="auth-label">کد یک‌بار مصرف</label>
            <OtpDialPad
              ref={dialRef}
              onComplete={submitCode}
              invalid={invalid}
              disabled={busy}
              describedBy={`${statusId}-helper`}
            />
            <p id={`${statusId}-helper`} className="auth-helper">
              پس از وارد کردن شش رقم، به صورت خودکار تأیید می‌شود.
            </p>
          </div>

          <button
            type="button"
            className="auth-cta-secondary"
            onClick={onResend}
            disabled={busy || cooldownMs > 0}
            aria-busy={busy || undefined}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {busy ? 'در حال ارسال…' : resendLabel}
          </button>
        </form>

        <p className="auth-fineprint">
          آدرس اشتباه است؟{' '}
          <Link href="/auth" className="auth-link">بازگشت به ورود</Link>
        </p>

        {(statusMsg || errorMsg) && (
          <p aria-hidden="true" className={errorMsg ? 'auth-alert' : 'auth-notice'}>
            {errorMsg ? <AlertCircle aria-hidden="true" /> : <Info aria-hidden="true" />}
            <span>{errorMsg ?? statusMsg}</span>
          </p>
        )}
      </div>
    </div>
  );
}
