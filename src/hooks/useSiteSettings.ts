'use client';

import { create } from 'zustand';

interface SocialLinks {
  telegram: string | null;
  instagram: string | null;
  twitter: string | null;
  whatsapp: string | null;
}

interface SiteSettingsState {
  siteName: string | null;
  siteDescription: string | null;
  socials: SocialLinks;
  isLoaded: boolean;
  setSettings: (settings: Partial<SiteSettingsState>) => void;
}

export const useSiteSettings = create<SiteSettingsState>((set) => ({
  siteName: null,
  siteDescription: null,
  socials: {
    telegram: null,
    instagram: null,
    twitter: null,
    whatsapp: null,
  },
  isLoaded: false,
  setSettings: (settings) => set((state) => ({ ...state, ...settings, isLoaded: true })),
}));

// Helper to get social URL
export const getSocialUrl = (platform: string, value: string | null): string | null => {
  if (!value || value.trim() === '') return null;

  const username = value.replace('@', '').trim();

  switch (platform) {
    case 'telegram':
      return value.startsWith('http') ? value : `https://t.me/${username}`;
    case 'instagram':
      return value.startsWith('http') ? value : `https://instagram.com/${username}`;
    case 'twitter':
      return value.startsWith('http') ? value : `https://twitter.com/${username}`;
    case 'whatsapp':
      return value.startsWith('http') ? value : `https://wa.me/${value.replace(/\D/g, '')}`;
    default:
      return value;
  }
};
