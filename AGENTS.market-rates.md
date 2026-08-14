# AGENTS.market-rates.md — Data Pipeline Conventions

> **بارگذاری:** فقط هنگام کار روی `src/lib/market-rates/*` یا cron های مرتبط.
> **Parallel data sources rule:** اگر دو منبع داده یک هدف مشترک دارند و تناقض/تکرار دارند → به کاربر بگو و یکی را deprecated کن. مثال: `refresh-market-rates` و `sync-bazaar` (sync-bazaar deprecated شد).

---

## قوانین اجباری پایپ‌لاین

- **Single source of truth:** `assembleMarketRates()` در `assembler.ts` تنها جایی است که نرخ محاسبه می‌شود. هیچ cron دیگری نباید مستقیم TGJU scrape کند و به DB بنویسد بدون عبور از assembler.

- **Priority chain (2026-07):**
  `manual` → `TGJU multi-page` → `sarafi.af (buy/sell AFN)` → `bonbast buy/sell (/json)` → `bonbast mid (derived)` → `USDT/Exir` → `FX API`
  هر منبع جدید باید در این زنجیره با priority صریح جای بگیرد.

- **bonbast.com — روش جدید (2026-07):**
  داده‌ها از طریق `POST /json` با one-time param دریافت می‌شوند.
  روش قدیمی `POST /converter` (mid-rate) و `GET /` (HTML parse با buy2/sell2 class) دیگر کار نمی‌کند — جداول HTML خالی هستند و از Firebase Realtime پر می‌شوند.
  روش جدید: ۱) GET صفحه اصلی → extract param token از JS snippet؛ ۲) POST /json با param → JSON با کلیدهای `usd1`/`usd2` (sell/buy).
  `fetchBonbastBuySell()` این دو مرحله را انجام می‌دهد.
  `fetchBonbastRates()` از همان نتیجه mid-rate derive می‌کند (بدون fetch جداگانه).
  در assembler، فقط یک بار `fetchBonbastBuySell()` صدا زده می‌شود و `BonbastRates` از `fetchBonbastRatesFromBuySell()` ساخته می‌شود.

- **Symbol naming:** prefix صریح اجباری است:
  `IRAN_*` · `AFGHANI_*` · `SARA_*` · `BONBAST_*` · `HERAT_*` · `GLOBAL_*`
  هر symbol جدید باید هم در `registry.ts` و هم در `seed-market-rates.ts` اضافه شود.

- **Snapshot JSON:** `public/data/market-rates.json` (runtime، untracked — داخل Docker نمی‌رود) توسط دو مسیر تازه‌سازی نوشته می‌شود:
  1. `/api/cron/push-rates` — GitHub Actions scrape می‌کند و push می‌کند (خارج از dyno).
  2. `/api/cron/refresh-market-rates` — cron-job.org هر ۵ دقیقه صدا می‌زند؛ dyno با lock + throttle + sequential + pageCache (TTL 6 دقیقه) assemble می‌کند (memory-safe).
  هر دو به `persistMarketRates` می‌رسند. `sync-bazaar` deprecated است.
  ⚠️ GitHub Actions schedule در این repo throttle می‌شود (رن‌ها هر ۶۰-۹۰ دقیقه می‌آیند) — پس مسیر قابل‌اعتماد برای تازگی ۵ دقیقه‌ای، cron-job.org → refresh-market-rates است، نه GitHub schedule.

- **comments در cron files:** هر جایی که auth mechanism در comment ذکر می‌شود (`x-cron-secret`، `?secret=`) باید با آنچه `cron-auth.ts` واقعاً می‌پذیرد (فقط `Authorization: Bearer`) مطابق باشد.

---

## Cascade checklist (هر تغییر در این پایپ‌لاین)

```
[ ] assembler.ts تغییر کرد → registry.ts + seed-market-rates.ts بررسی شد
[ ] symbol جدید → registry.ts + seed + هر UI که نرخ را نمایش می‌دهد
[ ] cron تغییر کرد → vercel.json + cron-auth.ts + comments هماهنگ است
[ ] منبع داده جدید → priority chain مستند شد
[ ] comment درباره auth → با کد cron-auth.ts تطبیق داده شد
```
