/**
 * chart.ts — هندسهٔ مشترک همهٔ نمودارهای مرکز مشاهده‌پذیری.
 * ─────────────────────────────────────────────────────────────
 *  چرا اینجا: هیچ کتابخانهٔ نموداری وارد این بخش نمی‌شود. هر نمودار یک
 *  inline SVG است که مسیرش با همین توابع خالص ساخته می‌شود؛ نتیجه صفر
 *  بایت JS اضافه، صفر hydration cost و رندر یکسان روی سرور و کلاینت.
 *
 *  قواعد سخت:
 *   1. همه‌ی توابع خالص و بدون side effect — پس روی سرور هم قابل اجرا هستند.
 *   2. خروجی همیشه با دقت ثابت (۲ رقم) گرد می‌شود تا رشتهٔ SSR و CSR
 *      بیت‌به‌بیت یکی باشد و hydration mismatch ممکن نشود.
 *   3. viewBox مختصات کار است، نه پیکسل. اندازهٔ واقعی را CSS تعیین می‌کند.
 */

export interface Geometry {
  /** عرض فضای مختصات viewBox */
  width: number;
  /** ارتفاع فضای مختصات viewBox */
  height: number;
  /** سقف محور عمودی؛ ۰ یعنی از خود داده گرفته شود */
  max?: number;
  /** حاشیهٔ عمودی تا خط ضخامت stroke بریده نشود */
  padding?: number;
}

export type Point = readonly [number, number];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const fixed = (value: number): number => Math.round(value * 100) / 100;

/** بیشترین مقدار معتبر یک سری. سری خالی یا نامعتبر ⇒ صفر. */
export function maxOf(values: readonly number[]): number {
  let max = 0;
  for (const value of values) {
    if (Number.isFinite(value) && value > max) max = value;
  }
  return max;
}

/** جمع مقادیر معتبر. */
export function sumOf(values: readonly number[]): number {
  let sum = 0;
  for (const value of values) {
    if (Number.isFinite(value)) sum += value;
  }
  return sum;
}

/**
 * سقف «گرد» برای محور — ۴۷ می‌شود ۵۰، ۱۲۳ می‌شود ۲۰۰.
 * بدون این، برچسب محور عددهای زشت می‌گیرد و مقایسهٔ چشمی سخت می‌شود.
 */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

/** نگاشت سری عددی به نقاط viewBox. */
export function project(values: readonly number[], geo: Geometry): Point[] {
  const count = values.length;
  if (count === 0) return [];

  const padding = geo.padding ?? 1;
  const ceiling = geo.max && geo.max > 0 ? geo.max : Math.max(1, maxOf(values));
  const top = padding;
  const bottom = geo.height - padding;
  const span = Math.max(1, bottom - top);
  const stepX = count > 1 ? geo.width / (count - 1) : 0;

  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const raw = values[index] ?? 0;
    const share = clamp((Number.isFinite(raw) ? raw : 0) / ceiling, 0, 1);
    points.push([fixed(index * stepX), fixed(bottom - share * span)]);
  }
  return points;
}

/**
 * منحنی Catmull-Rom تبدیل‌شده به بزیهٔ مکعبی.
 * چرا منحنی و نه خط شکسته: سری‌های ساعتی ما ۲۴ نقطه‌اند؛ خط شکسته در این
 * تراکم دندانه‌دار و پرنویز دیده می‌شود و روند واقعی را پنهان می‌کند.
 */
export function curvePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const head = points[0];
  if (!head) return '';
  if (points.length === 1) return `M ${head[0]} ${head[1]}`;

  let d = `M ${head[0]} ${head[1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (!current || !next) continue;
    const previous = points[index - 1] ?? current;
    const after = points[index + 2] ?? next;

    const c1x = fixed(current[0] + (next[0] - previous[0]) / 6);
    const c1y = fixed(current[1] + (next[1] - previous[1]) / 6);
    const c2x = fixed(next[0] - (after[0] - current[0]) / 6);
    const c2y = fixed(next[1] - (after[1] - current[1]) / 6);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next[0]} ${next[1]}`;
  }
  return d;
}

/** مسیر خطیِ سری. */
export function linePath(values: readonly number[], geo: Geometry): string {
  return curvePath(project(values, geo));
}

/** همان منحنی، ولی بسته‌شده تا کف — برای سطح زیر نمودار. */
export function areaPath(values: readonly number[], geo: Geometry): string {
  const points = project(values, geo);
  const head = points[0];
  const tail = points[points.length - 1];
  if (!head || !tail) return '';
  const floor = geo.height - (geo.padding ?? 1);
  return `${curvePath(points)} L ${tail[0]} ${floor} L ${head[0]} ${floor} Z`;
}

/**
 * موقعیت افقی یک اندیس روی محور، به درصد.
 * مصرف‌کننده: مکان‌نمای ساعت روی نوار سیگنال.
 */
export function axisPercent(index: number, count: number): number {
  if (count <= 1) return 0;
  return fixed(clamp(index / (count - 1), 0, 1) * 100);
}

/**
 * مقیاس ریشه‌ای برای محور تأخیر.
 * صدک‌ها دم بلند دارند (p50=12ms و p99=1800ms). روی محور خطی p50 و p95 روی
 * هم می‌افتند و نمودار دروغ می‌گوید؛ ریشهٔ دوم دم را باز می‌کند بدون اینکه
 * مثل لگاریتم خواندن عدد را برای غیرمتخصص سخت کند.
 */
export function tailScale(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) return 0;
  return fixed(clamp(Math.sqrt(value / max), 0, 1) * 100);
}

/**
 * سطح شدت ۰..۴ برای سلول‌های ماتریس گرما.
 * پله‌ای است نه پیوسته: چشم انسان تفاوت ۷٪ روشنایی را نمی‌خواند، ولی پنج
 * پلهٔ مشخص را بله. رنگ هم از توکن می‌آید نه از محاسبهٔ inline.
 */
export function heatLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (!Number.isFinite(value) || value <= 0 || max <= 0) return 0;
  const share = value / max;
  if (share > 0.66) return 4;
  if (share > 0.4) return 3;
  if (share > 0.18) return 2;
  return 1;
}
