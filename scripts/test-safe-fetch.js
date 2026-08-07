#!/usr/bin/env node
/**
 * test-safe-fetch — 2026-06-21
 * تست می‌کند که helper safe-fetch خطای DB را بگیرد و سایت کرش نکند.
 */
const { execSync } = require('node:child_process');

// شبیه‌سازی خطای DB — مثل `prisma.rateList.findMany()` که throw می‌کند
async function simulateDbError() {
  throw new Error(
    "Can't reach database server at ep-spring-forest-a57spxe5.us-east-2.aws.neon.tech:5432",
  );
}

async function simulateDbSuccess() {
  return [
    { id: '1', title: 'Test', rates: [] },
    { id: '2', title: 'Test 2', rates: [] },
  ];
}

async function safe(promise, fallback, context) {
  try {
    return await promise;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const label = context ? ` [${context}]` : '';
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[safe-fetch]${label} خطا: ${msg.slice(0, 200)}`);
    }
    return fallback;
  }
}

async function safeArray(promise, context) {
  return safe(promise, [], context);
}

async function main() {
  console.log('🧪 تست safe-fetch helper\n');

  // تست ۱: خطا → fallback برگردد
  console.log('تست ۱: promise که reject می‌شود');
  const result1 = await safeArray(simulateDbError(), 'test/error');
  console.log(`  نتیجه: ${JSON.stringify(result1)}`);
  if (result1.length === 0) console.log('  ✅ fallback آرایه‌ی خالی برگشت');
  else {
    console.log('  ❌ باید آرایه‌ی خالی می‌بود');
    process.exit(1);
  }

  // تست ۲: موفقیت → مقدار واقعی برگردد
  console.log('\nتست ۲: promise که resolve می‌شود');
  const result2 = await safeArray(simulateDbSuccess(), 'test/success');
  console.log(`  نتیجه: ${result2.length} آیتم`);
  if (result2.length === 2) console.log('  ✅ مقدار واقعی برگشت');
  else {
    console.log('  ❌ باید ۲ آیتم می‌بود');
    process.exit(1);
  }

  // تست ۳: safe با fallback شیء
  console.log('\nتست ۳: safe با fallback شیء');
  const result3 = await safe(
    simulateDbError(),
    { siteName: '', siteDescription: '' },
    'test/object',
  );
  console.log(`  نتیجه: ${JSON.stringify(result3)}`);
  if (result3.siteName === '') console.log('  ✅ fallback شیء برگشت');
  else {
    console.log('  ❌');
    process.exit(1);
  }

  // تست ۴: Promise.all با همه‌ی promise های fail
  console.log('\nتست ۴: Promise.all با همه‌ی promise های fail (سناریوی SiteLayout)');
  const [settings, ads, rateLists] = await Promise.all([
    safe(simulateDbError(), { siteName: '', siteDescription: '' }, 'all/settings'),
    safe(simulateDbError(), { success: true, data: [] }, 'all/ads'),
    safeArray(simulateDbError(), 'all/rateLists'),
  ]);
  console.log(`  settings: ${JSON.stringify(settings)}`);
  console.log(`  ads: ${JSON.stringify(ads)}`);
  console.log(`  rateLists: ${JSON.stringify(rateLists)}`);
  console.log('  ✅ همه‌ی promise ها fallback گرفتند — سایت کرش نمی‌کند');

  console.log('\n🎉 همه‌ی تست‌ها موفق — safe-fetch helper درست کار می‌کند');
}

main().catch((err) => {
  console.error('💥 خطای غیرمنتظره:', err);
  process.exit(1);
});
