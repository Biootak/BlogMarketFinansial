'use client';

import { activateOwner } from '@/actions/activateOwner';
import { createSuperAdmin } from '@/actions/createSuperAdmin';
import { useSetupStore } from '@/hooks/setupStore';
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
 * The current step is NOT owned here — it lives in the URL so every step
 * is a real sub-route of `/setup` (e.g. `/setup/credentials`) that can be
 * deep-linked, refreshed, and bookmarked. The caller passes `step` (parsed
 * from the route) and `onStepChange` (which navigates to the step's URL).
 *
 * All mutable state (values, touched, furthest, submit flags) lives in the
 * module-level `setupStore`. Next.js remounts the page component when the
 * path changes between sub-routes, so component-local state would be wiped
 * on every step transition — losing the password (deliberately never
 * persisted to the draft). The store survives remounts for the page session.
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

/**
 * Anti-bot timing refs live at module scope, not in component state: the
 * wizard remounts on every sub-route navigation, and a remount must not
 * reset the "time visible" clock or let a bot re-submit immediately after
 * a step change.
 */
let mountedAtMs = 0;
let lastSubmitAtMs = 0;
let lastErrorAtMs = 0;

export interface UseSetupWizardOptions {
  /**
   * The step currently shown — owned by the URL (/setup/[step]).
   * `'intro'` maps to `/setup`, the rest to `/setup/<step>`.
   */
  step: StepId;
  /**
   * Called whenever the wizard wants to move to another step. The caller
   * navigates to the step's sub-route (see SetupWizard).
   */
  onStepChange: (step: StepId) => void;
  /**
   * Invite-based owner handover. When present, the wizard runs in
   * activation mode: the email is locked to the invited address, the intro
   * step is skipped (the owner lands directly on the identity step), and
   * submitting calls `activateOwner` (single-use token) instead of
   * `createSuperAdmin`. Draft resume is disabled so a stale bootstrap draft
   * can never clobber the activation session.
   */
  activation?: { email: string; token: string } | null;
}

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

  // activation (invite-based handover)
  activationMode: boolean;
  /** Locked email from the invite — read-only in the identity step. */
  activationEmail: string | null;
  /** Invite token threaded through the URL for the submit action. */
  activationToken: string | null;

  // derived
  visibleErrors: Partial<Record<keyof SetupFormValues, string>>;
  isStepValid: boolean;
  canAdvance: boolean;
  currentStepDef: (typeof STEPS)[number] | undefined;
  progress: number;
  fieldSteps: typeof STEPS;

  /** Timestamp of the last successful draft save (0 until the first save). */
  lastSavedAt: number;

  // refs
  regionRef: React.MutableRefObject<HTMLFormElement | null>;

  // honeypot (anti-bot)
  honeypot: string;
  setHoneypot: (honeypot: string) => void;
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
  setServerError: (serverError: string | null) => void;
}

