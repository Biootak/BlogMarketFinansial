'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, lazy, useEffect, useId, useState } from 'react';

import type { AuthResult } from '@/actions/auth-actions';

import {
  type AuthNotice,
  type FlowIntent,
  type InternalStep,
  NoticeBanner,
  STEP_COPY,
  readInitialStep,
} from './flow-shared';

const EmailStep       = lazy(() => import('./EmailStep'));
const RegisterStep    = lazy(() => import('./RegisterStep'));
const LoginStep       = lazy(() => import('./LoginStep'));
const RecoverStep     = lazy(() => import('./RecoverStep'));
const VerifyStep      = lazy(() => import('./VerifyStep'));
const SetPasswordStep = lazy(() => import('./SetPasswordStep'));

// Step → pill index (0-based) for the dot indicator
const STEP_DOT: Record<InternalStep, number> = {
  email:          0,
  register:       1,
  login:          1,
  recover:        1,
  verify:         2,
  'set-password': 2,
};
const DOT_COUNT = 3;

function StepFallback() {
  return (
    <div className="auth-stage-form" aria-busy="true" style={{ minHeight: '12rem' }}>
      <p className="sr-only">در حال بارگذاری…</p>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
        <Loader2 className="animate-spin" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function AuthFlow() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const initialStep   = readInitialStep(searchParams.get('step'), searchParams.get('intent'));
  const initialEmail  = searchParams.get('email') ?? '';
  const initialIntent = searchParams.get('intent');
  const callbackUrl   = searchParams.get('callbackUrl');

  const [step,   setStep]   = useState<InternalStep>(initialStep);
  const [email,  setEmail]  = useState(initialEmail);
  const [intent, setIntent] = useState<FlowIntent>(
    initialIntent === 'login' || initialIntent === 'reverify' || initialIntent === 'recover'
      ? initialIntent : 'register',
  );
  const [notice,     setNotice]     = useState<AuthNotice | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [otpInvalid, setOtpInvalid] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const liveId  = useId();
  const copy    = STEP_COPY[step];
  const dotIdx  = STEP_DOT[step];

  useEffect(() => {
    if (cooldownMs <= 0) return;
    const t = window.setInterval(
      () => setCooldownMs((c) => (c > 1000 ? c - 1000 : 0)),
      1000,
    );
    return () => clearInterval(t);
  }, [cooldownMs]);

  const syncUrl = (s: InternalStep, e: string, i: FlowIntent) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('step', s);
    if (e) p.set('email', e); else p.delete('email');
    if (s === 'email') p.delete('intent'); else p.set('intent', i);
    router.replace(`/auth?${p.toString()}`, { scroll: false });
  };

  const moveTo = (
    next: InternalStep,
    opts?: { email?: string; intent?: FlowIntent; notice?: AuthNotice | null },
  ) => {
    const ne = opts?.email  ?? email;
    const ni = opts?.intent ?? intent;
    setStep(next);
    setEmail(ne);
    setIntent(ni);
    if (opts && 'notice' in opts) setNotice(opts.notice ?? null);
    if (next !== 'set-password') setResetToken(null);
    syncUrl(next, ne, ni);
  };

  const handleResult = (result: AuthResult) => {
    if (!result.success) {
      setNotice({ tone: 'error', message: result.error });
      if (typeof result.cooldownMs === 'number') setCooldownMs(result.cooldownMs);
      return;
    }
    const ne = result.email  ?? email;
    const ni = (result.intent ?? intent) as FlowIntent;
    setEmail(ne);
    setIntent(ni);
    if (typeof result.resetToken === 'string') setResetToken(result.resetToken);
    setNotice({ tone: 'success', message: result.message });

    if (result.redirect) {
      const dest = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl : result.redirect;
      router.push(dest);
      return;
    }
    if (result.step) {
      moveTo(result.step as InternalStep, {
        email: ne, intent: ni,
        notice: { tone: 'success', message: result.message },
      });
    }
  };

  return (
    <section className="auth-card" aria-labelledby="auth-heading">
      <div className="auth-card-inner">

        {/* ── Step dots ── */}
        <div className="auth-step-dots" aria-hidden="true">
          {Array.from({ length: DOT_COUNT }).map((_, i) => (
            <span
              key={i}
              className="auth-step-dot"
              aria-current={i === dotIdx ? 'true' : undefined}
            />
          ))}
        </div>

        {/* ── Header ── */}
        <div className="auth-shell-band">
          <p className="auth-shell-eyebrow">{copy.eyebrow}</p>
          <div className="auth-card-header">
            <h1 id="auth-heading" className="auth-form-heading">{copy.title}</h1>
            <p className="auth-form-lede">{copy.subtitle}</p>
          </div>
        </div>

        {/* ── SR live region ── */}
        <div id={liveId} className="sr-only" aria-live="polite" aria-atomic="true">
          {notice?.message ?? ''}
        </div>

        {/* ── Notices ── */}
        <NoticeBanner
          notice={notice}
          key={notice ? `${notice.tone}-${Date.now()}` : 'idle'}
        />

        {/* ── Step content ── */}
        <Suspense fallback={<StepFallback />}>
          {step === 'email' && (
            <EmailStep onResult={handleResult} onMoveTo={moveTo} />
          )}
          {step === 'register' && (
            <RegisterStep
              initialEmail={email}
              onResult={handleResult}
              onBack={() => moveTo('email', { notice: null, intent: 'register' })}
            />
          )}
          {step === 'login' && (
            <LoginStep
              initialEmail={email}
              onResult={handleResult}
              onRecover={() => moveTo('recover', { notice: null, intent: 'recover' })}
              onBack={() => moveTo('email', { notice: null, intent: 'login' })}
            />
          )}
          {step === 'recover' && (
            <RecoverStep
              initialEmail={email}
              onResult={handleResult}
              onBack={() => moveTo('login', { notice: null, intent: 'login' })}
            />
          )}
          {step === 'verify' && (
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
                const fallback: InternalStep =
                  intent === 'recover' ? 'recover'
                  : intent === 'login'   ? 'login'
                  : 'register';
                moveTo(fallback, { notice: null, intent });
              }}
            />
          )}
          {step === 'set-password' && (
            <SetPasswordStep
              email={email}
              resetToken={resetToken}
              onResult={handleResult}
              onBack={() => {
                setResetToken(null);
                moveTo('verify', { notice: null, intent: 'recover' });
              }}
            />
          )}
        </Suspense>

        {/* ── Fine print ── */}
        <p className="auth-fineprint">
          با ادامه،{' '}
          <Link href="/terms" className="auth-link">قوانین</Link>
          {' '}و{' '}
          <Link href="/privacy-policy" className="auth-link">حریم خصوصی</Link>
          {' '}را می‌پذیرید.
        </p>
      </div>
    </section>
  );
}
