'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Toaster = dynamic(
  () => import('@/components/ui/toaster').then((module) => module.Toaster),
  {
    ssr: false,
    loading: () => null,
  },
);

export function DeferredToaster() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idle = window.requestIdleCallback?.(() => setReady(true));
    const timer = idle === undefined ? window.setTimeout(() => setReady(true), 1500) : undefined;

    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  return ready ? <Toaster /> : null;
}

export default DeferredToaster;
