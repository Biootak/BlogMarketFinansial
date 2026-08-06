'use client';

/**
 * ObsProvider — تنها منبع دادهٔ کلاینت برای همهٔ زیرمسیرهای مشاهده‌پذیری.
 *
 * در layout قرار می‌گیرد، پس با ناوبری بین زیرمسیرها unmount نمی‌شود و
 * polling قطع نمی‌گردد؛ یعنی هر تب یک fetch جدا نمی‌زند.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import type { ObservabilitySnapshot } from '@/lib/observability';

export type SyncState = 'idle' | 'syncing' | 'failed';

interface ObsContextValue {
  data: ObservabilitySnapshot | null;
  sync: SyncState;
  refresh: () => void;
  /** سطل ساعتی انتخاب‌شده در نوار روز (۰..۲۳) */
  hour: number | null;
  setHour: (value: number) => void;
}

const REFRESH_MS = 30_000;

const ObsContext = createContext<ObsContextValue | null>(null);

export function ObsProvider({
  initialData,
  children,
}: {
  initialData: ObservabilitySnapshot | null;
  children: ReactNode;
}) {
  const [data, setData] = useState<ObservabilitySnapshot | null>(initialData);
  const [sync, setSync] = useState<SyncState>('idle');
  const [hour, setHour] = useState<number | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSync('syncing');

    void fetch('/api/observability/metrics', {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('unreachable');
        const payload = (await response.json()) as {
          success?: boolean;
          data?: ObservabilitySnapshot;
        };
        if (!payload.success || !payload.data) throw new Error('rejected');
        setData(payload.data);
        setSync('idle');
      })
      .catch(() => {
        setSync('failed');
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, []);

  useVisibilityAwareInterval(refresh, REFRESH_MS);

  const value = useMemo<ObsContextValue>(
    () => ({ data, sync, refresh, hour, setHour }),
    [data, sync, refresh, hour],
  );

  return <ObsContext.Provider value={value}>{children}</ObsContext.Provider>;
}

export function useObs(): ObsContextValue {
  const context = useContext(ObsContext);
  if (!context) {
    throw new Error('useObs باید داخل ObsProvider استفاده شود');
  }
  return context;
}
