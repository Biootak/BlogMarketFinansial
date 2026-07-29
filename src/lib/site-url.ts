/**
 * site-url.ts — منبع واحد برای دامنه سایت
 *
 * اولویت:
 *   1. siteUrl از SystemSettings (ادمین در داشبورد تنظیم می‌کند)
 *   2. NEXT_PUBLIC_APP_URL از env
 *   3. مقدار پیش‌فرض: https://financialmarket.page
 *
 * این تابع در robots.ts، sitemap.ts، layout.tsx و هر جای دیگری که
 * به URL کامل سایت نیاز است استفاده می‌شود تا همه از یک منبع بخوانند.
 */
import { getSystemSettingsCached } from '@/data/getSystemSettingsCached';

export const DEFAULT_SITE_URL = 'https://financialmarket.page';

/**
 * Base URL resolved at runtime (server-side only).
 * Strip trailing slash so callers can safely append paths.
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const settings = await getSystemSettingsCached();
    const url = settings.siteUrl?.trim();
    if (url) {
      return url.endsWith('/') ? url.slice(0, -1) : url;
    }
  } catch {
    // DB unreachable — fall through to env / default
  }
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return DEFAULT_SITE_URL;
}

/**
 * Synchronous version for places that cannot await (e.g. Client Component env read).
 * Only reads env — does NOT hit the DB.
 */
export function getSiteUrlSync(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return DEFAULT_SITE_URL;
}
