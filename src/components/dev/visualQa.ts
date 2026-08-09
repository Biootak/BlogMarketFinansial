/**
 * visualQa.ts — بررسی خودکار ایرادهای ظاهری (بدون نیاز به اسکرین‌شات)
 * ----------------------------------------------------------------------------
 * روی صفحهٔ جاری (یا داخل iframe شبیه‌ساز) اجرا می‌شود و ایرادهای رایج طراحی
 * را با عدد دقیق برمی‌گرداند:
 *   ۱. overflow — صفحه از viewport عریض‌تر است + مقصرها
 *   ۲. escape — المان‌هایی که از لبهٔ راست/چپ viewport بیرون زده‌اند
 *   ۳. clip — متنی که از ظرفش بیرون زده/بریده شده
 *   ۴. contrast — کنتراست ضعیف متن روی پس‌زمینه (WCAG)
 *
 * همهٔ چک‌ها سمت کلاینت و بدون وابستگی اجرا می‌شوند. فقط المان‌های قابل‌مشاهده
 * بررسی می‌شوند و UI خودِ DevInspector نادیده گرفته می‌شود.
 */

export interface QaIssue {
  type: 'overflow' | 'escape' | 'clip' | 'contrast';
  severity: 'error' | 'warn';
  message: string;
  /** عدد/مقدار دقیق برای گزارش */
  meta: string;
  selector: string;
  /** ارجاع مستقیم به المان (در همان window) — برای پین‌کردن */
  el: HTMLElement | null;
}

const MAX_ISSUES = 30;
const INSPECTOR_RE = /DevInspector/;

function isInspector(el: Element): boolean {
  if (typeof el.className === 'string' && INSPECTOR_RE.test(el.className)) return true;
  // UI خودِ بازرس (پنل، قاب‌ها، شبیه‌ساز) با z-index فوق‌العاده بالا مشخص است
  const cs = getComputedStyle(el as HTMLElement);
  return cs.position === 'fixed' && Number.parseInt(cs.zIndex, 10) >= 2147483643;
}

function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
}

function makeSelector(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const cls =
    typeof el.className === 'string' && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : '';
  return `${tag}${id}${cls}`;
}

/** تبدیل هر فرمت رنگ CSS به rgb — با canvas می‌گذاریم خود مرورگر نرمال کند */
function colorToRgb(color: string): [number, number, number] | null {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    const m = ctx.fillStyle.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[ ,/]+/).map((p) => Number.parseFloat(p));
    if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null;
    return [parts[0], parts[1], parts[2]];
  } catch {
    return null;
  }
}

function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a: string, b: string): number | null {
  const ca = colorToRgb(a);
  const cb = colorToRgb(b);
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** نزدیک‌ترین پس‌زمینهٔ غیرشفاف بالادست */
function resolveBackground(el: HTMLElement): string {
  let n: HTMLElement | null = el;
  while (n) {
    const bg = getComputedStyle(n).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(/[ ,/]+/).map((p) => Number.parseFloat(p));
      const alpha = parts.length > 3 ? parts[3] : 1;
      if (!Number.isNaN(alpha) && alpha >= 0.85) {
        return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
      }
    }
    n = n.parentElement;
  }
  return 'rgb(255,255,255)';
}

export interface VisualQaResult {
  viewport: { w: number; h: number };
  pageScrollWidth: number;
  issues: QaIssue[];
}

