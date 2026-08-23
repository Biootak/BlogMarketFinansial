'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const PageViewTracker = dynamic(() => import('@/components/PageViewTracker'), {
  ssr: false,
  loading: () => null,
});

export function DeferredPageViewTracker() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idle = window.requestIdleCallback?.(() => setReady(true));
    const timer = idle === undefined ? window.setTimeout(() => setReady(true), 1500) : undefined;

    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return ready ? <PageViewTracker /> : null;
}

export default DeferredPageViewTracker;
