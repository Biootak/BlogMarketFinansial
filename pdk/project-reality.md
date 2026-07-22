# بخش ۰ — تحلیل واقعیت ریپو (Project Reality)

> **آخرین بروزرسانی:** 2026-07  
> **منبع حقیقت:** این فایل بر اساس بررسی مستقیم کد، schema، و صفحات موجود نوشته شده — نه فرض.

---

## ۰.۱ این ریپو الان چیست؟

یک **بلاگ مالی فارسی** که به **پلتفرم صرافی/فین‌تک** گسترش پیدا کرده.  
دامنه اصلی: `blogmarketfinansial.ir` — Stack: Next.js 16 + Prisma + PostgreSQL + NextAuth v5.

---

## ۰.۲ استک تأییدشده

| ابزار | نسخه | وضعیت |
|-------|------|--------|
| Next.js (App Router) | 16.2.9 | ✅ |
| React | 19 | ✅ |
| TypeScript | 5.7 strict | ✅ |
| Tailwind CSS | v4 (CSS-first) | ✅ |
| Prisma + PostgreSQL | v6 | ✅ |
| NextAuth | v5 (beta) | ✅ |
| Radix UI + CVA | کامل | ✅ |
| Zod + React Hook Form | آماده | ✅ |
| Upstash Redis (rate limit) | موجود | ✅ |
| Sentry / SWR / Zustand | موجود | ✅ |
| TipTap (editor) | موجود | ✅ |

---

## ۰.۳ Design System موجود

**منبع حقیقت توکن‌ها:** `src/components/ds/styles/tokens.css`

- **برند:** indigo/periwinkle `#5E6AE6` (`--color-primary-500`)
- **رنگ‌بندی:** OKLCH کم‌اشباع — تخصصی، غیر AI-Slop
- **کامپوننت‌ها:** `src/components/ui/` (shadcn روی Radix): Button, Card, Input, Dialog, Badge, Skeleton, Table, Sheet, Tooltip, Toast, Tabs, Select, Switch, Checkbox, Avatar, …
- **Motion:** CSS-driven — `@property` + scroll-driven + `prefers-reduced-motion`
- **RTL:** logical properties کامل + `useDirection` hook در `@/hooks/useDirection`
- **فونت:** Vazirmatn + `src/lib/fa-number.ts` برای اعداد فارسی

> ⚠️ قانون C12: هیچ سیستم طراحی رقیب نساز. همه صفحات جدید روی این DS بنا می‌شوند.

---

## ۰.۴ صفحات dashboard موجود (32 صفحه — وضعیت واقعی)

### بلاگ/محتوا
| مسیر | وضعیت |
|------|--------|
| `/dashboard` | ✅ اصلی |
| `/dashboard/posts` | ✅ |
| `/dashboard/categories` | ✅ |
| `/dashboard/advertisements` | ✅ |
| `/dashboard/header-ad` | ✅ |

### کاربران و احراز
| مسیر | وضعیت |
|------|--------|
| `/dashboard/users` | ✅ |
| `/dashboard/kyc` | ✅ |
| `/dashboard/kyc-review` | ✅ |
| `/dashboard/edit-profile` | ✅ |
| `/dashboard/devices` | ✅ |
| `/dashboard/billing-address` | ✅ |

### فین‌تک / صرافی
| مسیر | وضعیت |
|------|--------|
| `/dashboard/wallet` | ✅ |
| `/dashboard/virtual-cards` | ✅ |
| `/dashboard/transfer` | ✅ |
| `/dashboard/my-deals` | ✅ |
| `/dashboard/exchange-rates` | ✅ |
| `/dashboard/exchange-quotes` | ✅ |
| `/dashboard/exchanges` + `[id]` | ✅ |
| `/dashboard/transfer-providers` | ✅ |
| `/dashboard/rate-lists` | ✅ |
| `/dashboard/settlements` | ✅ |
| `/dashboard/service-requests` | ✅ |
| `/dashboard/my-requests` | ✅ |
| `/dashboard/fraud-review` | ✅ |

