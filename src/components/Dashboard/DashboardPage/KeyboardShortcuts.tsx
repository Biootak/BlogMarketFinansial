'use client';

import { useHotkeys } from '@/hooks/useHotkeys';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function KeyboardShortcuts() {
  const router = useRouter();

  useHotkeys({
    'Mod+K': () => {
      window.dispatchEvent(new CustomEvent('cmd-palette:open'));
    },
    'g d': () => router.push('/dashboard'),
    'g p': () => router.push('/dashboard/posts'),
    'g s': () => router.push('/dashboard/settings'),
  });

  // Cleanup the router-scope on unmount is automatic via useEffect inside useHotkeys
  useEffect(() => {
    return () => {
      // No-op; useHotkeys handles its own cleanup
    };
  }, []);

  return null;
}
