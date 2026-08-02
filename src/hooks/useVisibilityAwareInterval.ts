'use client';

/**
 * useVisibilityAwareInterval — a setInterval that pauses while the document
 * tab is hidden.
 *
 * Live widgets (clocks, countups, waveforms) that tick every second burn CPU
 * and re-renders for nothing when the browser tab is in the background. This
 * hook restarts the interval when the tab becomes visible again so the widget
 * still reflects fresh time, just without background churn.
 */
import { useEffect, useRef } from 'react';

export function useVisibilityAwareInterval(callback: () => void, delayMs: number): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (delayMs <= 0) return;

    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id) clearInterval(id);
      id = setInterval(() => cbRef.current(), delayMs);
    };
    const stop = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };

    start();
    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [delayMs]);
}

export default useVisibilityAwareInterval;