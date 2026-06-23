'use client';

import type React from 'react';

// 2026-06-23: production-grade segmented progress bar.
//
// Maps the 6 internal sub-steps onto 4 logical phases so the user sees
// a steady, non-fragmented bar. role="progressbar" + aria-valuenow are
// required by WCAG 2.2 SC 1.3.1 + 4.1.2 for any element that conveys
// progress.

export type AuthPhase = 'identify' | 'authenticate' | 'verify' | 'finalize';

export type InternalStep =
  | 'email'
  | 'register'
  | 'login'
  | 'verify'
  | 'recover'
  | 'set-password';

const PHASE_BY_STEP: Record<InternalStep, AuthPhase> = {
  email: 'identify',
  register: 'authenticate',
  login: 'authenticate',
  verify: 'verify',
  recover: 'verify',
  'set-password': 'finalize',
};

const PHASE_ORDER: AuthPhase[] = [
  'identify',
  'authenticate',
  'verify',
  'finalize',
];

const PHASE_LABEL: Record<AuthPhase, string> = {
  identify: 'شناسایی',
  authenticate: 'ورود',
  verify: 'تأیید',
  finalize: 'تکمیل',
};

interface StepProgressProps {
  step: InternalStep;
  id?: string;
}

export default function StepProgress({ step, id }: StepProgressProps) {
  const phase = PHASE_BY_STEP[step];
  const activeIdx = PHASE_ORDER.indexOf(phase);
  const fraction = (activeIdx + 1) / PHASE_ORDER.length;
  const ariaLabel = `مرحلهٔ ${activeIdx + 1} از ${PHASE_ORDER.length}: ${PHASE_LABEL[phase]}`;

  return (
    <div
      id={id}
      className="space-y-2"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={PHASE_ORDER.length}
      aria-valuenow={activeIdx + 1}
      aria-valuetext={`${PHASE_LABEL[phase]} (${activeIdx + 1} از ${PHASE_ORDER.length})`}
    >
      <div className="auth-progress" aria-hidden="true">
        <div
          className="auth-progress__indicator"
          style={{ width: `${(fraction * 100).toFixed(2)}%` }}
        />
      </div>
      <ol className="flex justify-between text-[0.7rem] text-neutral-500 dark:text-neutral-400">
        {PHASE_ORDER.map((p, i) => (
          <li
            key={p}
            className={
              i <= activeIdx
                ? 'font-medium text-neutral-900 dark:text-neutral-100'
                : ''
            }
          >
            <span aria-hidden="true">{i + 1}</span>
            <span className="sr-only">. </span>
            <span>{PHASE_LABEL[p]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
