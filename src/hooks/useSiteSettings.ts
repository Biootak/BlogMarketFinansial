'use client';

import { create } from 'zustand';

interface SiteSettingsState {
  siteName: string | null;
  siteDescription: string | null;
  logoUrl: string | null;
  isLoaded: boolean;
  setSettings: (settings: Partial<SiteSettingsState>) => void;
}

export const useSiteSettings = create<SiteSettingsState>((set) => ({
  siteName: null,
  siteDescription: null,
  // Empty string = use the default inline SVG logo. The Logo
  // component renders the inline SVG when this is empty. Storing an
  // empty default (instead of a PNG path) keeps the build free of
  // missing-asset errors when no custom logo is configured.
  logoUrl: '',
  isLoaded: false,
  setSettings: (settings) => set((state) => ({ ...state, ...settings, isLoaded: true })),
}));
