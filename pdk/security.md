# بخش ۴ — امنیت (Security)

> الزامات بر اساس PCI DSS v4.0.1، ساختار واقعی ریپو، و نقش‌های موجود.

---

## ۴.۱ احراز و جلسه

- **Password:** Argon2id / bcrypt (cost بالا) — حداقل ۱۲ کاراکتر
- **2FA:** TOTP موجود (`twoFactorEnabled`, `twoFactorSecret`) — اجباری برای ادمین
- **Passkey/WebAuthn:** هنوز پیاده نشده — P2 در roadmap
- **Session:** HttpOnly, Secure, SameSite=Strict — NextAuth v5
- **Device:** مدل `Device` موجود (TRUSTED|UNVERIFIED|REVOKED) — مدیریت در `/dashboard/devices`
- **Backup codes:** `TwoFactorBackupCode` موجود
- **tokenVersion:** `User.tokenVersion` برای invalidation سریع همه session‌ها

---

## ۴.۲ RBAC — نقش‌ها و دسترسی‌ها

### نقش‌های سیستم (Role enum — تأییدشده)

| نقش | توضیح |
|-----|-------|
| `USER` | کاربر عادی بلاگ |
| `AUTHOR` | نویسنده پست |
| `CUSTOMER` | مشتری فین‌تک |
| `MERCHANT` | فروشگاه |
| `EXCHANGE` | کاربر صرافی (عضو ExchangeStaff) |
| `SUPPORT` | پشتیبانی — read-only روی اکثر داده‌ها |
| `ADMIN` | مدیر سیستم |
| `OWNER` | مالک اصلی |
| `SUPERADMIN` | دسترسی کامل |
| `TEST_CUSTOMER` | محیط تست |

### نقش‌های ExchangeStaff (درون یک صرافی)

| نقش | دسترسی |
|-----|--------|
| `OWNER` | همه عملیات صرافی |
| `MANAGER` | تأیید quote، مدیریت معاملات، گزارش |
| `STAFF` | ثبت quote، مشاهده معاملات |
| `VIEWER` | فقط مشاهده |

### ماتریس دسترسی (نمونه)

| منبع | CUSTOMER | EXCHANGE | SUPPORT | ADMIN | SUPERADMIN |
|------|----------|----------|---------|-------|------------|
| کیف پول خود | RW | — | R | R | RW |
| معاملات خود | RW | — | R | R | RW |
| پنل صرافی | — | RW | R | R | RW |
| مشتریان صرافی | — | RW | R | RW | RW |
| کاربران سیستم | R(self) | — | R | RW | RW |
| مجوزها | — | — | — | RW | RW |
| تنظیمات سیستم | — | — | — | RW | RW |
| audit log | — | R(own) | R | R | RW |

### RBAC دانه‌ای (Permission)

فرمت کلید: `resource:action` مثل `wallet:read`, `kyc:approve`, `quote:approve`

```
wallet:read          wallet:write
transfer:create      transfer:approve
kyc:submit           kyc:review           kyc:approve
quote:create         quote:approve        quote:reject
deal:create          deal:confirm         deal:complete
customer:read        customer:write       customer:freeze
fraud:view           fraud:resolve
audit:read
permissions:manage
exchange:manage
report:view          report:export
```

---

## ۴.۳ رمزنگاری

- **At rest:** داده حساس (nationalIdHash, encryptedData در KycVerification) — AES-256 + KMS
- **In transit:** TLS 1.2+ اجباری
- **هش:** `nationalIdHash`, `codeHash` (TwoFactorBackupCode), `fileHash` (پیوست‌ها)
- **هرگز:** PAN خام، شناسه ملی plaintext، کلید 2FA بدون رمزنگاری (`twoFactorSecretEnc` موجود)

---

## ۴.۴ Audit Log

مدل `AuditLog` موجود و غیرقابل ویرایش:

```
{ actorId, actorRole, action, entityType, entityId, ip, deviceId, beforeHash, afterHash, meta }
```

**عملیات‌هایی که حتماً log می‌شوند:**
- ورود/خروج، تغییر رمز، فعال/غیرفعال 2FA
- هر تراکنش مالی (ایجاد/تغییر وضعیت)
- تغییر KYC (تأیید/رد)
- تغییر نقش کاربر یا کارمند صرافی
- تغییر مجوزها
- فریز/مسدود حساب

---

## ۴.۵ Fraud Detection

- مدل `FraudReview` موجود (`/dashboard/fraud-review`)
- `Customer.riskScore` برای امتیاز دینامیک
- `Transaction.reviewedById` برای بررسی دستی
- صف manual review: تراکنش‌های flagged → OPEN → UNDER_REVIEW → RESOLVED

**شرایط flagging خودکار:**
- مبلغ بالاتر از `Customer.personalLimitAf`
- تراکنش از دستگاه UNVERIFIED
- الگوی غیرعادی (rate/frequency)

---

## ۴.۶ Rate Limit (Upstash Redis — موجود)

| endpoint | لایه | محدودیت |
|----------|------|---------|
| ورود | IP + email | 5/دقیقه |
| انتقال | userId | 10/ساعت |
| ثبت quote | exchangeId | 100/ساعت |
| KYC submit | userId | 3/روز |
| تنظیمات | userId | 20/ساعت |

---

## ۴.۷ Threat Model — سناریوهای اصلی

| تهدید | دفاع |
|-------|------|
| جعل هویت کاربر | 2FA + device binding + session rotation |
| دستکاری مبلغ تراکنش | idempotencyKey + LedgerEntry immutable + Zod validation |
| انکار تراکنش | AuditLog + confirmation + before/afterHash |
| نشت داده حساس | رمزنگاری at-rest + masking در response/log |
| سیل درخواست | Rate limit 3 لایه + queue |
| ارتقا غیرمجاز نقش | requirePermission middleware + RBAC granular |
| تکرار تراکنش | idempotencyKey در Redis با TTL |

---

## ۴.۸ الزامات PCI DSS v4.0.1 (در صورت لمس کارت)

- کاهش scope: توکنی‌سازی — هرگز PAN ذخیره نشود
- `VirtualCard` موجود — `last4` فقط، نه شماره کامل
- MFA برای همه دسترسی CDE
- تست نفوذ دوره‌ای، SAST/DAST در CI
