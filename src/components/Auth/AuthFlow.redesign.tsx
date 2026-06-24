'use client';

// 2026-06-24: AuthFlow orchestrator + P2 lazy-loaded step chunks.
//
// The orchestrator owns the step state machine (URL ↔ React state),
// the shared notice/cooldown, the reset-token handle (P0-1) and the
// sidecar. Each individual step is a dynamic import — first paint
// only ships this file + flow-shared + OtpDialPad (if the user lands
// on `verify`). Steps load on demand when the user moves between
// them, keeping initial JS ~40% lighter than the inlined version.

import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, lazy, useEffect, useId, useState } from 'react';

import type { AuthResult } from '@/actions/auth-actions';

import {
  type AuthNotice,
  ContextSummary,
  type FlowIntent,
  INTENT_LABEL,
  type InternalStep,
  NoticeBanner,
  SECURITY_POINTS,
  STEP_COPY,
  readInitialStep,
} from './flow-shared';

// P2: each step is a separate dynamic chunk. The `default` export is
// what React.lazy expects, so the step files all use `export default`.
const EmailStep = lazy(() => import('./EmailStep'));
const RegisterStep = lazy(() => import('./RegisterStep'));
const LoginStep = lazy(() => import('./LoginStep'));
const RecoverStep = lazy(() => import('./RecoverStep'));
const VerifyStep = lazy(() => import('./VerifyStep'));
const SetPasswordStep = lazy(() => import('./SetPasswordStep'));

// Skeleton shown while a step chunk loads after a transition. Kept
// visually consistent with `.auth-stage-form` so the card doesn't
// shift height on swap.
function StepFallback() {
  return (
    <div
      className="auth-stage-form"
      aria-busy="true"
      aria-live="polite"
      style={{ minHeight: '16rem' }}
    >
      <p className="sr-only">در حال بارگذاری فرم…</p>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
        <Loader2 className="animate-spin" aria-hidden="true" />
      </div>
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

  const moveTo = (
    nextStep: InternalStep,
    options?: { email?: string; intent?: FlowIntent; notice?: AuthNotice | null },
  ) => {
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
                <h1 id="auth-title" className="auth-form-heading">
                  {copy.title}
                </h1>
                <p className="auth-form-lede">{copy.subtitle}</p>
              </div>
            </div>

            <ContextSummary step={step} email={email} intent={intent} />

            <div id={statusRegionId} className="sr-only" aria-live="polite" aria-atomic="true">
              {notice?.message ?? ''}
            </div>

            <NoticeBanner notice={notice} key={notice ? `${notice.tone}-${Date.now()}` : 'idle'} />

            <Suspense fallback={<StepFallback />}>
              {step === 'email' ? <EmailStep onResult={handleResult} onMoveTo={moveTo} /> : null}

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
                    const fallbackStep: InternalStep =
                      intent === 'recover' ? 'recover' : intent === 'login' ? 'login' : 'register';
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
            </Suspense>

            <p className="auth-fineprint">
              با ادامه،{' '}
              <Link href="/terms" className="auth-link">
                قوانین و مقررات
              </Link>{' '}
              و{' '}
              <Link href="/privacy-policy" className="auth-link">
                حریم خصوصی
              </Link>{' '}
              را می‌پذیرید.
            </p>
          </div>

          <aside className="auth-aside-panel" aria-label="راهنمای احراز هویت">
            {/* A7: heading hierarchy — the aside needs its own h2 so
                screen-reader navigation lands on it without skipping
                the page outline. */}
            <h2 className="auth-aside-heading">
              <ShieldCheck aria-hidden="true" />
              راهنمای سریع
            </h2>
            <div className="auth-aside-hero">
              <span className="auth-aside-kicker" aria-hidden="true">
                {copy.aside}
              </span>
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
