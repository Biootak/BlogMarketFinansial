# بخش ۶ — قراردادهای دیتابیس (Database)

## ۶.۱ اصول
- Prisma singleton از `@/lib/db`؛ هرگز `new PrismaClient()` در کد.
- نام جداول: PascalCase در schema، snake_case در DB (توسط Prisma).
- اندیس‌گذاری روی فیلدهای جستجو (userId، createdAt، status).
- مهاجرت‌ها همیشه کدبیس باشند؛ هرگز `prisma migrate reset` در production.
- Soft-delete برای موجودیت‌های مالی (ستون `deletedAt`).
- Timezone یکپارچه (UTC در DB؛ نمایش با timezone کاربر).
- Decimal برای پول (هرگز float).

## ۶.۲ Ledger (ستون فقرات مالی)
- جدول `transaction` (immutable) + `ledger_entry` دوطرفه.
- موجودی از ledger مشتق شود، نه ذخیره خام.
- هر ورودی: `id`, `accountId`, `direction` (DEBIT/CREDIT), `amount`, `currency`, `status`, `createdAt`, `idempotencyKey`.
- وضعیت‌ها: `PENDING`, `POSTED`, `REVERSED`, `FAILED`.

## ۶.۳ مدل‌های پیشنهادی (تمدید schema موجود — نه جایگزینی)

> **واقعیت:** ریپو از قبل `User/Account/Session/Notification/ActivityLog/TransferProvider/ExchangeRate/ServiceRequest` دارد (بلاگی). فین‌تک را با **افزودن** مدل‌های زیر تمدید کن.
> `Role` enum فعلی `USER/AUTHOR/ADMIN/OWNER` است → تمدید به `customer/merchant/exchange/support/admin/superadmin`.

```
Wallet       (id, userId, currency, balanceSnapshot, createdAt)   # جدید
LedgerEntry  (id, transactionId, accountId, direction, amount, createdAt)  # جدید
Transaction  (id, accountId, type, amount, currency, status, idempotencyKey, createdAt)  # جدید
Device       (id, userId, fingerprintHash, name, lastUsedAt, revokedAt)  # جدید
Permission   (id, key, description)  # جدید — RBAC دانه‌ای
RolePermission (role, permissionKey)  # جدید
User         (موجود + فیلدهای kycLevel, nationalIdHash)  # تمدید
Account     (id, userId, currency, balanceSnapshot, createdAt)
Transaction (id, accountId, type, amount, currency, status, idempotencyKey, createdAt)
LedgerEntry (id, transactionId, accountId, direction, amount, createdAt)
Device      (id, userId, fingerprintHash, name, lastUsedAt, revokedAt)
Session     (id, userId, deviceId, tokenHash, expiresAt, revokedAt)
AuditLog    (id, actorId, action, ip, deviceId, beforeHash, afterHash, createdAt)
Role / Permission / RolePermission (RBAC)
Notification (id, userId, channel, type, payload, readAt, createdAt)
```

## ۶.۴ بهروه‌وری
- N+1 اجتناب (مشاهده در review؛ استفاده از `include`/`select` هدفمند).
- اتصال‌ها را با singleton مدیریت کن.
- کوئری‌های سنگین را در صف/پردازش غیرهمزمان.
- پارتیشن‌بندی جدول `transaction`/`audit_log` بر اساس زمان در مقیاس.

## ۶.۵ Migration纪律
- هر migration یک هدف مشخص.
- پیش از apply در production: بررسی قفل/زمان اجرا.
- بکاپ پیش از migration ساختاری بزرگ.
