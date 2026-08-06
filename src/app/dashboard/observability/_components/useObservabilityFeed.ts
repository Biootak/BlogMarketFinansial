'use client';

/**
 * useObservabilityFeed — تنها منبع دادهٔ زندهٔ مرکز مشاهده‌پذیری.
 * ─────────────────────────────────────────────────────────────
 *  هر board با snapshot رندرشده روی سرور شروع می‌کند و بعد هر ۳۰ ثانیه از
 *  `/api/observability/metrics` تازه می‌شود. همان endpoint موجود؛ چیز تازه‌ای
 *  ساخته نشده.
 *
 *  نکات:
 *   - وقتی تب مخفی است polling متوقف می‌شود (باتری/کوئری بیهوده).
 *   - هر درخواست AbortController خودش را دارد؛ روی unmount لغو می‌شود.
 *   - `now` مبنای همهٔ زمان‌های نسبی است. مقدار اولیه از `generatedAt`
 *     می‌آید تا SSR و اولین رندر client دقیقاً یکی باشند.
 *   - 401 یعنی نشست منقضی شده — polling ادامه پیدا نمی‌کند و وضعیت
 *     `stalled` می‌شود تا UI صادقانه بگوید داده تازه نیست.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ObservabilitySnapshot } from '@/lib/observability';

const ENDPOINT = '/api/observability/metrics';
const POLL_MS = 30_000;

export type FeedStatus = 'live' | 'refreshing' | 'stalled';

export interface ObservabilityFeed {
  data: ObservabilitySnapshot;
  now: number;
  status: FeedStatus;
  refresh: () => void;
}

interface MetricsResponse {
  success?: boolean;
  data?: ObservabilitySnapshot;
}

export function useObservabilityFeed(initialData: ObservabilitySnapshot): ObservabilityFeed {
  const [data, setData] = useState<ObservabilitySnapshot>(initialData);
  const [now, setNow] = useState<number>(() => Date.parse(initialData.generatedAt));
  const [status, setStatus] = useState<FeedStatus>('live');
  const requestRef = useRef<AbortController | null>(null);
  const blockedRef = useRef<boolean>(false);

  const read = useCallback(async () => {
    if (blockedRef.current) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus('refreshing');
    try {
      const res = await fetch(ENDPOINT, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
      if (res.status === 401 || res.status === 403) {
        blockedRef.current = true;
        setStatus('stalled');
        return;
      }
      if (!res.ok) {
        setStatus('stalled');
        return;
      }
      const payload = (await res.json()) as MetricsResponse;
      if (payload.success === true && payload.data) {
        setData(payload.data);
        setNow(Date.now());
        setStatus('live');
        return;
      }
      setStatus('stalled');
    } catch {
      if (!controller.signal.aborted) setStatus('stalled');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, []);

  const refresh = useCallback(() => {
    void read();
  }, [read]);

  // ساعت نسبی — بعد از mount به زمان واقعی مرورگر سوییچ می‌کند.
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), POLL_MS);
    return () => clearInterval(tick);
  }, []);

  // polling با احترام به visibility
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(() => void read(), POLL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }
      void read();
      start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      requestRef.current?.abort();
    };
  }, [read]);

  return { data, now, status, refresh };
}
