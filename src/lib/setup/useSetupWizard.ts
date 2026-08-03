'use client';

import { createSuperAdmin } from '@/actions/createSuperAdmin';
import * as React from 'react';

import { toAsciiDigits } from '@/lib/setup/format';
import { STEPS, nextStep, previousStep, stepIndex } from '@/lib/setup/steps';
import { toPersianDigits } from './format';
import {
  STEP_FIELDS,
  type SetupFormValues,
  type StepId,
  setupSchema,
  validateStep,
} from './schema';
import { clearDraft, loadDraft, saveDraft, valuesFromDraft } from './storage';

/**
 * useSetupWizard — single source of truth for the wizard state.
 *
 * Extracted from `SetupWizard.tsx` so that the wizard form and the
 * side-panel preview (which both live in `SetupShell`) can share the
 * exact same form state without prop-drilling or context gymnastics.
 *
 * Returns:
 *   - `values`, `step`, `furthest`, `busy`, `serverError`, `completed`,
 *     `hasResume`, `hydrated`
 *   - Setters and callbacks: `setValues`, `handleChange`, `handleBlur`,
 *     `handleStart`, `handleNext`, `handleBack`, `handleJump`,
 *     `handleEditStep`, `handleSubmit`, `handleResetDraft`
 *   - Derived flags: `visibleErrors`, `isStepValid`, `canAdvance`,
 *     `currentStepDef`, `progress`, `fieldSteps`
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

/**
 * Bot protection thresholds.
 *   - MIN_SUBMIT_MS: minimum time the form must be visible before a submit
 *     is accepted. Real users always take longer; bots fill-and-submit in
 *     well under 2 seconds.
 *   - HONEYPOT_FIELD_NAME: a benign-looking field name that real users never
 *     fill (it's hidden off-screen) but naive bots fill automatically.
 *   - SUBMIT_COOLDOWN_MS: minimum gap between consecutive submit attempts.
 *     Prevents accidental double-clicks AND slows down brute-force retries
 *     in concert with the server-side 'auth' rate limiter (10/15m).
 *   - ERROR_COOLDOWN_MS: longer cooldown after a server error, so a bot
 *     cannot probe the endpoint faster than this client-side cap.
 */
const MIN_SUBMIT_MS = 2000;
const HONEYPOT_FIELD_NAME = 'website';
const SUBMIT_COOLDOWN_MS = 3000;
const ERROR_COOLDOWN_MS = 8000;

export interface UseSetupWizard {
  // state
  hydrated: boolean;
  hasResume: boolean;
  values: SetupFormValues;
  touched: Partial<Record<keyof SetupFormValues, true>>;
  step: StepId;
  furthest: StepId;
  busy: boolean;
  serverError: string | null;
  completed: boolean;

  // derived
  visibleErrors: Partial<Record<keyof SetupFormValues, string>>;
  isStepValid: boolean;
  canAdvance: boolean;
  currentStepDef: (typeof STEPS)[number] | undefined;
  progress: number;
  fieldSteps: typeof STEPS;

  // refs
  regionRef: React.MutableRefObject<HTMLFormElement | null>;

  // honeypot (anti-bot)
  honeypot: string;
  setHoneypot: React.Dispatch<React.SetStateAction<string>>;
  /** Name attribute used for the honeypot input. Exposed so SetupWizard
   *  can render a single source-of-truth field name. */
  HONEYPOT_FIELD_NAME: string;

