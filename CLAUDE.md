# CLAUDE.md

> این ریپو از قرارداد استاندارد **AGENTS.md** (2026 — پشتیبانی ۳۰+ ابزار) پیروی می‌کند.
> قوانین کامل: `AGENTS.md`. این فایل فقط برای ابزارهایی است که `CLAUDE.md` را می‌خوانند.

## ⛔ قبل از هر کد — Rules Read Gate (اجباری)

1. `npm run rules:check` را اجرا کن.
2. اگر FAIL داد → این فایل‌ها را **واقعاً** بخوان:
   - `AGENTS.md` · `PDK.md` · `pdk/constitution.md` + topic files مرتبط با تسک
3. بعد مهر بزن:
   - `npm run rules:stamp -- --files "AGENTS.md,PDK.md,pdk/constitution.md"`
4. فقط بعد از مهر، کد بنویس — بدون مهر تازه:
   - `npm run verify` قرمز است (تسک «تمام» نمی‌شود)
   - git commit بلاک می‌شود (pre-commit hook)
   - `npm run rules:log` → audit trail (چه کسی/کی چه فایل‌هایی را خوانده)

> مهر هر ۱۲۰ دقیقه منقضی می‌شود و اگر AGENTS/PDK/constitution تغییر کنند خودکار باطل می‌شود.
> جزئیات: `AGENTS.md §Pre-Code Rule Reading`.
