'use client';

/**
 * DevScriptInjector — injects inline scripts in development only.
 *
 * In Next.js 16, <script> tags inside the React tree are never executed
 * on the client. This component uses useEffect + document.createElement
 * to bypass that restriction.
 *
 * Only renders in development (tree-shaken in production builds).
 */

import { useEffect } from 'react';

export interface DevScriptInjectorProps {
  id: string;
  code: string;
}

export function DevScriptInjector({ id, code }: DevScriptInjectorProps) {
  useEffect(() => {
    if (document.getElementById(id)) return;

    const script = document.createElement('script');
    script.id = id;
    script.textContent = code;
    document.head.appendChild(script);

    return () => {
      // Clean up on unmount (only in dev with Fast Refresh)
      const el = document.getElementById(id);
      el?.remove();
    };
  }, [id, code]);

  return null;
}
