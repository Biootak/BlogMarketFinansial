'use client';

import { useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface SiteSettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: {
    siteName: string | null;
    siteDescription: string | null;
    telegram: string | null;
    instagram: string | null;
    twitter: string | null;
    whatsapp: string | null;
  };
}

export function SiteSettingsProvider({ children, initialSettings }: SiteSettingsProviderProps) {
  const setSettings = useSiteSettings((state) => state.setSettings);

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        siteName: initialSettings.siteName,
        siteDescription: initialSettings.siteDescription,
        socials: {
          telegram: initialSettings.telegram,
          instagram: initialSettings.instagram,
          twitter: initialSettings.twitter,
          whatsapp: initialSettings.whatsapp,
        },
      });
    }
  }, [initialSettings, setSettings]);

  return <>{children}</>;
}
