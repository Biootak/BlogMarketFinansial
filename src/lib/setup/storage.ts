'use client';

import type { SetupFormValues, StepId } from './schema';

/**
 * localStorage persistence for the in-flight setup wizard.
 *
 * Goals:
 *   1. Survive accidental refreshes / browser crashes without losing work
 *   2. Be invisible — never block the wizard UI on storage I/O
 *   3. Be safe — never store secrets; the password is intentionally NEVER
 *      persisted (it should be re-entered on resume for security)
 *
 * Storage is namespaced and versioned so a future schema change can wipe the
 * cached payload without orphaning stale data in the user's browser.
 */

const STORAGE_KEY = 'blogmarketfinansial.setup.v1';
const SCHEMA_VERSION = 1;

interface PersistedShape {
  v: typeof SCHEMA_VERSION;
  savedAt: number;
  step: StepId;
  furthest: StepId;
  /** All fields EXCEPT password. */
  values: Omit<SetupFormValues, 'password'>;
}

type PersistedDraft = Partial<PersistedShape>;

const SAFE_KEYS: ReadonlyArray<keyof Omit<SetupFormValues, 'password'>> = [
  'name',
  'email',
  'phoneNumber',
  'jobName',
  'company',
  'bio',
];

function hasStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/** Read the persisted draft, or `null` if the storage is empty / malformed. */
export function loadDraft(): PersistedDraft | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (!parsed || parsed.v !== SCHEMA_VERSION) {
      // Schema changed — drop stale data.
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as PersistedDraft;
  } catch {
    // Corrupt JSON or storage disabled — never propagate.
    return null;
  }
}

/** Persist a draft snapshot. The password is stripped before writing. */
export function saveDraft(values: SetupFormValues, step: StepId, furthest: StepId): void {
  if (!hasStorage()) return;
  try {
    const safeValues: Omit<SetupFormValues, 'password'> = SAFE_KEYS.reduce(
      (acc, key) => {
        acc[key] = values[key] ?? '';
        return acc;
      },
      {} as Omit<SetupFormValues, 'password'>,
    );
    const payload: PersistedShape = {
      v: SCHEMA_VERSION,
      savedAt: Date.now(),
      step,
      furthest,
      values: safeValues,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // QuotaExceeded / private mode — silently no-op.
  }
}

/** Remove the persisted draft (called after successful submit or explicit reset). */
export function clearDraft(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

/** Returns the safe default values for a resume, with the password cleared. */
export function valuesFromDraft(draft: PersistedDraft | null): SetupFormValues {
  const base: SetupFormValues = {
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    jobName: '',
    company: '',
    bio: '',
  };
  if (!draft || !draft.values) return base;
  for (const key of SAFE_KEYS) {
    const value = draft.values[key];
    if (typeof value === 'string') {
      (base as Record<string, string>)[key] = value;
    }
  }
  return base;
}