  // callbacks
  handleChange: <K extends keyof SetupFormValues>(key: K, value: string) => void;
  handleBlur: <K extends keyof SetupFormValues>(key: K) => void;
  handleStart: () => void;
  handleNext: () => void;
  handleBack: () => void;
  handleJump: (target: StepId) => void;
  handleEditStep: (target: 'identity' | 'credentials' | 'profile') => void;
  handleSubmit: () => Promise<void>;
  handleResetDraft: () => void;
  handleFormSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  setServerError: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useSetupWizard(): UseSetupWizard {
  const [hydrated, setHydrated] = React.useState(false);
  const [hasResume, setHasResume] = React.useState(false);
  const [values, setValues] = React.useState<SetupFormValues>(DEFAULT_VALUES);
  const [touched, setTouched] = React.useState<Partial<Record<keyof SetupFormValues, true>>>({});
  const [step, setStep] = React.useState<StepId>('intro');
  const [furthest, setFurthest] = React.useState<StepId>('intro');
  const [busy, setBusy] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [completed, setCompleted] = React.useState(false);

  const regionRef = React.useRef<HTMLFormElement | null>(null);

  // Bot protection: honeypot + submit timing. Both are checked at submit
  // time. The honeypot field is rendered off-screen by SetupWizard;
  // timing is measured from the moment the wizard first mounts on the
  // client (mountedAtRef is set in the effect below, so SSR doesn't pin
  // the timestamp to build time).
  const [honeypot, setHoneypot] = React.useState('');
  const mountedAtRef = React.useRef<number>(0);
  const lastSubmitAtRef = React.useRef<number>(0);
  const lastErrorAtRef = React.useRef<number>(0);
  React.useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  // Hydrate from localStorage on mount.
  React.useEffect(() => {
    const draft = loadDraft();
    if (draft?.values) {
      setValues(valuesFromDraft(draft));
      setHasResume(true);
      if (draft.step) setStep(draft.step);
      if (draft.furthest) setFurthest(draft.furthest);
    }
    setHydrated(true);
  }, []);

  // Persist non-secret fields on every change after hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    saveDraft(values, step, furthest);
  }, [hydrated, values, step, furthest]);

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
    if (step === 'intro' || step === 'review') return true;
    const result = validateStep(values, step);
    return result.ok;
  }, [step, values]);

  const canAdvance = !busy && !completed && isStepValid;

  const focusFirstField = React.useCallback(() => {
    requestAnimationFrame(() => {
      const root = regionRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
      );
      focusable?.focus();
    });
  }, []);

  const goTo = React.useCallback(
    (target: StepId) => {
      setStep(target);
      setFurthest((prev) => {
        const prevIdx = stepIndex(prev);
        const nextIdx = stepIndex(target);
        return nextIdx > prevIdx ? target : prev;
      });
      focusFirstField();
    },
    [focusFirstField],
  );

  const handleStart = React.useCallback(() => {
    goTo('identity');
  }, [goTo]);

  const handleNext = React.useCallback(() => {
    if (step === 'intro') {
      goTo('identity');
      return;
    }
    if (!isStepValid) {
      const fields: ReadonlyArray<keyof SetupFormValues> =
        step === 'review' ? [] : (STEP_FIELDS[step] as ReadonlyArray<keyof SetupFormValues>);
      setTouched((prev) => ({
        ...prev,
        ...Object.fromEntries(fields.map((f) => [f, true])),
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
      const targetIdx = stepIndex(target);
      const furthestIdx = stepIndex(furthest);
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

  const handleResetDraft = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        'با این کار همه‌ی اطلاعات واردشده پاک می‌شود و باید از نو شروع کنید. ادامه می‌دهید؟',
      );
      if (!ok) return;
    }
    setValues(DEFAULT_VALUES);
    setTouched({});
    setStep('intro');
    setFurthest('intro');
    setServerError(null);
    clearDraft();
  }, []);

  const handleSubmit = React.useCallback(async () => {
    setTouched(ALL_TOUCHED);

    // ---- Bot protection: honeypot field ----
    // A real user cannot see or interact with this field (visually
    // hidden, tabIndex=-1). If it has a value, the submitter is a bot
    // that fills every input. Bail out with a generic message — never
    // tell the bot that the trap fired.
    if (honeypot.trim() !== '') {
      setServerError('ارسال فرم ناموفق بود. لطفاً دوباره تلاش کنید.');
      return;
    }

    // ---- Bot protection: minimum form-fill time ----
    // Bots typically complete and submit a multi-field form in well under
    // 2 seconds. Reject too-fast submissions with a generic message so
    // the bot cannot fingerprint the check.
    const elapsed =
      mountedAtRef.current > 0 ? Date.now() - mountedAtRef.current : Number.POSITIVE_INFINITY;
    if (elapsed < MIN_SUBMIT_MS) {
      setServerError('لطفاً کمی صبر کنید و دوباره تلاش کنید.');
      return;
    }

    // ---- Rate-limit awareness: submit cooldown ----
    // Hard-cap the gap between two consecutive submit attempts so the
    // server-side 'auth' limiter (10/15m) is never reached via a single
    // user's UI. After an error, the cooldown is even longer to slow
    // down credential-stuffing attempts.
    const now = Date.now();
    const sinceLastSubmit = now - lastSubmitAtRef.current;
    const sinceLastError = now - lastErrorAtRef.current;
    const minGap = sinceLastError < ERROR_COOLDOWN_MS ? ERROR_COOLDOWN_MS : SUBMIT_COOLDOWN_MS;
    if (lastSubmitAtRef.current > 0 && sinceLastSubmit < minGap) {
      const wait = Math.ceil((minGap - sinceLastSubmit) / 1000);
      setServerError(`لطفاً ${toPersianDigits(wait)} ثانیه‌ی دیگر تلاش کنید.`);
      return;
    }
    lastSubmitAtRef.current = now;

    const result = setupSchema.safeParse(values);
    if (!result.success) {
      const failingKey = result.error.issues[0]?.path[0];
      const knownKeys = FIELD_ORDER as readonly string[];
      if (typeof failingKey === 'string' && knownKeys.includes(failingKey)) {
        const failingField = failingKey as keyof SetupFormValues;
        const target = STEPS.find(
          (s) =>
            s.id !== 'review' &&
            s.id !== 'intro' &&
            (STEP_FIELDS[s.id] as readonly string[]).includes(failingField),
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
        clearDraft();
        lastErrorAtRef.current = 0; // reset error tracking on success
      } else {
        setServerError(response.message || 'خطایی در پردازش رخ داد');
        lastErrorAtRef.current = Date.now();
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'خطای غیرمنتظره‌ای رخ داد؛ لطفاً دوباره تلاش کنید.',
      );
      lastErrorAtRef.current = Date.now();
    } finally {
      setBusy(false);
    }
  }, [goTo, values, honeypot]);

  const handleFormSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (step === 'review') void handleSubmit();
      else handleNext();
    },
    [handleNext, handleSubmit, step],
  );

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isField = !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (!isField) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (step === 'intro') handleStart();
        else if (step === 'review') void handleSubmit();
        else if (canAdvance) handleNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canAdvance, handleNext, handleStart, handleSubmit, step]);

  const fieldSteps = React.useMemo(() => STEPS.filter((s) => s.id !== 'intro'), []);
  const fieldIdx = Math.max(0, stepIndex(step) - 1);
  const progress = Math.min(1, Math.max(0, fieldIdx / fieldSteps.length));
  const currentStepDef = STEPS.find((s) => s.id === step);

  return {
    // state
    hydrated,
    hasResume,
    values,
    touched,
    step,
    furthest,
    busy,
    serverError,
    completed,
    // derived
    visibleErrors,
    isStepValid,
    canAdvance,
    currentStepDef,
    progress,
    fieldSteps,
    // refs
    regionRef,
    // honeypot
    honeypot,
    setHoneypot,
    HONEYPOT_FIELD_NAME,
    // callbacks
    handleChange,
    handleBlur,
    handleStart,
    handleNext,
    handleBack,
    handleJump,
    handleEditStep,
    handleSubmit,
    handleResetDraft,
    handleFormSubmit,
    setServerError,
  };
}
