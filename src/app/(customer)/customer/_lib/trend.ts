/**
 * Seeded random utilities — برای ساخت دادهٔ واقع‌گرایانه بدون randomness
 * ---------------------------------------------------------------------------
 * در داشبورد ما نیاز به دادهٔ trend داریم (sparkline) ولی نباید هر بار با
 * re-render تغییر کند. این توابع از یک seed (مثلاً account ID) استفاده
 * می‌کنند تا یک سری عددی پایدار تولید کنند.
 *
 * الگوریتم: simple LCG (linear congruential generator) — کافی برای
 * visual data، cryptographic نیست.
 */

/**
 * mulberry32 — یک hash ساده و سریع.
 * بر اساس https://stackoverflow.com/a/47593316
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function next() {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * hash string → 32-bit integer (برای seed).
 */
function hashStringToInt(str: string): number {
  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV-1a prime
  }
  return h >>> 0;
}

/**
 * یک سری عددی پایدار (n نقطه) حول یک مقدار مرکزی تولید می‌کند.
 * Trend رو به بالا/پایین می‌برد ولی مقدار نهایی با مقدار ورودی برابر است.
 *
 * @param seed  هر string پایدار (مثلاً account id)
 * @param length  تعداد نقاط (پیش‌فرض 12)
 * @param endValue  مقدار نقطهٔ آخر (معمولاً balance فعلی)
 * @param volatility  دامنهٔ نوسان (پیش‌فرض 0.08 = 8% از مقدار)
 */
export function generateTrend(
  seed: string,
  length: number,
  endValue: number,
  volatility = 0.08,
): number[] {
  const rng = mulberry32(hashStringToInt(seed));
  const data: number[] = [];

  // شروع از مقداری کمی متفاوت (همیشه پایین‌تر از endValue مگر صعودی)
  const startValue = endValue * (1 - volatility * 1.2 * rng());
  const step = (endValue - startValue) / (length - 1);

  let value = startValue;
  for (let i = 0; i < length; i++) {
    // Random walk
    const noise = (rng() - 0.5) * 2 * volatility * endValue;
    value = value + step + noise;
    data.push(Math.max(0, value));
    // Reset to expected linear for next step
    const expected = startValue + step * (i + 1);
    value = expected;
  }

  // Force last value to be exactly endValue
  data[data.length - 1] = endValue;

  return data;
}

/**
 * تاریخ (n روز گذشته) به فرمت YYYY-MM-DD برای axis label
 */
export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
