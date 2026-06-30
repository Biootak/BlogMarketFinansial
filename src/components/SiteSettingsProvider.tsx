'use client';

import { useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface SiteSettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: {
    siteName: string | null;
    siteDescription: string | null;
    logoUrl: string | null;
  };
}

export function SiteSettingsProvider({ children, initialSettings }: SiteSettingsProviderProps) {
  const setSettings = useSiteSettings((state) => state.setSettings);

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        siteName: initialSettings.siteName,
        siteDescription: initialSettings.siteDescription,
        logoUrl: initialSettings.logoUrl,
      });
    }
  }, [initialSettings, setSettings]);

  return <>{children}</>;
}