### سیستم/مدیریت
| مسیر | وضعیت |
|------|--------|
| `/dashboard/settings` | ✅ |
| `/dashboard/reports` | ✅ |
| `/dashboard/audit-log` | ✅ |
| `/dashboard/subscription` | ✅ |

### **صفحات غایب — باید ساخته شوند**
| صفحه | اولویت | توضیح |
|------|--------|-------|
| `/dashboard/permissions` | P0 | مدیریت `Permission` + `RolePermission` + `ExchangeStaff` |
| `/dashboard/exchange-staff` | P1 | مدیریت کارمندان صرافی (ادمین صرافی) |
| `/dashboard/customers` | P1 | مدیریت مشتریان هر صرافی |

---

## ۰.۵ Schema واقعی (مدل‌های تأییدشده از prisma/schema.prisma)

### مدل‌های اصلی فین‌تک
```
Exchange          — صرافی (slug, licenseNo, status, allowedCurrencies, ...)
ExchangeStaff     — کارمند صرافی (role: OWNER|MANAGER|STAFF|VIEWER, permissions[])
Customer          — مشتری صرافی (kycLevel, riskScore, personalLimitAf, ...)
FintechAccount    — حساب مالی (type: WALLET|CASH|BANK|CRYPTO, balance BigInt)
Wallet            — thin projection روی FintechAccount (برای VirtualCard)
VirtualCard       — کارت مجازی (brand, last4, status, currency WalletCurrency)
Transaction       — تراکنش (kind, status, idempotencyKey, ...)
LedgerEntry       — ورودی دفتر دوطرفه (direction: DEBIT|CREDIT, runningBalance)
ExchangeRateQuote — قیمت‌گذاری صرافی (status: PENDING|ACTIVE|REJECTED|EXPIRED|LOCKED)
CurrencyDeal      — معامله ارزی (channel: ONLINE|INPERSON|PHONE)
Settlement        — تسویه
FraudReview       — بررسی تقلب (riskScore, status)
KycVerification   — تأیید هویت مشتری (level, encryptedData)
KycRecord         — سابقه KYC کاربر سیستم
Device            — دستگاه (status: TRUSTED|UNVERIFIED|REVOKED)
Permission        — مجوز (key, description)
RolePermission    — ربط نقش به مجوز
AuditLog          — لاگ حسابرسی غیرقابل‌تغییر
```

### نقش‌های واقعی (Role enum)
```
USER | AUTHOR | ADMIN | OWNER | TEST_CUSTOMER | CUSTOMER | MERCHANT | EXCHANGE | SUPPORT | SUPERADMIN
```

### نقش‌های ExchangeStaff
```
OWNER | MANAGER | STAFF | VIEWER
```

---

## ۰.۶ شکاف‌های باقی‌مانده

| شکاف | اولویت | راه‌حل |
|------|--------|---------|
| صفحه مجوزها (`/permissions`) | P0 | CRUD روی `Permission` + `RolePermission` |
| صفحه کارمندان صرافی | P1 | مدیریت `ExchangeStaff` در context هر صرافی |
| صفحه مشتریان | P1 | مدیریت `Customer` با فیلتر kycLevel/status |
| i18n (دری/پشتو) | P2 | `next-intl` + dictionaries |
| Passkey/WebAuthn | P2 | افزودن روی NextAuth موجود |
| تسویه‌حساب خودکار | P2 | `Settlement` + BullMQ |
| تست پوشش | P1 | ≥80% روی منطق مالی |

---

## ۰.۷ قوانین جاری‌ساز

1. **هر صفحه جدید:** از `src/components/ui/*` + `src/components/ds/styles/tokens.css` شروع کن.
2. **هر عملیات مالی:** از `FintechAccount` + `LedgerEntry` — نه Wallet مستقیم.
3. **هر endpoint:** `{ success: true, data }` یا `{ success: false, error: { code, message } }`.
4. **Prisma:** فقط از `@/lib/db` — هرگز `new PrismaClient()`.
5. **revalidateTag:** فقط از `@/lib/revalidate`.
