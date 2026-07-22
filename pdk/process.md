# فرآیند توسعه

> **هماهنگ با AGENTS.md.** Workflow اصلی: Build → Show → Improve (AGENTS.md).  
> این فایل **سناریوهای عملیاتی** را شرح می‌دهد، نه جایگزین workflow اصلی.

---

## سناریو A — تسک روزمره (Trivial/Standard)

```
grep/read_file → PRE-CODE GATE (AGENTS.md) → کد → tsc → Show
```

نیاز به تأیید مرحله‌ای ندارد.

---

## سناریو B — قابلیت جدید بزرگ (Full — DB/Auth/Security)

```
۱. تحلیل → گزارش → تأیید کاربر
۲. schema/API design → تأیید
۳. security review → تأیید
۴. کد (Build → Show → Improve)
```

مثال: ساختن صفحه `/dashboard/permissions` از صفر

---

## سناریو C — صفحه UI جدید

```
۱. pdk/project-reality.md بخوان (صفحات موجود)
۲. Blueprint مرتبط بخوان (pdk/blueprints/)
۳. design-cycle.md اجرا کن (≥3 جهت، Anti-Slop)
۴. Build → Show → Improve
```

---

## سناریو D — endpoint/action مالی

```
۱. pdk/database.md — مدل درست را تأیید کن
۲. pdk/security.md — RBAC + threat model
۳. pdk/api.md — شکل پاسخ + خطا + idempotency
۴. Zod schema → server action/route → LedgerEntry → AuditLog
۵. tsc + تست
```

---

## سناریو E — migration دیتابیس

```
۱. schema.prisma بخوان — تغییر additive باشد
۲. migration یک هدف مشخص
۳. rollback plan مشخص
۴. بکاپ قبل از apply در production
```

---

## چک سریع قبل از کد

| سوال | اگر جواب «نه» است |
|------|-----------------|
| grep کردم — مشابه وجود ندارد؟ | reuse کن |
| schema واقعی است؟ | prisma/schema.prisma بخوان |
| API shape درست است؟ | pdk/api.md بخوان |
| auth/RBAC تعریف شده؟ | pdk/security.md بخوان |
| tsc پاس می‌کند؟ | قبل از show اجرا کن |
