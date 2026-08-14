# AGENTS.md — Kimchi trigger

> هر پیامی که با `قوانین` / `AGENTS` / `rules` شروع شود → re-load rules first.
> قوانین کامل و canonical: `AGENTS.md` (ریشه) — این فایل فقط trigger را نگه می‌دارد.

## گام صفر هر تسک (قبل از هر کد)

1. `npm run rules:check` — بدون مهر تازه FAIL می‌دهد و لیست فایل‌ها را نشان می‌دهد.
2. اگر FAIL: `AGENTS.md` + `PDK.md` + `pdk/constitution.md` + topic files مرتبط را بخوان.
3. `npm run rules:stamp -- --files "AGENTS.md,PDK.md,pdk/constitution.md"` — مهر sha256.
4. بعد کد بنویس. بدون مهر تازه: verify قرمز + commit بلاک (pre-commit hook).

> مهر با تغییر AGENTS/PDK/constitution خودکار باطل می‌شود؛ TTL پیش‌فرض ۱۲۰ دقیقه.
