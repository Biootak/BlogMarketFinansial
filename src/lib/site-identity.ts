import prisma from '@/lib/db';
import { unstable_cache } from 'next/cache';

/**
 * Site identity — single source of truth for site name and logo.
 *
 * Reads from SystemSettings and falls back to safe defaults so the site
 * never renders empty strings or broken images.
 *
 * Cache tag convention: `site-identity` is invalidated by server-side
 * callers via `revalidateSiteIdentity()` in `@/lib/site-identity-revalidate`.
 */

export const FALLBACK_SITE_NAME = 'Financial Market';
export const FALLBACK_LOGO_URL = '/images/logo.png';

export interface SiteIdentity {
  siteName: string;
  logoUrl: string;
  siteDescription: string;
}

function getFallbackIdentity(): SiteIdentity {
  return {
    siteName: FALLBACK_SITE_NAME,
    logoUrl: FALLBACK_LOGO_URL,
    siteDescription: '',
  };
}

async function fetchSiteIdentityRaw(): Promise<SiteIdentity> {
  try {
    const settings = await prisma.systemSettings.findFirst();

    return {
      siteName: settings?.siteName?.trim() || FALLBACK_SITE_NAME,
      logoUrl: settings?.logoUrl?.trim() || FALLBACK_LOGO_URL,
      siteDescription: settings?.siteDescription?.trim() || '',
    };
  } catch (error) {
    // During build or when the DB is unreachable, return fallback defaults
    // instead of crashing static generation.
    console.warn('[site-identity] Failed to read SystemSettings, using fallback:', error);
    return getFallbackIdentity();
  }
}

export const getSiteIdentity = unstable_cache(
  fetchSiteIdentityRaw,
  ['site-identity'],
  {
    tags: ['site-identity'],
    revalidate: 86400, // 24 hours; explicit revalidation is the source of truth
  },
);
