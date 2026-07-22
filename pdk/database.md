# بخش ۶ — قراردادهای دیتابیس (Database)

> **منبع حقیقت:** `prisma/schema.prisma` — این فایل خلاصه و راهنمای استفاده است، نه schema اصلی.

---

## ۶.۱ اصول اجباری

- Prisma singleton از `@/lib/db` — هرگز `new PrismaClient()`
- نام جداول: PascalCase در schema، snake_case در DB (Prisma خودکار)
- اندیس‌گذاری روی: `userId`, `exchangeId`, `customerId`, `status`, `createdAt`
- مهاجرت‌ها همیشه در کدبیس — هرگز `prisma migrate reset` در production
- Soft-delete برای موجودیت‌های مالی: ستون `revokedAt` / `deletedAt`
- Timezone: UTC در DB — نمایش با timezone کاربر
- **Decimal برای پول — هرگز float**
- `BigInt` برای مبالغ AFN (filsات دقت لازم دارند)
- `Decimal(20,2)` برای مبالغ ارزی — `Decimal(20,6)` برای نرخ‌ها

---

## ۶.۲ مدل‌های اصلی فین‌تک (تأییدشده)

### Exchange — صرافی
```prisma
Exchange {
  id, name, slug (unique), licenseNo?, city?, address?
  phone?, email?, logoUrl?, displayName?
  showInComparison Boolean          -- نمایش در جدول مقایسه
  primaryCurrency String @default("AFN")
  allowedCurrencies String[]        -- ارزهای مجاز
  quoteAutoExpireMin Int @default(60)
  status ExchangeStatus             -- PENDING|ACTIVE|SUSPENDED|CLOSED
  dailyLimitAf BigInt @default(0)
  platformFee Float @default(0)
  requireKyc Boolean @default(true)
  createdById String?
}
```

### ExchangeStaff — کارمند صرافی
```prisma
ExchangeStaff {
  id, exchangeId, userId
  role ExchangeStaffRole   -- OWNER|MANAGER|STAFF|VIEWER
  title String?
  permissions String[]     -- override مجوزهای اضافه/کم
  invitedBy String?
  joinedAt, revokedAt?
}
```

### Customer — مشتری صرافی
```prisma
Customer {
  id, exchangeId, userId? (link به User سیستم)
  fullName, fatherName?, nationalId?, passportNo?
  phone, email?, address?, city?
  status CustomerStatus    -- PROSPECT|ACTIVE|FROZEN|CLOSED
  kycLevel KycLevel        -- NONE|LEVEL_1|LEVEL_2|LEVEL_3
  kycStatus KycStatus      -- NOT_STARTED|PENDING|APPROVED|REJECTED|EXPIRED
  personalLimitAf BigInt?
  riskScore Int @default(0)
  notes String?
}
```

### FintechAccount — حساب مالی (منبع اصلی)
```prisma
FintechAccount {
  id, exchangeId, customerId
  type AccountType    -- WALLET|CASH|BANK|CRYPTO
  label String?
  currency String @default("AFN")
  status AccountStatus  -- PENDING|ACTIVE|FROZEN|CLOSED
  balance BigInt @default(0)  -- snapshot (از LedgerEntry مشتق می‌شود)
  frozenUntil DateTime?
}
```
> ⚠️ **مهم:** برای خواندن موجودی‌های حساس از `LedgerEntry` مشتق کن — `balance` فقط cache است.

### Wallet — لایه نازک روی FintechAccount
```prisma
Wallet {
  id, exchangeId, customerId
  accountId String @unique  -- FK به FintechAccount
  currency, balance, locked BigInt
}
```
> ⚠️ **فقط برای VirtualCard.walletId** استفاده می‌شود. برای هر کار جدید از `FintechAccount` مستقیم.

### Transaction — تراکنش
```prisma
Transaction {
  id, exchangeId, customerId?, accountId?
  kind TransactionKind   -- P2P|DEPOSIT|WITHDRAWAL|EXCHANGE|BILL|FEE|REVERSAL|SETTLEMENT
  status TransactionStatus -- PENDING|PROCESSING|COMPLETED|FAILED|REVERSED|CANCELLED
  amount BigInt, currency String @default("AFN")
  rate Float?, fee BigInt @default(0)
  destAmount BigInt?, destCurrency String?
  idempotencyKey String? @unique   -- اجباری برای همه عملیات مالی
  externalRef?, counterparty?, note?, meta Json?
  createdById, reviewedById?
}
```

### LedgerEntry — دفتر دوطرفه (immutable)
```prisma
LedgerEntry {
  id, exchangeId, accountId?, customerId?, txnId?
  direction LedgerDirection  -- DEBIT|CREDIT
  amount BigInt, currency String
  runningBalance BigInt      -- موجودی پس از این ورودی
  description String?
  createdById String?
}
```
> قانون: هر تراکنش = حداقل ۲ LedgerEntry (DEBIT + CREDIT). هیچ بروزرسانی مستقیم balance.

