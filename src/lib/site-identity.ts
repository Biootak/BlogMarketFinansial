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
/**
 * Fallback logo used when the DB is unreachable (`getSiteIdentity`
 * catches the error and returns fallbacks).
 *
 * 2026-08-10: changed from '' (default inline SVG) to the uploaded brand
 * mark so the logo does NOT swap to the generic SVG during DB outages.
 * The file lives on disk and is served without the DB, so the fallback
 * looks identical to the configured logo. If the admin uploads a new
 * logo, keep this in sync with the file path in `public/uploads/`.
 */
export const FALLBACK_LOGO_URL = '/uploads/general/1786269763122-7f56a4-logo.webp';

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
  } catch (_error) {
    return getFallbackIdentity();
  }
}

export const getSiteIdentity = unstable_cache(fetchSiteIdentityRaw, ['site-identity'], {
  tags: ['site-identity'],
  revalidate: 86400, // 24 hours; explicit revalidation is the source of truth
});
