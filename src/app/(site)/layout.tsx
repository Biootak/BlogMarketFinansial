import { getActiveAdvertisements } from '@/actions/advertisementActions';
import { getActiveRateListsOrCryptoFallback } from '@/actions/rate-lists';
import Footer from '@/components/Footer/Footer';
import Header from '@/components/Header/Header';
import { SiteSettingsProvider } from '@/components/SiteSettingsProvider';
import { getSystemSettingsData } from '@/data/getSystemSettings';
import { safe, safeArray } from '@/lib/safe-fetch';
import type { Metadata } from 'next';
import { connection } from 'next/server';

export async function generateMetadata(): Promise<Metadata> {
  // 2026-06-24: generateMetadata is evaluated as a static server
  // component by default under `cacheComponents: true`. The settings
  // fetch below routes through `safeCache` (see `data/getSystemSettings.ts`
  // → `lib/safe-cache.ts`), which calls `Date.now()` for in-memory TTL
  // bookkeeping — forbidden in a static context unless preceded by a
  // request-data access. `await connection()` opts this metadata function
  // into dynamic rendering so the safe-cache TTL semantics work.
  await connection();

  // 2026-06-21: اگر دیتابیس قطع باشد، metadata با fallback ساخته می‌شود
  // تا سایت کرش نکند.
  const settings = await safe(
    getSystemSettingsData(),
    { siteName: '', siteDescription: '' } as Awaited<ReturnType<typeof getSystemSettingsData>>,
    'generateMetadata/settings',
  );

  return {
    title: settings.siteName || 'Market Financial',
    description: settings.siteDescription || 'پلتفرم مورد اعتماد شما در بازار مالی',
    icons: {
      icon: [
        {
          rel: 'icon',
          url: '/favicon.svg',
          type: 'image/svg+xml',
          sizes: 'any',
        },
      ],
    },
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // 2026-06-24: under `cacheComponents: true`, server components are
  // static by default. The safe-cache wrappers below call `Date.now()`
  // for in-memory TTL bookkeeping, which counts as dynamic data access
  // and is forbidden in a static context unless preceded by a request-
  // data access. `await connection()` explicitly opts this layout into
  // dynamic rendering so the per-request TTL semantics of safe-cache
  // work as designed.
  await connection();

  // 2026-06-21: هر سه call با safe/safeArray محافظت می‌شوند. اگر دیتابیس
  // قطع باشد (مثلاً Neon در حالت idle)، هر کدام مقدار fallback برمی‌گرداند
  // و سایت همچنان render می‌شود. در dev خطا در console لاگ می‌شود.
  const [settings, footerAdsResult, rateLists] = await Promise.all([
    safe(
      getSystemSettingsData(),
      { siteName: '', siteDescription: '' } as Awaited<ReturnType<typeof getSystemSettingsData>>,
      'SiteLayout/settings',
    ),
    safe(
      getActiveAdvertisements({
        limit: 1,
        position: 'FOOTER',
        orderBy: 'createdAt',
        orderDirection: 'desc',
      }),
      {
        success: true,
        message: 'تبلیغ فعالی برای فوتر پیدا نشد',
        data: [],
      } satisfies Awaited<ReturnType<typeof getActiveAdvertisements>>,
      'SiteLayout/footerAds',
    ),
    // 2026-06-21: این call قبلاً کل سایت را کرش می‌کرد وقتی DB
    // در دسترس نبود. حالا با safeArray ایمن شده و crypto fallback
    // داخل خودش هم کار می‌کند.
    safeArray(
      getActiveRateListsOrCryptoFallback(),
      'SiteLayout/rateLists',
    ),
  ]);
  const footerAd =
    footerAdsResult.success && Array.isArray(footerAdsResult.data) && footerAdsResult.data[0]
      ? footerAdsResult.data[0]
      : null;
  const activeRateLists = (rateLists ?? []).filter((l) => l.isActive);

  return (
    <SiteSettingsProvider
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
      }}
    >
      <Header activeRateLists={activeRateLists} />
      <main>{children}</main>
      <Footer footerAd={footerAd} />
    </SiteSettingsProvider>
  );
}
