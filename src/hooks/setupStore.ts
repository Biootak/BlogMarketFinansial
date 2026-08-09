'use client';

import type { SetupFormValues, StepId } from '@/lib/setup/schema';
import { create } from 'zustand';

/**
 * setupStore — module-level state for the first-run setup wizard.
 *
 * The wizard's steps are real URL sub-routes (`/setup/[step]`), and Next.js
 * remounts the page component when the path changes. Component-local state
 * (`useState`) would therefore be wiped on every step transition — including
 * the password, which is deliberately NEVER persisted to the localStorage
 * draft (see `storage.ts`). This store lives outside the component tree, so
 * it survives remounts for the lifetime of the page session (a full reload
 * starts fresh, which is correct).
 *
 * The current step is NOT stored here — the URL owns it. This store holds
 * everything else: form values, touched/validation state, furthest reached
 * step, submit lifecycle flags, and the anti-bot honeypot value.
 */

interface SetupState {
  hydrated: boolean;
  hasResume: boolean;
  values: SetupFormValues;
  touched: Partial<Record<keyof SetupFormValues, true>>;
  furthest: StepId;
  busy: boolean;
  serverError: string | null;
  completed: boolean;
  lastSavedAt: number;
  honeypot: string;

  setHydrated: (hydrated: boolean) => void;
  setHasResume: (hasResume: boolean) => void;
  setValues: (values: SetupFormValues) => void;
  setTouched: (touched: Partial<Record<keyof SetupFormValues, true>>) => void;
  setFurthest: (furthest: StepId) => void;
  setBusy: (busy: boolean) => void;
  setServerError: (serverError: string | null) => void;
  setCompleted: (completed: boolean) => void;
  setLastSavedAt: (lastSavedAt: number) => void;
  setHoneypot: (honeypot: string) => void;
}

const DEFAULT_VALUES: SetupFormValues = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  jobName: '',
  company: '',
  bio: '',
};

export const useSetupStore = create<SetupState>((set) => ({
  hydrated: false,
  hasResume: false,
  values: DEFAULT_VALUES,
  touched: {},
  furthest: 'intro',
  busy: false,
  serverError: null,
  completed: false,
  lastSavedAt: 0,
  honeypot: '',

  setHydrated: (hydrated) => set({ hydrated }),
  setHasResume: (hasResume) => set({ hasResume }),
  setValues: (values) => set({ values }),
  setTouched: (touched) => set({ touched }),
  setFurthest: (furthest) => set({ furthest }),
  setBusy: (busy) => set({ busy }),
  setServerError: (serverError) => set({ serverError }),
  setCompleted: (completed) => set({ completed }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  setHoneypot: (honeypot) => set({ honeypot }),
}));
