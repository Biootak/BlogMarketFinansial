/* Financial Market — service worker
 *
 * استراتژی (بر اساس web.dev — Create an offline fallback page + SWR):
 *
 *  ۱. Navigation (mode === 'navigate')
 *     network-first → موفق: ذخیره در cache + سرو. خطا: cache همان URL →
 *     در آخر offline.html.
 *     → صفحات بازدیدشده آفلاین هم باز می‌شوند.
 *
 *  ۲. Static assets (/_next/static، فونت، تصاویر، css/js)
 *     stale-while-revalidate — اول cache (فوری)، بعد revalidate در
 *     پس‌زمینه. فایل‌های hashed (/_next/static/...) با هر دیپلوی نامشان
 *     عوض می‌شود؛ نسخهٔ کش‌شده همیشه معتبر است و هزینهٔ revalidate صفر.
 *
 *  ۳. همهٔ درخواست‌های دیگر (API، POST، cross-origin)
 *     دست‌نخورده — فقط GET های هم‌origin که استاتیک‌اند.
 *
 * نسخهٔ CACHE را هر بار که sw.js یا لیست precache تغییر کرد بالا ببر.
 */
const SW_VERSION = 'v2';
const CACHE_NAME = `offline-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';

// فایل‌های بدون hash — امن برای precache در install (شبکه برقرار است).
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.png',
  '/favicon.svg',
  '/logo.png',
  '/logo.svg',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // {cache: 'reload'} — جواب از HTTP cache نیاید، حتماً از شبکه.
      await Promise.all(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))),
      );
    })(),
  );
  // SW جدید فوراً فعال شود (منتظر بسته‌شدن تب‌ها نماند).
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // navigation preload — پاسخ شبکه را موازی با اجرای SW آماده می‌کند.
      if ('navigationPreload' in self.registration) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          // مرورگرهای قدیمی — نادیده بگیر.
        }
      }
      // cacheهای قدیمی‌تر را پاک کن.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('offline-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
    })(),
  );
  // کنترل فوری صفحات باز فعلی.
  self.clients.claim();
});

function isStaticAsset(url) {
  const { pathname } = new URL(url);
  // باندل‌ها و فایل‌های hashed Next.js — نامشان با دیپلوی عوض می‌شود.
  if (pathname.startsWith('/_next/static/')) return true;
  // فونت‌ها، تصاویر، css/js ساده.
  return /\.(woff2?|ttf|eot|css|js|mjs|png|jpe?g|gif|webp|svg|ico|webmanifest|txt)$/i.test(pathname);
}

function isSameOrigin(request) {
  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  // فقط GET های هم‌origin.
  if (event.request.method !== 'GET' || !isSameOrigin(event.request)) return;

  // ── Navigation: network-first + fallback به cache → offline.html ──
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // اول navigation preload (اگر پشتیبانی می‌شود).
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;

          // بعد شبکه — موفق را در cache ذخیره کن.
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok || networkResponse.type === 'opaqueredirect') {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // شبکه در دسترس نیست → اول نسخهٔ کش‌شدهٔ همین صفحه.
          const cache = await caches.open(CACHE_NAME);
          const samePage = await cache.match(event.request);
          if (samePage) return samePage;
          // بعد offline.html.
          const offlinePage = await cache.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })(),
    );
    return;
  }

  // ── Static assets: stale-while-revalidate ─────────────────────────
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // اول cache — فوری.
        const cached = await cache.match(event.request);
        if (cached) {
          // revalidate در پس‌زمینه — بدون بلوکه‌کردن پاسخ.
          event.waitUntil(
            (async () => {
              try {
                const fresh = await fetch(event.request);
                if (fresh.ok) await cache.put(event.request, fresh);
              } catch {
                // آفلاین — نسخهٔ قدیمی هنوز بهتر از هیچ است.
              }
            })(),
          );
          return cached;
        }

        // در cache نیست → شبکه؛ موفق را ذخیره کن.
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response('', { status: 504, headers: { 'Content-Type': 'text/plain' } });
        }
      })(),
    );
  }
});
