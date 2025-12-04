'use client';

import { create } from 'zustand';

interface SiteSettingsState {
  siteName: string | null;
  siteDescription: string | null;
  isLoaded: boolean;
  setSettings: (settings: Partial<SiteSettingsState>) => void;
}

export const useSiteSettings = create<SiteSettingsState>((set) => ({
  siteName: null,
  siteDescription: null,
  isLoaded: false,
  setSettings: (settings) => set((state) => ({ ...state, ...settings, isLoaded: true })),
}));
