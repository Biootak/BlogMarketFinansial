# AGENTS.19dqg.md — Quality Gates (19DQG + Completion Checklist)

> **بارگذاری:** قبل از هر اعلام «تمام».
> **گیت صفر (همه سطوح):** `npm run rules:check` سبز باشد — مهر «قوانین خوانده شد» تازه
> (AGENTS.md + PDK.md + `pdk/constitution.md` + topic files مرتبط). بدون آن `verify` قرمز است.
> **انتخاب gate:** سطح تسک را از جدول `AGENTS.md §تعریف سطح تسک` بخوان، سپس gate متناسب را اینجا اجرا کن:
> - Trivial → §Lite (10 چک)
> - Standard → §Standard (25 چک)
> - Full → §Full / 19DQG کامل

---

## §Lite — تسک‌های Trivial (10 چک)

```
[ ] L0. npm run rules:check → سبز (مهر «قوانین خوانده شد» تازه — بدون آن verify قرمز است)
[ ] L1. کد واقعی نوشته شد (نه فقط توضیح)
[ ] L2. فایل قبل از ویرایش re-read شد — نسخه stale نیست
[ ] L3. بدون TODO / console.log / stub / any
[ ] L4. RTL: فقط logical props — هرگز left/right
[ ] L5. Tokens: فقط --ds-* — هیچ hex hardcode
[ ] L6. npx tsc --noEmit → سبز
[ ] L7. npm run lint → سبز
[ ] L8. بدون import جدید از next/cache مستقیم یا new PrismaClient()
[ ] L9. هیچ unused import / dead code
[ ] L10. Post-task report یک‌خطی نوشته شد
```

---

## §Standard — تسک‌های معمولی (25 چک)

Lite (L1–L10) + موارد زیر:

```
[ ] S1.  همه callers/importers فایل‌های تغییریافته grep شدند
[ ] S2.  اگر type/interface تغییر کرد → همه consumers آپدیت شدند
[ ] S3.  auth check در هر Server Action/API route جدید
[ ] S4.  هر input با Zod validate شده
[ ] S5.  Error shape استاندارد { success:false, error:{ code, message } }
[ ] S6.  Cache tags بعد از هر write revalidate شدند (@/lib/revalidate)
[ ] S7.  همه UI states: loading / error / empty / success / disabled
[ ] S8.  هیچ N+1 query (Prisma include/select هدفمند)
[ ] S9.  Semantic HTML + Radix (نه div soup)؛ هر interactive element label دارد
[ ] S10. Post-task Report کامل (✅/⚠️/💡/🐛) نوشته شد
[ ] S11. داک رسمی 2026 بررسی شد — URL/منبع ذکر شد
[ ] S12. بخش‌های دیگر پروژه (nav/sidebar) بررسی شدند
[ ] S13. git status: فقط فایل‌های مرتبط تغییر کرده
[ ] S14. هیچ secret/token در client bundle یا NEXT_PUBLIC_*
[ ] S15. Cron/Env/Domain جدید → فایل‌های config آپدیت شدند
```

---

## §Full — 19DQG کامل

> ⛔ **VISIBLE OUTPUT اجباری:** نتیجهٔ هر D را در پیام بنویس:
> `[D1] ✅ — کد نوشته شد (4 فایل)` یا `[D13] N/A — backend only`
> نوشتن «19DQG انجام شد» بدون خروجی = نقض مستقیم.

