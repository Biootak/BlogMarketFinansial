# بخش ۳ — معماری (Architecture)

> **وضعیت:** این ریپو یک بلاگ مالی فارسی موجود است که طبق تصمیم کاربر به **فین‌تک افغانستان گسترش می‌یابد** (دوزبانه فارسی+دری/پشتو، AFN). جزئیات در [`project-reality.md`](project-reality.md). معماری زیر روی زیرساخت موجود بنا می‌شود، نه از صفر.

## ۳.۰ بازاستفاده از زیرساخت موجود
- `lib/db.ts` (Prisma singleton)، `lib/auth/*` (NextAuth v5)، `lib/ratelimit` (Upstash).
- `src/components/ui/*` (کامپوننت‌های shadcn/Radix) و `src/components/ds/*` (توکن‌های OKLCH).
- route group جدید `(fintech)` در کنار `(site)` / `dashboard` موجود.

## ۳.۱ شکاف‌های حیاتی (باید ساخته شود)
- **i18n:** لایه locale وجود ندارد (سخت‌کد `fa_IR`). پیشنهاد: `next-intl` + dictionaries فارسی/دری/پشتو.
- **لایه مالی:** Wallet / LedgerEntry / Transaction / Device / Permission (به `database.md` مراجعه شود).
- **احراز بانکی:** افزودن Passkey/WebAuthn + ۲FA + audit log مالی روی NextAuth موجود.

## ۳.۱ Stack پیشنهادی (الگو، نه الزام سخت)
- **Frontend/Web:** Next.js 16 (App Router، React Server Components) + TypeScript strict + Tailwind CSS v4.
- **Backend/API:** شروع با Route Handlers / Server Actions درون Next.js؛ در صورت نیاز، API مجزا با **Hono** یا **NestJS** (TypeScript).
- **Database:** PostgreSQL + Prisma ORM (singleton از `@/lib/db`).
- **Cache / Session / Rate-limit / Queue:** Redis (Upstash یا self-hosted).
- **Auth:** Auth.js (NextAuth v5) یا Better Auth؛ WebAuthn/Passkey + TOTP 2FA + device-bound session.
- **Async jobs:** BullMQ (روی Redis) برای پردازش تراکنش/اعلان/تسویه.
- **Observability:** structured logging، audit log، OpenTelemetry (اختیاری).
- **Deploy:** Web روی Vercel؛ سرویس‌های حساس مالی روی زیرساخت کنترل‌شده؛ بررسی اقامت داده افغانستان (DAB).

## ۳.۲ اصول معماری
- **Server-first:** کامپوننت‌ها پیش‌فرض Server Component؛ فقط برگ‌های تعاملی `"use client"`.
- **Boundary صریح:** منطق مالی/احراز هرگز در client؛ فقط در server action / API.
- **Double-entry Ledger:** پول با سیستم ثبت دوطرفه و immutable entries. هیچ به‌روزرسانی مستقیم موجودی بدون ثبت تراکنش.
- **Idempotency:** هر عملیات مالی idempotent (idempotency-key).
- **جداسازی محیط (Scope reduction):** محیط پردازش داده حساس (CDE) ایزوله (اصل PCI DSS v4.0.1).
- **Cache tags:** `unstable_cache` با tagهای معین؛ `revalidateTag` فقط از `@/lib/revalidate`.
- **Feature-based structure:** ویژگی‌ها در پوشه‌های مستقل با public API صریح (الهام از Feature-Sliced Design) برای کم‌کردن کوپلینگ.

## ۳.۳ ساختار پوشه‌ها
```
src/
  app/                  # routes (App Router)
    (public)/
    (dashboard)/
      wallet/ transfer/ admin/
  features/             # ویژگی‌ها با جداسازی
    wallet/ transfer/ kyc/
  lib/
    db.ts               # Prisma singleton
    auth/ rbac/ audit/ ratelimit/ revalidate.ts
  components/           # shared UI (design system)
  hooks/                # useDirection و غیره
  tokens/               # طراحی توکن‌ها (هم‌سنک با Figma)
  types/
prisma/  schema.prisma  migrations/
tests/
```

## ۳.۴ جریان تراکنش (مثال)
```
Client ──(Server Action)──▶ validate (Zod)
        └──▶ idempotency check (Redis)
              └──▶ open ledger entry (PENDING)
                    └──▶ call payment rail (HesabPay/…)  [async via BullMQ]
                          └──▶ on success: post entries, notify, audit
                          └──▶ on fail: reverse, notify, audit
```

## ۳.۵ ADR (Architecture Decision Records)
هر تصمیم معماری مهم در `pdk/adr/` ثبت شود:
- عنوان، تاریخ، وضعیت.
- Context (مسئله)، Decision (تصمیم)، Consequences (پیامدها).
- Alternatives (گزینه‌های رد‌شده + دلیل).