export function useSetupWizard({
  step,
  onStepChange,
  activation = null,
}: UseSetupWizardOptions): UseSetupWizard {
  const hydrated = useSetupStore((s) => s.hydrated);
  const hasResume = useSetupStore((s) => s.hasResume);
  const values = useSetupStore((s) => s.values);
  const touched = useSetupStore((s) => s.touched);
  const furthest = useSetupStore((s) => s.furthest);
  const busy = useSetupStore((s) => s.busy);
  const serverError = useSetupStore((s) => s.serverError);
  const completed = useSetupStore((s) => s.completed);
  const lastSavedAt = useSetupStore((s) => s.lastSavedAt);
  const honeypot = useSetupStore((s) => s.honeypot);

  const {
    setHydrated,
    setHasResume,
    setValues,
    setTouched,
    setFurthest,
    setBusy,
    setServerError,
    setCompleted,
    setLastSavedAt,
    setHoneypot,
  } = useSetupStore.getState();

  const regionRef = React.useRef<HTMLFormElement | null>(null);

  // Start the anti-bot clock on the wizard's first mount in this page
  // session (module scope, so sub-route remounts don't reset it).
  React.useEffect(() => {
    if (mountedAtMs === 0) mountedAtMs = Date.now();
  }, []);

  // Hydrate on mount (once per page session — the store persists across
  // sub-route remounts, so `hydrated` guards re-entry). The step itself
  // comes from the URL (deep link / refresh), so only values + furthest are
  // restored from the draft; the draft step is used purely to decide the
  // resume CTA on the intro page.
  //
  // Activation mode never restores a draft: the email must come from the
  // invite (locked), and a stale bootstrap draft would clobber the session.
  React.useEffect(() => {
    if (hydrated) return;
    if (activation) {
      setValues({ ...DEFAULT_VALUES, email: activation.email });
      setFurthest('identity');
      setHasResume(false);
      setHydrated(true);
      return;
    }
    const draft = loadDraft();
    if (draft?.values) {
      setValues(valuesFromDraft(draft));
      setHasResume(true);
      if (draft.furthest) setFurthest(draft.furthest);
    }
    setHydrated(true);
  }, [hydrated, activation, setValues, setHasResume, setFurthest, setHydrated]);

  // Persist non-secret fields on every change after hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    saveDraft(values, step, furthest);
    setLastSavedAt(Date.now());
  }, [hydrated, values, step, furthest, setLastSavedAt]);

  const handleChange = React.useCallback(
    <K extends keyof SetupFormValues>(key: K, value: string) => {
      // In activation mode the email is fixed by the invite — never let the
      // client rewrite it (a disabled input is UX only; this is the real guard).
      if (activation && key === 'email') return;
      // Read the latest values from the store (not the render closure) so
      // fast consecutive keystrokes never clobber each other.
      const current = useSetupStore.getState().values;
      setValues({ ...current, [key]: value });
      setServerError(null);
    },
    [activation, setValues, setServerError],
  );

  const handleBlur = React.useCallback(
    <K extends keyof SetupFormValues>(key: K) => {
      const current = useSetupStore.getState().touched;
      setTouched({ ...current, [key]: true });
    },
    [setTouched],
  );

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
      // Skip the honeypot (tabIndex=-1) and disabled fields — focus must
      // land on the first real field of the step.
      const focusable = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
      );
      focusable?.focus();
    });
  }, []);

  const goTo = React.useCallback(
    (target: StepId) => {
      onStepChange(target);
      // Always read the latest furthest from the store — never a stale
      // closure — so jumping around stays monotonic.
      const prev = useSetupStore.getState().furthest;
      setFurthest(stepIndex(target) > stepIndex(prev) ? target : prev);
    },
    [onStepChange, setFurthest],
  );

  // Focus the first field of the step once it actually renders. The URL
  // navigation is async (unlike the old internal setState), so this lives
  // in an effect keyed on `step` instead of inside `goTo`.
  React.useEffect(() => {
    if (!hydrated) return;
    if (step === 'intro' || step === 'review') return;
    focusFirstField();
  }, [step, hydrated, focusFirstField]);

  const handleStart = React.useCallback(() => {
    // With a saved draft, "ادامه از مرحله‌ی قبل" continues from the deepest
    // step reached; otherwise the wizard starts at identity.
    goTo(hasResume && furthest !== 'intro' ? furthest : 'identity');
  }, [goTo, hasResume, furthest]);

  const handleNext = React.useCallback(() => {
    if (step === 'intro') {
      goTo('identity');
      return;
    }
    if (!isStepValid) {
      const fields: ReadonlyArray<keyof SetupFormValues> =
        step === 'review' ? [] : (STEP_FIELDS[step] as ReadonlyArray<keyof SetupFormValues>);
      const current = useSetupStore.getState().touched;
      const nextTouched = { ...current };
      for (const f of fields) nextTouched[f] = true;
      setTouched(nextTouched);
      return;
    }
    const next = nextStep(step);
    if (next) goTo(next);
  }, [goTo, isStepValid, step, setTouched]);

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
    setValues(activation ? { ...DEFAULT_VALUES, email: activation.email } : DEFAULT_VALUES);
    setTouched({});
    setFurthest('intro');
    setServerError(null);
    clearDraft();
    onStepChange('intro');
  }, [activation, setValues, setTouched, setFurthest, setServerError, onStepChange]);

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
    const elapsed = mountedAtMs > 0 ? Date.now() - mountedAtMs : Number.POSITIVE_INFINITY;
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
    const sinceLastSubmit = now - lastSubmitAtMs;
    const sinceLastError = now - lastErrorAtMs;
    const minGap = sinceLastError < ERROR_COOLDOWN_MS ? ERROR_COOLDOWN_MS : SUBMIT_COOLDOWN_MS;
    if (lastSubmitAtMs > 0 && sinceLastSubmit < minGap) {
      const wait = Math.ceil((minGap - sinceLastSubmit) / 1000);
      setServerError(`لطفاً ${toPersianDigits(wait)} ثانیه‌ی دیگر تلاش کنید.`);
      return;
    }
    lastSubmitAtMs = now;

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
      // Invite-based handover: the single-use token authorizes completion
      // of the pending OWNER row instead of bootstrapping a new one.
      if (activation) formData.append('token', activation.token);

      const response = activation
        ? await activateOwner(formData)
        : await createSuperAdmin(formData);
      if (response.success) {
        setCompleted(true);
        clearDraft();
        lastErrorAtMs = 0; // reset error tracking on success
      } else {
        setServerError(response.message || 'خطایی در پردازش رخ داد');
        lastErrorAtMs = Date.now();
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'خطای غیرمنتظره‌ای رخ داد؛ لطفاً دوباره تلاش کنید.',
      );
      lastErrorAtMs = Date.now();
    } finally {
      setBusy(false);
    }
  }, [goTo, values, honeypot, activation, setBusy, setServerError, setTouched, setCompleted]);

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
    // activation
    activationMode: activation != null,
    activationEmail: activation?.email ?? null,
    activationToken: activation?.token ?? null,
    // derived
    visibleErrors,
    isStepValid,
    canAdvance,
    currentStepDef,
    progress,
    fieldSteps,
    lastSavedAt,
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