```
【D1】 کد واقعی نوشته شد؟
      [ ] کد واقعی نوشته/ویرایش شد (نه فقط توضیح در چت)
      [ ] تمام فایل‌های وعده‌داده‌شده موجودند (نه partial/stub)
      [ ] هیچ بخشی در همین چت قول داده شد ولی skip شد

【D2】 وابستگی‌ها و cascade کامل شدند؟
      [ ] همه callers/importers فایل‌های تغییریافته grep و بررسی شدند
      [ ] Interface/type تغییر کرد → همه call sites سازگارند
      [ ] Symbol/Cron/Env/Domain جدید → registry+config+allowlist آپدیت شد

【D3】 امنیت رعایت شده؟
      [ ] هیچ secret در client bundle یا NEXT_PUBLIC_*
      [ ] هر API route جدید محافظت‌شده (requireUser/requireRole)
      [ ] هر input با Zod validate (هرگز raw req.body به DB)
      [ ] هیچ stack trace / raw DB error به کاربر نمی‌رسد
      [ ] Rate-limit برای mutating/auth endpoints بررسی شد
      [ ] عملیات مالی → idempotency-key + ledger-based

【D4】 هماهنگی بک‌اند ↔ فرانت‌اند برقرار است؟
      [ ] فرانت از API shape { success, data/error } استفاده می‌کند
      [ ] Cache tags بعد از هر write revalidate می‌شوند (@/lib/revalidate)
      [ ] همه UI states: loading / error / empty / success / disabled

【D5】 قوانین پروژه رعایت شده؟
      [ ] RTL: فقط logical props (ps-/pe-/ms-/me-)، هرگز left/right
      [ ] TS strict: no any، no @ts-ignore، no TODO/FIXME
      [ ] CSS: هیچ قانون جدید به globals.css / dashboard.css
      [ ] Tokens: فقط --ds-* و --nova-*؛ هیچ hex hardcode
      [ ] Prisma از @/lib/db؛ revalidateTag از @/lib/revalidate
      [ ] npx tsc --noEmit → سبز؛ npm run lint → سبز

【D6】 کد کامل است؟
      [ ] بدون console.log / debugger / throw new Error("TODO")
      [ ] بدون unused imports / dead code / temp files

【D7】 راهکار بهتری وجود داشت؟ (→ ر.ک §Pre-code Research Gate در AGENTS.md)
      [ ] Research block قبل از کد نوشته شد
      [ ] اگر راهکار بهتری هست → در همان پیام به کاربر گفته شد

【D8】 پروژه یکپارچه است؟
      [ ] Data pipeline تغییر کرد → assembler+registry+seed هماهنگند
      [ ] Cron تغییر کرد → cron-job.org (deploy/HEROKU.md مرحله ۵) + cron-auth.ts + comments هماهنگند
      [ ] منابع موازی داده بررسی شدند (→ ر.ک AGENTS.market-rates.md)

【D9】 Best practice 2026 رعایت شده؟
      [ ] Next.js 16+: use cache، Server Actions، App Router (نه pages/api)
      [ ] هیچ deprecated API بدون جایگزین
      [ ] Prisma: select explicit (نه select *)؛ transaction برای multi-write

【D10】 Performance رعایت شده؟
      [ ] هیچ N+1 query؛ داده‌های پرتکرار cache شده‌اند
      [ ] تصاویر با next/image؛ فونت با next/font
      [ ] هیچ unbounded DB read (pagination اضافه شد)

【D11】 Accessibility / a11y رعایت شده؟
      [ ] Semantic HTML + Radix؛ هر interactive element label دارد
      [ ] Keyboard navigation کامل؛ Focus ring دیدنی
      [ ] Touch target ≥44px؛ کنتراست ≥4.5:1 (اعداد مالی ≥7:1)

【D12】 Responsive / Dark mode [فقط UI]
      [ ] موبایل 375px: بدون overflow؛ text کمتر از 12px نیست
      [ ] dark mode: همه رنگ‌ها از token

【D13】 UI Design Quality Gate [فقط UI] (→ ر.ک AGENTS.uidqg.md)
      [ ] UIDQG کامل (UQ1–UQ22) اجرا شد و visible است
      [ ] Craft Bar §رد شد: عمق/motion/typography/micro-interaction/restraint/wow
      [ ] Comfortable Density: حس زوم 100٪ (نه 125٪ چسبیده)

【D14】 Database Safety [فقط DB/migration]
      [ ] Migration reversible؛ rollback plan موجود
      [ ] هرگز ستون populated را DROP بدون backup
      [ ] پول با Decimal (هرگز float)؛ UTC در DB

【D15】 Cleanup & Observability
      [ ] بدون unused import / temp file / debug artifact
      [ ] git status: فقط فایل‌های مرتبط
      [ ] عملیات حساس در audit log ثبت می‌شود

【D16】 هر خطا fix شد؟
      خطاها سه دسته‌اند (→ ر.ک §تضاد scope/fix در AGENTS.md):
      [ ] در scope → fix همان لحظه
      [ ] خارج scope ولی کوچک → fix + در post-task note
      [ ] خارج scope و بزرگ → به کاربر گفته شد + در post-task ثبت

【D17】 از کدهای موجود (Reuse-first) استفاده شد؟
      [ ] قبل از هر component/util/hook، repo با grep بررسی شد
      [ ] Component Decision Protocol: reuse → extend → compose → create

【D18】 از اینترنت با تاریخ امروز؟ + AGENTS patch لازم است؟
      [ ] Research block با تاریخ + منبع در پیام visible است
      [ ] اگر pattern جدیدی کشف شد → AGENTS patch همین سشن نوشته شد

【D19】 بخش‌های دیگر پروژه آپدیت شدند؟
      [ ] همه importers فایل‌های تغییریافته grep و بررسی شدند
      [ ] feature جدید → navigation/sidebar/sitemap آپدیت شد
      [ ] هیچ بخشی از پروژه stale/ناهماهنگ نمانده
```

---

## قانون loop

هر D که `[ ]` ماند → fix کن → از D1 دوباره شروع کن.
فقط وقتی همه `[✓]` یا `[N/A — دلیل]` شدند → اعلام «تمام» مجاز است.
