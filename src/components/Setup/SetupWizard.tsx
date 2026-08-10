'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { StepId } from '@/lib/setup/schema';
import { useSetupWizard } from '@/lib/setup/useSetupWizard';

import { IntroStep } from './IntroStep';
import { SetupComplete } from './SetupComplete';
import { SetupSidePanel } from './SetupSidePanel';
import { StepCredentials } from './StepCredentials';
import { StepHeader } from './StepHeader';
import { StepIdentity } from './StepIdentity';
import { StepIndicator } from './StepIndicator';
import { StepProfile } from './StepProfile';
import { StepReview } from './StepReview';
import { ArrowLeftGlyph, ArrowRightGlyph, SaveGlyph, ShieldCheckGlyph } from './WizardIcons';

/** Map a step id to its canonical URL. `intro` lives at `/setup`; every
 *  other step is a real sub-route (`/setup/identity`, …). In activation
 *  mode the invite token rides in the query string so it survives
 *  navigation between the real sub-routes. */
export function stepPath(step: StepId, token?: string | null): string {
  const base = step === 'intro' ? '/setup' : `/setup/${step}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

/**
 * SetupWizard — view layer of the first-run super-admin bootstrap.
 *
 * All state, persistence, and validation live in `useSetupWizard`. This
 * component is purely presentational; it owns layout, the form chrome,
 * and routing between steps.
 *
 * The current step is a prop supplied by the route (`/setup` or
 * `/setup/[step]`) — the URL is the source of truth, so every step can be
 * deep-linked, refreshed, and shared. Navigation pushes the target step's
 * sub-route via `stepPath`.
 *
 * Three layout modes:
 *   1. intro       — full-width welcome with a single CTA
 *   2. form steps  — split layout: form (left) + live preview (right) on
 *                    desktop, stacked on mobile
 *   3. completed   — full-width success seal with confetti
 *
 * The side panel is only rendered during form steps because the preview
 * has no useful content during intro or after completion.
 */
export function SetupWizard({
  step,
  activation = null,
}: {
  step: StepId;
  /** Invite-based handover — set when the owner opened a valid `?token=` link. */
  activation?: { email: string; token: string } | null;
}) {
  const router = useRouter();
  const token = activation?.token ?? null;

  const onStepChange = (target: StepId) => {
    router.push(stepPath(target, token));
  };

  const w = useSetupWizard({ step, onStepChange, activation });

  // Activation mode never shows the intro: the owner lands directly on the
  // identity step (the /setup route redirects). Defensive fallback in case
  // someone deep-links /setup?token=… straight to a stale render.
  useEffect(() => {
    if (w.activationMode && w.step === 'intro' && token) {
      router.replace(`/setup/identity?token=${encodeURIComponent(token)}`);
    }
  }, [w.activationMode, w.step, token, router]);

  if (w.completed) {
    return <SetupComplete email={w.values.email} onContinue={() => router.push('/auth')} />;
  }

  if (w.step === 'intro' && !w.activationMode) {
    return (
      <div className="setup-wizard setup-wizard--solo">
        <IntroStep onStart={w.handleStart} hasResume={w.hasResume} />
        {w.hasResume ? (
          <div className="setup-wizard__resume">
            <SaveGlyph className="setup-wizard__resume-glyph" />
            <span>پیش‌نویس شما به‌طور خودکار ذخیره شده و با انتخاب «ادامه» بارگذاری می‌شود.</span>
            <button
              type="button"
              onClick={w.handleResetDraft}
              className="setup-wizard__resume-reset"
            >
              شروع از نو
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="setup-shell">
      <div className="setup-shell__main">
        <div className="setup-wizard">
          <div className="setup-wizard__stepper">
            <StepIndicator current={w.step} furthestReached={w.furthest} onJump={w.handleJump} />
          </div>

          <form
            ref={w.regionRef}
            className="setup-wizard__form"
            onSubmit={w.handleFormSubmit}
            noValidate
            aria-label="فرم ایجاد مالک سامانه"
          >
            {/* Honeypot — hidden from real users (visually clipped, tabIndex=-1,
                aria-hidden). Naive bots fill every input they find, including
                this one; if it's non-empty at submit time, we silently reject.
                See useSetupWizard.ts for the check. */}
            <div className="setup-honeypot" aria-hidden="true">
              <label htmlFor="setup-honeypot-website">{w.HONEYPOT_FIELD_NAME}</label>
              <input
                id="setup-honeypot-website"
                type="text"
                name={w.HONEYPOT_FIELD_NAME}
                tabIndex={-1}
                autoComplete="off"
                value={w.honeypot}
                onChange={(e) => w.setHoneypot(e.target.value)}
              />
            </div>

            <section
              key={w.step}
              className="setup-wizard__region"
              aria-live="polite"
              aria-label={w.currentStepDef?.title ?? ''}
            >
              {w.currentStepDef ? (
                <StepHeader step={w.currentStepDef} progress={w.progress} />
              ) : null}

              {w.step === 'identity' ? (
                <StepIdentity
                  values={w.values}
                  errors={w.visibleErrors}
                  onChange={w.handleChange}
                  onBlur={w.handleBlur}
                  emailLocked={w.activationMode}
                />
              ) : null}

              {w.step === 'credentials' ? (
                <StepCredentials
                  values={w.values}
                  errors={w.visibleErrors}
                  onChange={w.handleChange}
                  onBlur={w.handleBlur}
                />
              ) : null}

              {w.step === 'profile' ? (
                <StepProfile
                  values={w.values}
                  errors={w.visibleErrors}
                  onChange={w.handleChange}
                  onBlur={w.handleBlur}
                />
              ) : null}

              {w.step === 'review' ? (
                <StepReview values={w.values} onEditStep={w.handleEditStep} />
              ) : null}

              {w.serverError ? (
                <p className="setup-wizard__server-error" role="alert" aria-live="assertive">
                  {w.serverError}
                </p>
              ) : null}
            </section>

            <footer className="setup-wizard__footer">
              <button
                type="button"
                onClick={w.handleBack}
                disabled={w.step === 'identity' || w.busy}
                className="setup-wizard__nav setup-wizard__nav--ghost"
              >
                <ArrowRightGlyph className="setup-wizard__nav-glyph" />
                <span>مرحله‌ی قبل</span>
              </button>

              <div className="setup-wizard__cta">
                {w.step === 'review' ? (
                  <button
                    type="submit"
                    disabled={w.busy}
                    className="setup-wizard__nav setup-wizard__nav--primary"
                    aria-busy={w.busy}
                  >
                    <span>{w.busy ? 'در حال ایجاد حساب…' : 'ایجاد حساب مالک'}</span>
                    {!w.busy ? (
                      <ShieldCheckGlyph className="setup-wizard__nav-glyph" />
                    ) : (
                      <span className="setup-wizard__spinner" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={w.busy}
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

          {w.hydrated && w.lastSavedAt > 0 ? (
            <output className="setup-wizard__autosave" aria-live="polite">
              <SaveGlyph className="setup-wizard__autosave-glyph" />
              <span>پیش‌نویس به‌صورت خودکار ذخیره شد</span>
            </output>
          ) : null}
        </div>
      </div>

      <div className="setup-shell__aside" aria-hidden={false}>
        <SetupSidePanel values={w.values} step={w.step} />
      </div>
    </div>
  );
}
