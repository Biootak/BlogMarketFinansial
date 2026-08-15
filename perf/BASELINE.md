# Perf Baseline — 2026-08-15

آرشیو اولین اندازه‌گیری Lighthouse production (پس از فیکس TTFB/SSG و آپگرید Next 16.3.1).
مقدارهای بعدی باید با همین روش (لایتن‌هاوس موبایل روی رانر تمیز گیت‌هاب، production واقعی)
گرفته و این فایل به‌روزرسانی شود — این کار «گیت رگرسیون» بین رلیزها است.

## محیط اندازه‌گیری

| | |
|---|---|
| تاریخ | 2026-08-15 |
| کامیت | `e4085329` (فیکس تصاویر + آپگرید 16.3.1) |
| محیط | production واقعی `https://financialmarket.page` |
| Runner | ubuntu-latest (گیت‌هاب) — Lighthouse mobile، ۶ صفحه عمومی |
| روش | `gh workflow run lighthouse-audit` → جدول در لاگ |

## Lighthouse Mobile

| صفحه | PERF | FCP | LCP | TBT | CLS | TTFB |
|------|------|-----|-----|-----|-----|------|
| home | 47 | 2.8s | 7.7s | 1,090ms | 0.018 | 470ms |
| exchanges | 68 | 2.6s | 6.5s | 220ms | 0.004 | 360ms |
| money-transfer | 63 | 2.9s | 6.5s | 340ms | 0.008 | 280ms |
| exchange-rates | 51 | 3.2s | 7.0s | 770ms | 0.004 | 250ms |
| archive | 64 | 2.9s | 6.3s | 340ms | 0.004 | 540ms |
| about | 72 | 2.6s | 5.6s | 210ms | 0.005 | 540ms |

نکته‌های مهم:
- **TTFB** قبلاً cold start ۱۷–۲۳ ثانیه بود → 250–540ms (فیکس SSG/ISR جواب داد).
- **LCP** ضعیف‌ترین متریک بود — علت: بهینه‌ساز sharp داخلی روی dyno ضعیف (Heroku Eco 512MB)
  هر تصویر را request-time پردازش می‌کرد. رفع 2026-08-15: `loaderFile` → CDN های تصویر.
- **TBT** بالا بود — علت: headlessui (~۱۰۹KB) + react-icons (چند set) در first-load.
  رفع 2026-08-15: MenuBar lazy + یکسان‌سازی آیکون‌ها به lucide.

## بودجه‌های هدف (Core Web Vitals — موبایل)

| متریک | بودجه | وضعیت در baseline |
|-------|-------|-------------------|
| LCP | ≤ 2.5s | ❌ 5.6–7.7s |
| TBT | ≤ 200ms | ❌ 210–1,090ms |
| FCP | ≤ 1.8s | ❌ 2.6–3.2s |
| CLS | < 0.1 | ✅ 0.004–0.018 |
| TTFB | ≤ 800ms | ✅ 250–540ms |
| PERF score | ≥ 80 | ❌ 47–72 |

## گیت مکانیکی (bundle)

اعداد قطعی JS خام/gzip در `perf/bundle-baseline.json` (تولیدشده با `npm run perf:snapshot`).
بررسی: `npm run perf:gate` — بعد از هر build پروداکشن، قبل از دیپلوی.
