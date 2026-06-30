'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SiteIdentity } from '@/lib/site-identity';
import { FALLBACK_SITE_NAME, FALLBACK_LOGO_URL } from '@/lib/site-identity';

const SiteIdentityContext = createContext<SiteIdentity | null>(null);

export function useSiteIdentity(): SiteIdentity {
  const ctx = useContext(SiteIdentityContext);
  if (!ctx) {
    // Fallback when the provider hasn't loaded yet (e.g. inside a Suspense
    // boundary before the server data resolves). This is safe — the server
    // layout always renders the provider with real data.
    return {
      siteName: FALLBACK_SITE_NAME,
      logoUrl: FALLBACK_LOGO_URL,
      siteDescription: '',
    };
  }
  return ctx;
}

export function SiteIdentityProvider({
  identity,
  children,
}: {
  identity: SiteIdentity;
  children: ReactNode;
}) {
  return (
    <SiteIdentityContext.Provider value={identity}>
      {children}
    </SiteIdentityContext.Provider>
  );
}