export function runVisualQa(): VisualQaResult {
  const vw = innerWidth;
  const issues: QaIssue[] = [];
  const push = (issue: QaIssue) => {
    if (issues.length < MAX_ISSUES) issues.push(issue);
  };

  const all = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter(
    (el) => !isInspector(el),
  );

  // ── ۱) سرریز افقی کل صفحه + مقصرها ────────────────────────────────────
  const docEl = document.documentElement;
  const pageWidth = docEl.scrollWidth;
  if (pageWidth > vw + 1) {
    push({
      type: 'overflow',
      severity: 'error',
      message: 'صفحه از viewport عریض‌تر است (اسکرول افقی ناخواسته)',
      meta: `${pageWidth}px > ${vw}px`,
      selector: 'html',
      el: docEl,
    });
    // مقصرها: المان‌هایی که از لبهٔ راست بیرون زده‌اند
    const culprits = all
      .filter((el) => isVisible(el))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.right > vw + 2 && r.left < vw && r.width > 24)
      .sort((a, b) => b.r.right - a.r.right)
      .slice(0, 8);
    for (const { el, r } of culprits) {
      push({
        type: 'escape',
        severity: 'error',
        message: 'المان از لبهٔ راست viewport بیرون زده',
        meta: `${Math.round(r.right - vw)}px بیرون (عرض ${Math.round(r.width)}px)`,
        selector: makeSelector(el),
        el,
      });
    }
  }

  // ── ۲) بیرون‌زدگی از لبه‌های چپ/راست (حتی بدون سرریز کل صفحه) ──────────
  if (issues.length < 6) {
    const escapers = all
      .filter((el) => isVisible(el))
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(
        ({ el, r }) =>
          r.width > 40 &&
          (r.left < -2 || r.right > vw + 2) &&
          // والد سرریزکننده ندارد (خودش باعث overflow است، نه داخل ظرف مخفی)
          !el.closest('[class*="overflow"], [style*="overflow"]'),
      )
      .sort((a, b) => b.r.width - a.r.width)
      .slice(0, 6);
    for (const { el, r } of escapers) {
      const out = r.left < -2 ? Math.round(-r.left) : Math.round(r.right - vw);
      push({
        type: 'escape',
        severity: 'warn',
        message: r.left < -2 ? 'المان از لبهٔ چپ بیرون زده' : 'المان از لبهٔ راست بیرون زده',
        meta: `${out}px`,
        selector: makeSelector(el),
        el,
      });
    }
  }

  // ── ۳) متن/محتوای بریده‌شده ─────────────────────────────────────────────
  let clipCount = 0;
  for (const el of all) {
    if (clipCount >= 8) break;
    if (!isVisible(el) || el.clientWidth < 30) continue;
    // فقط ظرف‌هایی که محتوای داخلی‌شان بیرون زده
    if (el.scrollWidth > el.clientWidth + 4) {
      const cs = getComputedStyle(el);
      const overflowing =
        cs.overflowX === 'visible' &&
        !el.closest(
          '[class*="marquee"], [class*="ticker"], [class*="carousel"], [class*="slider"]',
        );
      if (overflowing) {
        push({
          type: 'clip',
          severity: 'warn',
          message: 'محتوای داخل ظرف بیرون زده (ممکن است بریده شود)',
          meta: `${el.scrollWidth - el.clientWidth}px بیرون از عرض ${el.clientWidth}px`,
          selector: makeSelector(el),
          el,
        });
        clipCount += 1;
      }
    }
  }

  // ── ۴) کنتراست ضعیف متن ────────────────────────────────────────────────
  let contrastCount = 0;
  for (const el of all) {
    if (contrastCount >= 8) break;
    if (!isVisible(el) || el.clientWidth < 10 || el.clientHeight < 4) continue;
    // فقط گره‌های متنی مستقیم (بدون بچهٔ المانی)
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (text.length < 2) continue;
    const cs = getComputedStyle(el);
    const ratio = contrastRatio(cs.color, resolveBackground(el));
    if (ratio === null) continue;
    const size = Number.parseFloat(cs.fontSize) || 14;
    const weight = Number.parseInt(cs.fontWeight, 10) || 400;
    const largeText = size >= 18 || (size >= 14 && weight >= 700);
    const threshold = largeText ? 3 : 4.5;
    if (ratio < threshold) {
      push({
        type: 'contrast',
        severity: 'warn',
        message: `کنتراست ضعیف متن (${ratio.toFixed(2)}:1 < ${threshold}:1)`,
        meta: `${cs.color} روی ${resolveBackground(el)} · فونت ${size}px`,
        selector: makeSelector(el),
        el,
      });
      contrastCount += 1;
    }
  }

  return {
    viewport: { w: innerWidth, h: innerHeight },
    pageScrollWidth: pageWidth,
    issues,
  };
}