### ExchangeRateQuote — قیمت صرافی
```prisma
ExchangeRateQuote {
  id, exchangeId
  currencyCode String   -- ISO 4217
  currencyPair String   -- "USD/AFN"
  buyRate, sellRate Decimal(20,6)
  unit String @default("toman")  -- toman|rial|afn|usd
  minAmount?, maxAmount? Decimal(20,2)
  status QuoteStatus    -- PENDING|ACTIVE|REJECTED|EXPIRED|ARCHIVED|LOCKED
  validMinutes Int @default(60)
  expiresAt DateTime?
  approvedById?, submittedById?
  version Int @default(1)  -- optimistic locking
}
```

### CurrencyDeal — معامله ارزی
```prisma
CurrencyDeal {
  id, trackingCode (unique), exchangeId, quoteId?, userId?
  customerName, customerPhone, customerEmail?
  fromCurrency, toCurrency String
  fromAmount, toAmount Decimal(20,2)
  appliedRate Decimal(20,6)
  feeAmount Decimal(20,2) @default(0)
  marketRateRef Decimal(20,6)?
  channel DealChannel  -- ONLINE|INPERSON|PHONE
  status DealStatus    -- PENDING|CONFIRMED|PROCESSING|COMPLETED|CANCELLED|DISPUTED|REFUNDED
  idempotencyKey String? @unique
  confirmedById?, confirmedAt?, completedAt?
}
```

### Permission + RolePermission — RBAC دانه‌ای
```prisma
Permission {
  id, key String   -- فرمت: "resource:action" مثل "wallet:read"
  description String?
}

RolePermission {
  id, role Role, permissionId String
}
```

### FraudReview — بررسی تقلب
```prisma
FraudReview {
  id, exchangeId, txnId?, customerId?
  reason String, riskScore Int @default(0)
  status String @default("OPEN")  -- OPEN|UNDER_REVIEW|RESOLVED|DISMISSED
  assignedToId?, resolution?
  resolvedAt?
}
```

### KycVerification — تأیید هویت مشتری
```prisma
KycVerification {
  id, exchangeId, customerId
  level KycLevel, status KycStatus
  docType String, docNumber?, fileUrl?, fileHash?
  encryptedData String?  -- داده حساس رمزنگاری‌شده
  reviewedById?, reviewedAt?
  rejectReason?, expiresAt?
}
```

### AuditLog — لاگ حسابرسی (immutable)
```prisma
AuditLog {
  id, exchangeId?, actorId?, actorRole?
  action String, entityType?, entityId?
  ip?, deviceId?, beforeHash?, afterHash?
  meta Json?, createdAt
}
```

---

## ۶.۳ Enum‌های مهم

```
Role:            USER|AUTHOR|ADMIN|OWNER|TEST_CUSTOMER|CUSTOMER|MERCHANT|EXCHANGE|SUPPORT|SUPERADMIN
ExchangeStaffRole: OWNER|MANAGER|STAFF|VIEWER
KycLevel:        NONE|LEVEL_1|LEVEL_2|LEVEL_3
KycStatus:       NOT_STARTED|PENDING|APPROVED|REJECTED|EXPIRED
CustomerStatus:  PROSPECT|ACTIVE|FROZEN|CLOSED
AccountStatus:   PENDING|ACTIVE|FROZEN|CLOSED
TransactionKind: P2P|DEPOSIT|WITHDRAWAL|EXCHANGE|BILL|FEE|REVERSAL|SETTLEMENT
TransactionStatus: PENDING|PROCESSING|COMPLETED|FAILED|REVERSED|CANCELLED
LedgerDirection: DEBIT|CREDIT
QuoteStatus:     PENDING|ACTIVE|REJECTED|EXPIRED|ARCHIVED|LOCKED
DealStatus:      PENDING|CONFIRMED|PROCESSING|COMPLETED|CANCELLED|DISPUTED|REFUNDED
DeviceStatus:    TRUSTED|UNVERIFIED|REVOKED
```

---

## ۶.۴ جریان تراکنش (الگوی اجباری)

```
۱. Zod validation روی ورودی
۲. Idempotency check در Redis (TTL معقول)
۳. ایجاد Transaction با status=PENDING
۴. ایجاد LedgerEntry‌ها (در یک transaction Prisma)
۵. به‌روزرسانی FintechAccount.balance (snapshot)
۶. audit log ثبت
۷. اعلان کاربر
۸. در صورت خطا: Transaction.status=FAILED + reversal entry
```

---

## ۶.۵ بهینه‌سازی

- N+1: از `include`/`select` هدفمند استفاده کن — هرگز loop با query جداگانه
- کوئری‌های سنگین (گزارش) → `cursor pagination` نه `offset`
- `LedgerEntry` و `AuditLog` → `createdAt` index همیشه
- پارتیشن‌بندی در مقیاس: `Transaction`/`AuditLog` بر اساس `exchangeId` + زمان

---

## ۶.۶ Migration Rules

- هر migration یک هدف مشخص (نه چند تغییر در یک فایل)
- additive changes ترجیح دارند (افزودن ستون nullable قبل از not-null)
- بکاپ پیش از هر migration ساختاری
- هرگز `migrate reset` در production
