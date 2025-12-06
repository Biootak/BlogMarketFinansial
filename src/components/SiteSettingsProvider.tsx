'use client';

import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useEffect } from 'react';

interface SiteSettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: {
    siteName: string | null;
    siteDescription: string | null;
  };
}

export function SiteSettingsProvider({ children, initialSettings }: SiteSettingsProviderProps) {
  const setSettings = useSiteSettings((state) => state.setSettings);

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        siteName: initialSettings.siteName,
        siteDescription: initialSettings.siteDescription,
      });
    }
  }, [initialSettings, setSettings]);

  return <>{children}</>;
}
