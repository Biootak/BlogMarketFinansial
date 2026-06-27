#!/usr/bin/env node
/**
 * test-safe-cache — 2026-06-21
 * تست می‌کند که safeCache:
 *   1. در حالت عادی cache و برمی‌گرداند
 *   2. در صورت خطا، stale value برمی‌گرداند (اگر قبلاً موفق بود)
 *   3. در صورت خطای اولیه، fallback برمی‌گرداند
 *   4. پس از expired شدن، دوباره DB را امتحان می‌کند
 */

// کپی از src/lib/safe-cache.ts برای تست مستقل
const memoryStore = new Map();

const isDev = process.env.NODE_ENV === 'development';

// کلید cache بر اساس آرگومان‌ها ساخته می‌شود
const ARG_SEPARATOR = '::';
function makeKey(base, args) {
  if (args.length === 0) return base;
  try { return `${base}${ARG_SEPARATOR}${JSON.stringify(args)}`; }
  catch { return `${base}${ARG_SEPARATOR}${args.map(String).join(ARG_SEPARATOR)}`; }
}

function safeCache(fn, fallback, options) {
  const { key: baseKey, ttl } = options;
  return async (...args) => {
    const now = Date.now();
    const fullKey = makeKey(baseKey, args);
    const cached = memoryStore.get(fullKey);
    if (cached && cached.expiresAt > now) return cached.value;
    try {
      const value = await fn(...args);
      memoryStore.set(fullKey, { value, expiresAt: now + ttl * 1000, storedAt: now });
      return value;
    } catch (error) {
      if (cached) {
        if (isDev) console.warn(`[safe-cache] ${fullKey} stale fallback`);
        cached.expiresAt = now + Math.min(ttl, 30) * 1000;
        return cached.value;
      }
      return fallback;
    }
  };
}

let dbCallCount = 0;
let dbBehavior = 'success';

async function mockDbCall() {
  dbCallCount += 1;
  if (dbBehavior === 'fail') {
    throw new Error("Can't reach database server");
  }
  return { id: 1, name: 'Settings', value: `call-${dbCallCount}` };
}

async function mockArrayCall() {
  dbCallCount += 1;
  if (dbBehavior === 'fail') {
    throw new Error("Can't reach database server");
  }
  return [{ id: 1 }, { id: 2 }];
}

const RESULTS = { pass: 0, fail: 0 };

function assert(cond, msg) {
  if (cond) { RESULTS.pass += 1; console.log(`  ✅ ${msg}`); }
  else { RESULTS.fail += 1; console.log(`  ❌ ${msg}`); }
}

