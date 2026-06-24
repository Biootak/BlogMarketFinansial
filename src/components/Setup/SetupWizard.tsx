'use client';

import { createSuperAdmin } from '@/actions/createSuperAdmin';
import {
  STEP_FIELDS,
  type SetupFormValues,
  type StepId,
  setupSchema,
  validateStep,
} from '@/lib/setup/schema';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { toAsciiDigits } from '@/lib/setup/format';
import { STEPS, nextStep, previousStep } from '@/lib/setup/steps';
import { SetupComplete } from './SetupComplete';
import { StepCredentials } from './StepCredentials';
import { StepIdentity } from './StepIdentity';
import { StepIndicator } from './StepIndicator';
import { StepProfile } from './StepProfile';
import { StepReview } from './StepReview';
import { ArrowLeftGlyph, ArrowRightGlyph, ShieldCheckGlyph } from './WizardIcons';

/**
 * SetupWizard — orchestrator for the first-run super-admin bootstrap.
 *
 * State shape:
 *   - `values`    : the seven SetupFormValues fields, all strings
 *   - `touched`   : set of field names the user has interacted with
 *   - `step`      : current wizard step
 *   - `furthest`  : the deepest step the user has reached (enables back-nav)
 *   - `busy`      : true while the server action is in flight
 *   - `serverError`: a friendly message returned by the server
 *   - `completed` : once true, render SetupComplete instead of the wizard
 *
 * Validation policy:
 *   - Errors for a field are only surfaced AFTER the field is touched
 *   - Auto-validates the full form on the review step (already passed
 *     step validation by definition)
 *   - Submission always re-validates server-side; client errors are UX
 *     sugar, never a security boundary
 */

const DEFAULT_VALUES: SetupFormValues = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  jobName: '',
  company: '',
  bio: '',
};

const FIELD_ORDER: Array<keyof SetupFormValues> = [
  'name',
  'email',
  'password',
  'phoneNumber',
  'jobName',
  'company',
  'bio',
];

const ALL_TOUCHED: Record<keyof SetupFormValues, true> = FIELD_ORDER.reduce(
  (acc, key) => {
    acc[key] = true;
    return acc;
  },
  {} as Record<keyof SetupFormValues, true>,
);

function fieldsForStep(step: StepId): ReadonlyArray<keyof SetupFormValues> {
  if (step === 'review') return [];
  return STEP_FIELDS[step];
}

