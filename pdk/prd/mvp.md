# PRD — وضعیت پیاده‌سازی و نقشه راه

> **آخرین بروزرسانی:** 2026-07  
> **منبع حقیقت:** بررسی مستقیم schema.prisma + کد موجود

---

## ✅ پیاده‌شده (32 صفحه)

| حوزه | صفحات |
|------|-------|
| بلاگ | dashboard، posts، categories، advertisements، header-ad |
| کاربران | users، kyc، kyc-review، edit-profile، devices، billing-address |
| فین‌تک | wallet، virtual-cards، transfer، my-deals، exchange-quotes، exchanges/[id] |
| صرافی | exchange-rates، transfer-providers، rate-lists، settlements، service-requests، my-requests |
| مدیریت | fraud-review، audit-log، reports، settings، subscription |

---

## ❌ باقیمانده — اولویت‌بندی

### P0 — حیاتی (بدون این‌ها سیستم ناقص است)

| # | فیچر | مسیر | Schema | blueprint |
|---|------|------|--------|-----------|
| 1 | مدیریت مجوزها | `/dashboard/permissions` | `Permission` + `RolePermission` | `blueprints/permissions.md` |
| 2 | کارمندان صرافی | `/dashboard/exchanges/[id]` (tab) | `ExchangeStaff` | `blueprints/exchange-staff.md` |
| 3 | مشتریان صرافی | `/dashboard/customers` | `Customer` + `FintechAccount` + `KycVerification` | `blueprints/customers.md` |

### P1 — مهم (مشکل عملیاتی ایجاد می‌کند)

| # | فیچر | مسیر | Schema | توضیح |
|---|------|------|--------|-------|
| 4 | اعلان‌ها | `/dashboard/notifications` | `Notification` | مدل + action موجود — فقط UI + badge sidebar |
| 5 | حساب‌های مالی چندگانه | `/dashboard/accounts` | `FintechAccount` (چند نوع) | Wallet فعلی فقط یک حساب نشان می‌دهد |
| 6 | تست‌های مالی | `tests/` | `LedgerEntry` + `Transaction` | هیچ تست — خطر جدی روی منطق مالی |
| 7 | پروفایل صرافی | `/dashboard/exchange-profile` | `Exchange` + `ExchangeStaff` | کاربر EXCHANGE اطلاعات صرافیش را نمی‌بیند |
| 8 | گزارش مالی | `/dashboard/reports` (بسط) | `Transaction` + `CurrencyDeal` + `Settlement` | reports فعلی فقط لاگ سیستم است |

### P2 — بعدی

| فیچر | ابزار | توضیح |
|------|-------|-------|
| Passkey/WebAuthn | `Device` + NextAuth | ورود بدون رمز |
| اعلان real-time | Server-Sent Events | badge بدون refresh |
| تسویه خودکار | `Settlement` + BullMQ | دوره‌ای — PENDING → تأیید ادمین |
| i18n دری/پشتو | next-intl | لایه روی UI فارسی |
| QR پرداخت | `Transaction` + QR | دریافت وجه با QR |

---

## ترتیب پیاده‌سازی پیشنهادی

```
۱. permissions     — پایه RBAC (1 روز)
۲. exchange-staff  — tab در exchanges/[id] (1 روز)
۳. notifications   — schema+action موجود، فقط UI (1 روز)
۴. customers       — بزرگ‌ترین صفحه، چند تب (2–3 روز)
۵. tests/fintech   — safety net بعد از تثبیت (2 روز)
۶. exchange-profile — از data کارمندان (1 روز)
۷. reports/fintech  — بسط صفحه موجود (2 روز)
```

---

## PRD خلاصه — P0

### ۱. مجوزها (`/dashboard/permissions`)
- **هدف:** ADMIN/SUPERADMIN ماتریس نقش×مجوز را مدیریت کنند
- **قوانین:** SUPERADMIN همیشه همه (read-only) — تغییر batch atomic — حذف فقط اگر بلااستفاده
- **امنیت:** `requirePermission('permissions:manage')` + AuditLog
- **وابستگی:** `Permission`, `RolePermission`, `@/lib/revalidate` (tag: `permissions`)

### ۲. کارمندان صرافی (tab در `exchanges/[id]`)
- **هدف:** OWNER/ADMIN کارمندان صرافی را دعوت/لغو/تغییر نقش کنند
- **قوانین:** فقط ADMIN سیستم یا OWNER صرافی — تغییر OWNER فقط SUPERADMIN
- **امنیت:** AuditLog برای هر تغییر نقش/لغو

### ۳. مشتریان صرافی (`/dashboard/customers`)
- **هدف:** EXCHANGE/ADMIN مشتریان را با KYC، تراکنش، و دستگاه مدیریت کنند
- **قوانین:** EXCHANGE فقط `exchangeId` خودش — KYC approve → Customer.kycLevel بروز — فریز → FintechAccount.status=FROZEN
- **امنیت:** tenant isolation اجباری + AuditLog هر تغییر
