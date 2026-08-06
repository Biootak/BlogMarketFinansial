'use client';

/**
 * ObsProvider — تنها منبع دادهٔ کلاینت برای همهٔ زیرمسیرهای مشاهده‌پذیری.
 * ─────────────────────────────────────────────────────────────
 *  در layout قرار می‌گیرد، پس با ناوبری بین زیرمسیرها unmount نمی‌شود و
 *  polling قطع نمی‌گردد؛ یعنی هر تب یک fetch جدا نمی‌زند.
 *
 *  نکات پیاده‌سازی:
 *   - وقتی تب مخفی است polling متوقف می‌شود (باتری و کوئری بیهوده).
 *   - ۴۰۱/۴۰۳ یعنی نشست منقضی شده؛ polling برای همیشه متوقف می‌شود تا
 *     صفحه هر ۳۰ ثانیه یک درخواست رد‌شده نزند. UI صادقانه می‌گوید داده کهنه است.
 *   - هر درخواست AbortController خودش را دارد و روی refresh دستی لغو می‌شود.
 *   - `hour` مکان‌نمای زمانی مشترک است: نوار روز، ماتریس گرما و خوانش hero
 *     همگی روی یک سطل ساعتی قفل می‌شوند.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useVisibilityAwareInterval } from '@/hooks/useVisibilityAwareInterval';
import type { ObservabilitySnapshot } from '@/lib/observability';

import { computeVerdict } from './verdict';
import type { Verdict } from './verdict';

/** idle = زنده · syncing = در حال خواندن · failed = خطای شبکه · blocked = نشست منقضی */
export type SyncState = 'idle' | 'syncing' | 'failed' | 'blocked';

interface ObsContextValue {
  data: ObservabilitySnapshot | null;
  verdict: Verdict;
  sync: SyncState;
  refresh: () => void;
  /** تعداد سطل‌های پنجره — همیشه معتبر، حتی وقتی داده نداریم. */
  windowHours: number;
  /** سطل ساعتی انتخاب‌شده (۰..windowHours-1) — همیشه resolve شده. */
  hour: number;
  /** true یعنی مکان‌نما روی ساعت جاری قفل است. */
  isLiveHour: boolean;
  setHour: (value: number) => void;
  stepHour: (delta: number) => void;
  resetHour: () => void;
}

const ENDPOINT = '/api/observability/metrics';
const REFRESH_MS = 30_000;
const FALLBACK_WINDOW = 24;

const ObsContext = createContext<ObsContextValue | null>(null);

interface MetricsResponse {
  success?: boolean;
  data?: ObservabilitySnapshot;
}

export function ObsProvider({
  initialData,
  children,
}: {
  initialData: ObservabilitySnapshot | null;
  children: ReactNode;
}) {
  const [data, setData] = useState<ObservabilitySnapshot | null>(initialData);
  const [sync, setSync] = useState<SyncState>('idle');
  const [pinnedHour, setPinnedHour] = useState<number | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const blockedRef = useRef(false);

  const windowHours = data?.windowHours ?? FALLBACK_WINDOW;
  const liveHour = Math.max(0, windowHours - 1);
  const hour = pinnedHour === null ? liveHour : Math.min(pinnedHour, liveHour);

  const refresh = useCallback(() => {
    if (blockedRef.current) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSync('syncing');

    void fetch(ENDPOINT, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          blockedRef.current = true;
          setSync('blocked');
          return;
        }
        if (!response.ok) {
          setSync('failed');
          return;
        }
        const payload = (await response.json()) as MetricsResponse;
        if (payload.success !== true || !payload.data) {
          setSync('failed');
          return;
        }
        setData(payload.data);
        setSync('idle');
      })
      .catch(() => {
        if (!controller.signal.aborted) setSync('failed');
      })
      .finally(() => {
        if (controllerRef.current === controller) controllerRef.current = null;
      });
  }, []);

  useVisibilityAwareInterval(refresh, REFRESH_MS);

  const setHour = useCallback((value: number) => {
    setPinnedHour(value);
  }, []);

  const stepHour = useCallback(
    (delta: number) => {
      setPinnedHour((current) => {
        const base = current === null ? liveHour : current;
        return Math.min(liveHour, Math.max(0, base + delta));
      });
    },
    [liveHour],
  );

  const resetHour = useCallback(() => {
    setPinnedHour(null);
  }, []);

  const verdict = useMemo(() => computeVerdict(data), [data]);

  const value = useMemo<ObsContextValue>(
    () => ({
      data,
      verdict,
      sync,
      refresh,
      windowHours,
      hour,
      isLiveHour: hour === liveHour,
      setHour,
      stepHour,
      resetHour,
    }),
    [data, verdict, sync, refresh, windowHours, hour, liveHour, setHour, stepHour, resetHour],
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