export function SetupWizard() {
  const router = useRouter();

  const [values, setValues] = React.useState<SetupFormValues>(DEFAULT_VALUES);
  const [touched, setTouched] = React.useState<Partial<Record<keyof SetupFormValues, true>>>({});
  const [step, setStep] = React.useState<StepId>('identity');
  const [furthest, setFurthest] = React.useState<StepId>('identity');
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(false);

  const firstFieldRef = React.useRef<HTMLInputElement | null>(null);
  const regionRef = React.useRef<HTMLFormElement | null>(null);
  // Note: firstFieldRef is no longer threaded through Field (ref-forwarding
  // would require a wider Ref<T> declaration); we rely on regionRef +
  // focusFirstField's querySelector fallback for accessibility.
  void firstFieldRef;

  // Stable callbacks for the controlled fields
  const handleChange = React.useCallback(
    <K extends keyof SetupFormValues>(key: K, value: string) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setServerError(null);
    },
    [],
  );

  const handleBlur = React.useCallback(<K extends keyof SetupFormValues>(key: K) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  // Compute per-step errors using the shared schema. Only show errors for
  // touched fields — the wizard should feel encouraging, not punishing.
  const visibleErrors = React.useMemo(() => {
    const out: Partial<Record<keyof SetupFormValues, string>> = {};
    for (const key of FIELD_ORDER) {
      if (!touched[key]) continue;
      const result = setupSchema.shape[key].safeParse(values[key]);
      if (!result.success) {
        out[key] = result.error.issues[0]?.message ?? 'مقدار نامعتبر';
      }
    }
    return out;
  }, [touched, values]);

  const isStepValid = React.useMemo(() => {
    if (step === 'review') return true;
    const result = validateStep(values, step);
    return result.ok;
  }, [step, values]);

  const canAdvance = !busy && !completed && isStepValid;

  const focusFirstField = React.useCallback((_target: StepId) => {
    // Allow the transition animation to start before yanking focus.
    requestAnimationFrame(() => {
      const root = regionRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
      );
      focusable?.focus();
    });
  }, []);

  const goTo = React.useCallback(
    (target: StepId) => {
      setStep(target);
      setFurthest((prev) => {
        const prevIdx = STEPS.findIndex((s) => s.id === prev);
        const nextIdx = STEPS.findIndex((s) => s.id === target);
        return nextIdx > prevIdx ? target : prev;
      });
      focusFirstField(target);
    },
    [focusFirstField],
  );

  const handleNext = React.useCallback(() => {
    if (!isStepValid) {
      // Force-validate the current step by marking every field touched.
      setTouched((prev) => ({
        ...prev,
        ...Object.fromEntries(fieldsForStep(step).map((f) => [f, true])),
      }));
      return;
    }
    const next = nextStep(step);
    if (next) goTo(next);
  }, [goTo, isStepValid, step]);

  const handleBack = React.useCallback(() => {
    const prev = previousStep(step);
    if (prev) goTo(prev);
  }, [goTo, step]);

  const handleJump = React.useCallback(
    (target: StepId) => {
      // Only allow jumping to steps already reached
      const targetIdx = STEPS.findIndex((s) => s.id === target);
      const furthestIdx = STEPS.findIndex((s) => s.id === furthest);
      if (targetIdx > furthestIdx) return;
      goTo(target);
    },
    [furthest, goTo],
  );

  const handleEditStep = React.useCallback(
    (target: 'identity' | 'credentials' | 'profile') => {
      goTo(target);
    },
    [goTo],
  );

  const handleSubmit = React.useCallback(async () => {
    // Re-validate the full payload server-side is mandatory, but we also
    // gate the submission client-side so the user gets instant feedback.
    setTouched(ALL_TOUCHED);

    const result = setupSchema.safeParse(values);
    if (!result.success) {
      // Jump back to the first step that has an error so the user can
      // fix it without scrolling back through every field.
      const failingKey = result.error.issues[0]?.path[0];
      const knownKeys = FIELD_ORDER as ReadonlyArray<string>;
      if (typeof failingKey === 'string' && knownKeys.includes(failingKey)) {
        const failingField = failingKey as keyof SetupFormValues;
        const target = STEPS.find(
          (s) =>
            s.id !== 'review' &&
            (STEP_FIELDS[s.id] as ReadonlyArray<string>).includes(failingField),
        );
        if (target) {
          goTo(target.id);
          return;
        }
      }
      return;
    }

    try {
      setBusy(true);
      setServerError(null);

      const formData = new FormData();
      // Always send ASCII digits to the server; the action expects ASCII.
      const payload = {
        ...result.data,
        phoneNumber: toAsciiDigits(result.data.phoneNumber),
      };
      for (const [key, value] of Object.entries(payload)) {
        formData.append(key, value);
      }

      const response = await createSuperAdmin(formData);
      if (response.success) {
        setCompleted(true);
      } else {
        setServerError(response.message || 'خطایی در پردازش رخ داد');
      }
    } catch (err) {
      // Server actions should never throw to the client, but we still
      // surface a friendly fallback if something unexpected happens.
      setServerError(
        err instanceof Error ? err.message : 'خطای غیرمنتظره‌ای رخ داد؛ لطفاً دوباره تلاش کنید.',
      );
    } finally {
      setBusy(false);
    }
  }, [goTo, values]);

  // Keyboard shortcuts: Cmd/Ctrl+Enter advances or submits; Enter on a
  // password field reveals feedback without committing to advance.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isField = !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (!isField) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (step === 'review') handleSubmit();
        else if (canAdvance) handleNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canAdvance, handleNext, handleSubmit, step]);

  if (completed) {
    return <SetupComplete email={values.email} onContinue={() => router.push('/signin')} />;
  }

  return (
    <div className="setup-wizard">
      <header className="setup-wizard__header">
        <span className="setup-wizard__eyebrow">
          <ShieldCheckGlyph className="setup-wizard__eyebrow-glyph" />
          <span>پیکربندی اولیه‌ی سامانه</span>
        </span>
        <h1 className="setup-wizard__title">
          ایجاد حساب <span className="setup-wizard__title-accent">مدیر اصلی</span>
        </h1>
        <p className="setup-wizard__subtitle">
          چهار مرحله‌ی کوتاه برای فعال‌سازی سامانه. تمام داده‌ها به‌صورت رمزنگاری‌شده ارسال می‌شوند.
        </p>
      </header>

      <div className="setup-wizard__stepper">
        <StepIndicator current={step} furthestReached={furthest} onJump={handleJump} />
      </div>

      <form
        ref={regionRef}
        className="setup-wizard__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 'review') handleSubmit();
          else handleNext();
        }}
        noValidate
        aria-label="فرم ایجاد مدیر اصلی"
      >
        {/* Per-step content lives in a keyed region so screen readers
            re-announce the step on change. */}
        <section
          key={step}
          className="setup-wizard__region"
          aria-live="polite"
          aria-label={`${STEPS.find((s) => s.id === step)?.title ?? ''}`}
        >
          {step === 'identity' ? (
            <StepIdentity
              values={values}
              errors={visibleErrors}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          ) : null}

          {step === 'credentials' ? (
            <StepCredentials
              values={values}
              errors={visibleErrors}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          ) : null}

          {step === 'profile' ? (
            <StepProfile
              values={values}
              errors={visibleErrors}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          ) : null}

          {step === 'review' ? <StepReview values={values} onEditStep={handleEditStep} /> : null}

          {serverError ? (
            <p className="setup-wizard__server-error" role="alert" aria-live="assertive">
              {serverError}
            </p>
          ) : null}
        </section>

        <footer className="setup-wizard__footer">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 'identity' || busy}
            className="setup-wizard__nav setup-wizard__nav--ghost"
          >
            <ArrowRightGlyph className="setup-wizard__nav-glyph" />
            <span>مرحله‌ی قبل</span>
          </button>

          <div className="setup-wizard__cta">
            {step === 'review' ? (
              <button
                type="submit"
                disabled={busy}
                className="setup-wizard__nav setup-wizard__nav--primary"
                aria-busy={busy}
              >
                <span>{busy ? 'در حال ایجاد حساب…' : 'ایجاد حساب مدیر اصلی'}</span>
                {!busy ? (
                  <ShieldCheckGlyph className="setup-wizard__nav-glyph" />
                ) : (
                  <span className="setup-wizard__spinner" aria-hidden="true" />
                )}
              </button>
            ) : (
              <button
                type="submit"
                disabled={busy}
                className="setup-wizard__nav setup-wizard__nav--primary"
              >
                <span>ادامه</span>
                <ArrowLeftGlyph className="setup-wizard__nav-glyph" />
              </button>
            )}
            <span className="setup-wizard__hint">
              <kbd>⌘</kbd>
              <span>+</span>
              <kbd>Enter</kbd>
              <span className="setup-wizard__hint-text">برای ادامه / ارسال</span>
            </span>
          </div>
        </footer>
      </form>
    </div>
  );
}
