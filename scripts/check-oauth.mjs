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
//   2) جریان واقعی ورود (مثل کلیک کاربر روی دکمهٔ «ورود با گوگل»):
//      GET /api/auth/csrf (نگه‌داشتن کوکی) → POST /api/auth/signin/{id}
//      → باید به صفحهٔ OAuth خود provider (accounts.google.com /
//      github.com/login) هدایت شود، نه به error=Configuration یا
//      error=MissingCSRF.
//
// ⚠️ چرا GET نیست؟ (2026-08-17) در Auth.js v5 هدایت OAuth فقط از طریق POST
// (submit فرم با CSRF) انجام می‌شود. GET /api/auth/signin/{provider} فقط
// صفحهٔ signin را رندر می‌کند و چون providerId دارد عمداً UnknownAction
// می‌اندازد → همیشه error=Configuration برمی‌گردد — حتی وقتی همه‌چیز سالم
// است. پس چک GET قبلی همیشه قرمز بود و هیچ‌چیز را ثابت نمی‌کرد.
//
// تشخیص‌های ویژه:
//   - Location حاوی error=MissingCSRF → پاسخ /api/auth/csrf از کش CDN آمده
//     (بدون Set-Cookie) — معمولاً Cloudflare Cache Rule دامنهٔ /api/auth/*
//     را هم می‌گیرد. راه‌حل: در Cache Rule استثنا بگذار (URI Path شروع نشود
//     با /api/auth) تا auth هرگز کش نشود.
//   - Location حاوی error=Configuration روی POST → AUTH_*_ID/SECRET در
//     .env خالی/غایب/ناسازگار است (یا callback در کنسول provider اشتباه است).
//
// خروجی: 0 = سالم، 1 = خطا (قابل استفاده در cron/CI).
// ============================================================================
const BASE = process.argv[2] ?? 'https://financialmarket.page';

function logFail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

/** کوکی‌های Set-Cookie یک پاسخ را به شکل هدر Cookie برمی‌گرداند. */
function cookiesToHeader(setCookies) {
  return setCookies
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ');
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
      logFail(
        `❌ [${id}] provider در لیست نیست — NODE_ENV=production ست نیست یا auth.config مشکل دارد.`,
      );
      continue;
    }

    // ۱) توکن CSRF + کوکی — دقیقاً مثل فرم صفحهٔ ورود.
    let csrf;
    try {
      const res = await fetch(`${BASE}/api/auth/csrf`, { redirect: 'manual' });
      const setCookies = res.headers.getSetCookie?.() ?? [];
      csrf = await res.json();

      const cfHit = res.headers.get('cf-cache-status');
      if (cfHit && cfHit.toUpperCase() !== 'DYNAMIC') {
        logFail(
          `❌ [${id}] پاسخ /api/auth/csrf از کش CDN آمده (cf-cache-status: ${cfHit}) — کوکی CSRF ندارد و ورود با error=MissingCSRF می‌شکند. در Cloudflare Cache Rule استثنا بگذار: URI Path نباید /api/auth/* را بگیرد.`,
        );
        continue;
      }
      if (!setCookies.some((c) => /csrf/i.test(c))) {
        logFail(`❌ [${id}] پاسخ /api/auth/csrf بدون Set-Cookie — کش CDN یا پراکسی در میان است.`);
        continue;
      }
      csrf.cookieHeader = cookiesToHeader(setCookies);
    } catch (err) {
      logFail(`❌ [${id}] دریافت CSRF ناموفق (${err.message}).`);
      continue;
    }

    // ۲) POST signin — همان درخواستی که دکمهٔ «ورود با …» می‌فرستد.
    let res;
    try {
      res = await fetch(`${BASE}/api/auth/signin/${id}`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: csrf.cookieHeader,
        },
        body: new URLSearchParams({
          csrfToken: csrf.csrfToken,
          callbackUrl: `${BASE}/`,
        }),
      });
    } catch (err) {
      logFail(`❌ [${id}] درخواست signin ناموفق (${err.message}).`);
      continue;
    }

    const loc = res.headers.get('location') ?? '';
    if (res.status === 302 && loc.includes('error=Configuration')) {
      logFail(
        `❌ [${id}] خطای Configuration روی POST — در .env روی VM مقدار AUTH_${id.toUpperCase()}_ID / AUTH_${id.toUpperCase()}_SECRET خالی/غایب/ناسازگار است یا callback در کنسول provider درست نیست.`,
      );
    } else if (res.status === 302 && loc.includes('error=MissingCSRF')) {
      logFail(
        `❌ [${id}] MissingCSRF — کوکی CSRF به سرور نرسیده؛ پاسخ /api/auth/csrf از کش CDN آمده است (Cache Rule باید /api/auth/* را از کش مستثنا کند).`,
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
