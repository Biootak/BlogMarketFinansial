'use client';

/**
 * ScrollRestoration — بازگردانی موقعیت اسکرول برای پوستهٔ داشبورد.
 *
 * چرا لازم است:
 * پوستهٔ داشبورد (و پورتال مشتری/صرافی) به‌جای window داخل یک کانتینر داخلی
 * (`main.dash-scope`) اسکرول می‌شود. Chrome هنگام بازگشت/رفتن به جلو فقط
 * موقعیت window را بازیابی می‌کند — نه المنت‌های اسکرول داخلی — و App Router
 * هم فقط اسکرول window را مدیریت می‌کند. نتیجه: با دکمهٔ بازگشت، کاربر به
 * بالای صفحه پرتاب می‌شد.
 *
 * راهکار (الگوی استاندارد صنعت): موقعیت هر route را در sessionStorage
 * ذخیره می‌کنیم (debounced روی اسکرول + هنگام مخفی‌شدن تب) و هنگام بازگشت
 * route (back/forward و refresh) همان موقعیت را پس از رندر شدن صفحه، آنی
 * برمی‌گردانیم. سایت (اسکرول window) نیازی به این shim ندارد — مرورگر خودش
 * بازیابی می‌کند.
 *
 * نکات پیاده‌سازی:
 * - ذخیره فقط وقتی انجام می‌شود که هنوز روی همان route هستیم (گارد pathname)
 *   — اسکرول‌های برنامه‌ریزی‌شدهٔ صفحهٔ بعدی که در حین انتقال route شلیک
 *   می‌شوند همیشه بعد از عوض شدن pathname رخ می‌دهند و با این گارد، مقدار
 *   صفحهٔ قبلی را آلوده نمی‌کنند. mount اولیه / StrictMode-remount هم چیزی
 *   نمی‌نویسند چون هیچ اسکرولی رخ نداده است.
 * - علاوه بر debounce اسکرول، روی `pointerdown` و `popstate` هم ذخیره می‌شود
 *   تا «اسکرول و ناوبری فوری» موقعیت را از دست ندهد — popstate وقتی شلیک
 *   می‌شود که صفحهٔ قبلی هنوز روی صفحه است، پس خواندن تازه از DOM درست است.
 * - از `pagehide`/`beforeunload` استفاده نمی‌کنیم (موقع تخریب DOM ممکن است
 *   scrollTop صفر خوانده شود) — `visibilitychange` قبل از تخریب شلیک می‌شود.
 * - بازگردانی با حلقهٔ rAF تا وقتی پوسته mount شود retry می‌کند تا روی
 *   رفرش هم کار کند.
 */

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const STORAGE_KEY = 'fb:scroll-restore';

function readPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writePositions(positions: Record<string, number>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // حالت خصوصی / محدودیت ذخیره‌سازی — بی‌صدا رد شو
  }
}

function getScroller(): HTMLElement | null {
  // کانتینر اسکرول پوستهٔ داشبورد؛ اگر هنوز mount نشده، null (native کار می‌کند).
  const main = document.querySelector<HTMLElement>('main.dash-scope');
  if (main && main.scrollHeight > main.clientHeight) return main;
  return null;
}

export function ScrollRestoration() {
  const pathname = usePathname();

  // بازگردانی: هر وقت route عوض شد (back/forward/refresh)، موقعیت ذخیره‌شده را
  // پس از رندر شدن صفحه برمی‌گردانیم. برای صفحات تازه هیچ مقداری ذخیره نیست،
  // پس رفتار پیش‌فرض Next (بالای صفحه) حفظ می‌شود.
  useEffect(() => {
    const key = `${location.pathname}${location.search}`;
    const saved = readPositions()[key];
    if (typeof saved !== 'number') return;

    // پوسته (main.dash-scope) ممکن است هنوز هیدریت نشده باشد — تا وقتی mount
    // شود retry کن (حداکثر ~۲ ثانیه) تا روی رفرش هم موقعیت برگردد.
    const startedAt = performance.now();
    let raf = 0;
    let restored = false;
    const restore = () => {
      const scroller = getScroller();
      if (scroller && !restored) {
        restored = true;
        scroller.scrollTop = saved;
        return;
      }
      if (performance.now() - startedAt < 2000) {
        raf = requestAnimationFrame(restore);
      }
    };
    raf = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  // ذخیره: موقعیت route فعلی را هنگام اسکرول (debounced)، کلیک/لمس
  // (pointerdown — درست قبل از ناوبری)، popstate (بازگشت/رفتن به جلو — وقتی
  // صفحهٔ فعلی هنوز روی صفحه است) و مخفی‌شدن تب (refresh/بستن تب) ذخیره کن.
  // مقدار همیشه تازه از DOM خوانده می‌شود چون با گارد pathname مطمئنیم هنوز
  // روی همین route هستیم.
  useEffect(() => {
    const key = `${location.pathname}${location.search}`;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const save = () => {
      // فقط اگر هنوز روی همین route هستیم بنویس — اسکرول‌های برنامه‌ریزی‌شدهٔ
      // صفحهٔ بعدی (که در حین انتقال route شلیک می‌شوند) همیشه بعد از عوض شدن
      // pathname رخ می‌دهند و نباید موقعیت صفحهٔ قبلی را آلوده کنند. mount
      // اولیه / StrictMode-remount هم چیزی نمی‌نویسند چون هیچ اسکرولی رخ
      // نداده و pointerdown ای هم نیامده است.
      if (location.pathname + location.search !== key) return;
      const scroller = getScroller();
      if (!scroller) return;
      const positions = readPositions();
      positions[key] = scroller.scrollTop;
      writePositions(positions);
    };

    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 250);
    };
    const onPointerDown = () => save();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    const onPopState = () => save();

    const scroller = getScroller();
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('popstate', onPopState);

    return () => {
      if (timer) clearTimeout(timer);
      scroller?.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('popstate', onPopState);
    };
  }, [pathname]);

  return null;
}
