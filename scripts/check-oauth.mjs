#!/usr/bin/env node
// ============================================================================
// Smoke-check ورود اجتماعی (Google / GitHub) روی production.
// ----------------------------------------------------------------------------
// از هر ماشینی قابل اجراست — نیازی به VM ندارد:
//   node scripts/check-oauth.mjs [base-url]        (پیش‌فرض: https://financialmarket.page)
//
// چه چیزی را چک می‌کند:
//   1) /api/auth/providers → هر دو provider باید در لیست باشند (یعنی
//      NODE_ENV=production و auth.config درست بار شده).
//   2) /api/auth/signin/{google,github} → باید به صفحهٔ OAuth خود provider
//      (accounts.google.com / github.com/login) هدایت شود، نه به
//      `error=Configuration` (که یعنی AUTH_GOOGLE_ID/SECRET یا
//      AUTH_GITHUB_ID/SECRET در .env خالی/غایب‌اند).
//
// خروجی: 0 = سالم، 1 = خطا (قابل استفاده در cron/CI).
// ============================================================================
const BASE = process.argv[2] ?? 'https://financialmarket.page';

function logFail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

async function main() {
  let providers;
  try {
    const res = await fetch(`${BASE}/api/auth/providers`, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    providers = await res.json();
  } catch (err) {
    logFail(`❌ /api/auth/providers در دسترس نیست (${err.message}) — سایت/شبکه را چک کن.`);
    return;
  }

  for (const id of ['google', 'github']) {
    if (!providers[id]) {
      logFail(`❌ [${id}] provider در لیست نیست — NODE_ENV=production ست نیست یا auth.config مشکل دارد.`);
      continue;
    }
    let res;
    try {
      res = await fetch(`${BASE}/api/auth/signin/${id}`, { redirect: 'manual' });
    } catch (err) {
      logFail(`❌ [${id}] درخواست signin ناموفق (${err.message}).`);
      continue;
    }
    const loc = res.headers.get('location') ?? '';
    if (res.status === 302 && loc.includes('error=Configuration')) {
      logFail(
        `❌ [${id}] خطای Configuration — در .env روی VM مقدار AUTH_${id.toUpperCase()}_ID / ` +
          `AUTH_${id.toUpperCase()}_SECRET خالی یا غایب است (یا callback در کنسول provider ناسازگار است).`,
      );
    } else if (res.status === 302 && /accounts\.google\.com|github\.com\/login/.test(loc)) {
      console.log(`✅ [${id}] به صفحهٔ OAuth provider هدایت شد (پیکربندی runtime درست است).`);
    } else {
      logFail(`⚠️ [${id}] وضعیت غیرمنتظره: HTTP ${res.status} → ${loc.slice(0, 100)}`);
    }
  }
}

main().catch((err) => {
  logFail(`❌ اجرای چک ناموفق: ${err.message}`);
});
