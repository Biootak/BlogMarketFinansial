# معماری (Architecture)

> **واقعیت ریپو:** بلاگ مالی فارسی + پلتفرم صرافی — روی زیرساخت موجود توسعه می‌یابد.

---

## Stack تأییدشده

| لایه | ابزار | نکته |
|------|-------|------|
| Frontend | Next.js 16 App Router + React 19 | Server Components پیش‌فرض |
| Language | TypeScript 5.7 strict | no any |
| Styling | Tailwind v4 (CSS-first) + `tokens.css` | هرگز hex/rgb مستقیم |
| DB | PostgreSQL + Prisma 6 | singleton از `@/lib/db` |
| Auth | NextAuth v5 (beta) | `@/lib/auth` |
| Cache/RateLimit | Upstash Redis | `@/lib/ratelimit` |
| Async jobs | BullMQ (P2 — هنوز نیست) | تسویه + اعلان |
| Observability | Sentry + AuditLog | هر عملیات حساس |
| Deploy | Vercel (web) | داده حساس: زیرساخت کنترل‌شده |

---

## اصول معماری

**Server-first:** کامپوننت‌ها پیش‌فرض Server Component — فقط برگ‌های تعاملی `"use client"`

**Boundary مالی:** منطق مالی هرگز در client — فقط Server Action یا API Route

**Double-entry Ledger:**
```
هر تراکنش = حداقل ۲ LedgerEntry (DEBIT + CREDIT)
هیچ بروزرسانی مستقیم balance بدون LedgerEntry
FintechAccount.balance = snapshot فقط (منبع حقیقت = LedgerEntry)
```

**Idempotency:** هر عملیات مالی `idempotencyKey` — Redis TTL معقول

**Tenant isolation:** هر query فین‌تک حتماً `exchangeId` filter دارد

**Cache tags** (از `@/lib/revalidate`):
```
posts | categories | dashboard-stats | exchange-rates | ticker
rate-lists | advertisements | header-ad | permissions | sidebar-data
```

---

## ساختار route groups

```
src/app/
  (public)/        # سایت عمومی (بلاگ، نرخ ارز)
  dashboard/       # همه صفحات dashboard (32 صفحه — project-reality.md)
  api/v1/          # Route Handlers
```

---

## جریان تراکنش مالی (الگوی اجباری)

```
Client
  → Server Action
    → Zod validation
    → idempotency check (Redis)
    → Transaction PENDING (Prisma transaction)
    → LedgerEntry × 2
    → FintechAccount.balance snapshot
    → AuditLog
    → Notification
  ← response

on error:
  → Transaction.status = FAILED
  → reversal LedgerEntry
  → AuditLog (with error detail)
```

---

## ADR — تصمیم‌های مهم

| تصمیم | گزینه انتخاب‌شده | دلیل |
|-------|-----------------|------|
| ORM | Prisma 6 | موجود + singleton + type-safe |
| Auth | NextAuth v5 | موجود + session + RBAC |
| Ledger | Double-entry FintechAccount | PCI + immutability |
| Wallet | thin projection → FintechAccount | VirtualCard compatibility |
| i18n | next-intl (P2) | هنوز پیاده نشده |
| Queue | BullMQ روی Redis (P2) | async jobs |

> هر تصمیم معماری جدید در `pdk/adr/` ثبت شود (context + decision + consequences).
