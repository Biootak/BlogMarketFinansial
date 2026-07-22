# قانون اساسی PDK (C1–C14)

> **غیرقابل مذاکره.** هیچ خروجی نباید با این قوانین تضاد داشته باشد.  
> **تضاد با AGENTS.md:** AGENTS.md در workflow/process حاکم است — این قوانین مکمل هستند.

---

## C1 — تحلیل قبل از کد
- grep + read_file قبل از هر تغییر
- Reuse → Refactor → Extend → New (به ترتیب)
- کد بدون تحلیل = نقض مستقیم

## C2 — کیفیت > سرعت
- Technical Debt آگاهانه ممنوع
- «کار می‌کند» کافی نیست — باید درست، ایمن، و قابل نگهداری باشد

## C3 — مخالفت سازنده
- اگر راه بهتری هست → همان لحظه به کاربر بگو
- هدف بهترین محصول است، نه تأیید

## C4 — ممنوع‌های مطلق
```
❌ any / ts-ignore / TODO / placeholder / console.log
❌ schema/API خیالی (غیرمستند از prisma/schema.prisma)
❌ کامپوننت تکراری (قبل از ساخت grep کن)
❌ طراحی کلیشه‌ای / AI Slop
❌ کتابخانه ترک‌شده / قدیمی
❌ تغییر معماری بدون دلیل
```

## C5 — زبان و RTL
- **UI:** فارسی (اصلی پروژه)
- **کد/دستور/مسیر:** انگلیسی
- **RTL:** همیشه — `margin-inline`, `padding-inline`, `inset-inline` — هرگز `left/right`
- `useDirection` hook از `@/hooks/useDirection`
- اعداد: `src/lib/fa-number.ts`

## C6 — Type Safety
- TypeScript strict — هیچ `any`، هیچ `ts-ignore`، هیچ `as` بدون دلیل
- همه ورودی خارجی با Zod

## C7 — امنیت = زیربنا
- هر endpoint: auth + RBAC + rate-limit + Zod validation
- داده مالی حساس: رمزنگاری at-rest + TLS
- Threat model قبل از پیاده‌سازی هر ماژول مالی جدید

## C8 — تست
- منطق مالی ≥80% coverage
- هر LedgerEntry/Transaction جدید تست دارد
- «بدون تست» = تحویل ممنوع برای کد مالی

## C9 — شکل API یکپارچه
```ts
{ success: true, data: T }
{ success: false, error: { code: string, message: string } }
```
کدهای خطا: `VALIDATION | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED | INTERNAL`

## C10 — قابلیت مشاهده
- هر عملیات حساس → `AuditLog` (actor, action, entityType, entityId, ip, beforeHash, afterHash)
- خطاها → Sentry — هیچ silent fail

## C11 — تأیید مرحله‌ای (فقط قابلیت P0 جدید)
- برای ساختن قابلیت‌های بزرگ جدید (KYC، Ledger، Auth): تحلیل → تأیید → کد
- برای تسک‌های روزمره: AGENTS.md Build→Show→Improve حاکم است

## C12 — Reuse اجباری
- **UI:** `src/components/ui/*` — هرگز Modal/Button/Input تکراری
- **DB:** فقط `@/lib/db` — هرگز `new PrismaClient()`
- **Auth:** `@/lib/auth`
- **Rate limit:** `@/lib/ratelimit` (Upstash)
- **Cache invalidation:** `@/lib/revalidate` — هرگز `next/cache` مستقیم
- قبل از هر صفحه UI: `src/components/ds/styles/tokens.css` بخوان

## C13 — Anti-Slop (فقط UI)
- design-cycle.md برای هر صفحه جدید
- روبربر AI-Slop: ≤2 مردود = قبول، بیشتر = بازگشت به گام 1

## C14 — تحقیق 2026
- هر تصمیم معماری/امنیت/UX: منبع 2026 اجباری
- منابع در `pdk/references.md` ثبت شوند
