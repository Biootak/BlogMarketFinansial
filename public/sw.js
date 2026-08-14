/* Financial Market — service worker
 *
 * الگوی رسمی web.dev (Create an offline fallback page):
 *   - فقط navigation requests (mode === 'navigate') رهگیری می‌شوند؛
 *     بقیهٔ درخواست‌ها (API، تصاویر، باندل‌های Next) دست‌نخورده از
 *     مرورگر رد می‌شوند تا با caching/LiveReload توسعه تداخل نکند.
 *   - Network-first: اول شبکه، در خطا → offline.html (self-contained).
 *
 * نسخهٔ CACHE را هر بار که offline.html یا sw.js تغییر کرد بالا ببر
 * تا install جدید اجرا و cache تازه شود.
 */
const OFFLINE_VERSION = 'v1';
const CACHE_NAME = `offline-${OFFLINE_VERSION}`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // {cache: 'reload'} — جواب از HTTP cache نیاید، حتماً از شبکه.
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
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

self.addEventListener('fetch', (event) => {
  // فقط navigation (درخواست صفحهٔ HTML). بقیه رهگیری نمی‌شوند.
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        // اول navigation preload (اگر پشتیبانی می‌شود).
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) return preloadResponse;

        // بعد شبکه.
        const networkResponse = await fetch(event.request);
        return networkResponse;
      } catch {
        // شبکه در دسترس نیست → صفحهٔ offline.
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        if (cachedResponse) return cachedResponse;
        // آخرین راه — خطای خالی (عملاً اتفاق نمی‌افتد چون offline.html در install کش می‌شود).
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })(),
  );
});
