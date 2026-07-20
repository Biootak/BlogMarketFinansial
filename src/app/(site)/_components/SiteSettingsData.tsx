import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { Suspense } from 'react';

/**
 * SiteSettingsData — async data boundary for hydrating the public site
 * settings store.
 *
 * 2026-06-25: The settings fetch is wrapped in its own <Suspense> boundary
 * so the layout shell can stream without waiting for the settings row. The
 * provider itself renders no DOM and only populates the client store via
 * useEffect once the data resolves.
 */
export default async function SiteSettingsData() {
  const settings = await getSystemSettingsData();

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        logoUrl: settings.logoUrl,
      }}
    >
      {null}
    </SiteSettingsProvider>
  );
}

/**
 * Convenience wrapper that provides its own Suspense boundary.
 * No visual fallback is needed because the provider renders nothing.
 */
export function SiteSettingsDataWithSuspense() {
  return (
    <Suspense fallback={null}>
      <SiteSettingsData />
    </Suspense>
  );
}