function section(t) { console.log(`\n━━━ ${t} ━━━`); }

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log('🧪 تست safeCache wrapper\n');

  // ===== تست ۱: موفقیت عادی =====
  section('تست ۱: موفقیت عادی → cache و return');
  dbCallCount = 0;
  dbBehavior = 'success';
  memoryStore.clear();
  const get1 = safeCache(mockDbCall, { default: true }, { key: 'test1', ttl: 1 });
  const r1a = await get1();
  const r1b = await get1();
  assert(r1a.value === 'call-1', 'اولین call برگشت');
  assert(r1b.value === 'call-1', 'دومین call از cache (بدون DB)');
  assert(dbCallCount === 1, `DB فقط ۱ بار صدا زده شد (${dbCallCount} بار)`);

  // ===== تست ۲: stale fallback =====
  section('تست ۲: DB fail → stale value');
  dbCallCount = 0;
  dbBehavior = 'success';
  memoryStore.clear();
  const get2 = safeCache(mockDbCall, { default: true }, { key: 'test2', ttl: 1 });
  await get2(); // موفق
  dbBehavior = 'fail';
  const r2 = await get2();
  assert(r2.value === 'call-1', 'مقدار stale برگشت (نه throw، نه fallback)');

  // ===== تست ۳: خطای اولیه → fallback =====
  section('تست ۳: خطای اولیه → fallback');
  dbCallCount = 0;
  dbBehavior = 'fail';
  memoryStore.clear();
  const FALLBACK_OBJ = { siteName: 'fallback' };
  const get3 = safeCache(mockDbCall, FALLBACK_OBJ, { key: 'test3', ttl: 1 });
  const r3 = await get3();
  assert(r3 === FALLBACK_OBJ, 'همان reference شیء fallback برگشت');
  assert(r3.siteName === 'fallback', 'fallback value درست است');
  assert(dbCallCount === 1, 'DB دقیقاً ۱ بار امتحان شد');

  // ===== تست ۴: TTL expired → دوباره DB =====
  section('تست ۴: TTL expired → دوباره DB call');
  dbCallCount = 0;
  dbBehavior = 'success';
  memoryStore.clear();
  const get4 = safeCache(mockDbCall, { default: true }, { key: 'test4', ttl: 1 });
  await get4();
  await sleep(1100); // بیشتر از TTL
  const r4 = await get4();
  assert(dbCallCount === 2, 'DB دوباره صدا زده شد پس از expire');
  assert(r4.value === 'call-2', 'مقدار جدید برگشت');

  // ===== تست ۵: سناریوی واقعی SiteLayout =====
  section('تست ۵: سناریوی SiteLayout با چند safeCache موازی');
  dbCallCount = 0;
  dbBehavior = 'success';
  memoryStore.clear();
  const getSettings = safeCache(mockDbCall, { siteName: 'fallback' }, { key: 'settings', ttl: 5 });
  const getAds = safeCache(mockDbCall, { success: true, data: [] }, { key: 'ads', ttl: 5 });
  const getRates = safeCache(mockArrayCall, [], { key: 'rates', ttl: 5 });

  const [s, a, r] = await Promise.all([getSettings(), getAds(), getRates()]);
  assert(s.value.startsWith('call-'), 'settings موفق');
  assert(a.value.startsWith('call-'), 'ads موفق');
  assert(Array.isArray(r) && r.length === 2, 'rates آرایه ۲ آیتمی');

  // حالا DB fail شود
  dbBehavior = 'fail';
  const [s2, a2, rates2] = await Promise.all([getSettings(), getAds(), getRates()]);
  assert(s2.value.startsWith('call-'), 'settings stale');
  assert(a2.value.startsWith('call-'), 'ads stale');
  assert(Array.isArray(rates2) && rates2.length === 2, 'rates stale (آرایه با ۲ آیتم)');

  // ===== تست ۶: آرگومان‌های متفاوت → cache متفاوت =====
  section('تست ۶: آرگومان‌های متفاوت → key متفاوت');
  dbCallCount = 0;
  dbBehavior = 'success';
  memoryStore.clear();
  const getParams = safeCache(
    async (id, locale) => {
      // به mockDbCall متصل می‌کنیم تا counter افزایش یابد
      await mockDbCall();
      return { id, locale, n: `result-${id}-${locale}` };
    },
    { default: true },
    { key: 'params-test', ttl: 60 },
  );
  const p1 = await getParams(1, 'fa');
  const p2 = await getParams(2, 'fa');
  const p3 = await getParams(1, 'en');
  const p1Again = await getParams(1, 'fa');
  assert(p1.n === 'result-1-fa', 'p1 ساخته شد');
  assert(p2.n === 'result-2-fa', 'p2 ساخته شد (key متفاوت)');
  assert(p3.n === 'result-1-en', 'p3 ساخته شد (key متفاوت)');
  assert(p1Again === p1, 'p1 دوباره از cache آمد (همان reference)');
  assert(dbCallCount === 3, `DB دقیقاً ۳ بار صدا زده شد (${dbCallCount} بار)`);

  // ===== خلاصه =====
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ موفق:   ${RESULTS.pass}`);
  console.log(`❌ ناموفق: ${RESULTS.fail}`);
  if (RESULTS.fail > 0) process.exit(1);
  console.log('🎉 همه‌ی تست‌ها موفق — safeCache آماده است');
}

main().catch((err) => { console.error('💥', err); process.exit(1); });
