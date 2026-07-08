# بخش ۴ — امنیت سطح بانک (Security)

الزامات بر اساس PCI DSS v4.0.1، SCA/PSD2 (مرجع) و استانداردهای محصولات برتر.

## ۴.۱ احراز و جلسه (Auth & Session)
- **Password:** فقط هش قوی (Argon2id / bcrypt با cost بالا). حداقل ۱۲ کاراکتر؛ بررسی در برابر لیست‌های رایج.
- **Passkey / WebAuthn:** پیش‌فرض ورود بدون رمز (phishing-resistant).
- **2FA:** TOTP (fallback موقت SMS/Email نه اصلی).
- **Session:** HttpOnly، Secure، SameSite=Strict کوکی؛ چرخش کلید؛ بستن از راه دور.
- **Device Management:** ثبت دستگاه، لیست جلسه‌های فعال، لغو، هش fingerprint.

## ۴.۲ RBAC و دسترسی
نقش‌ها: `customer`, `merchant`, `exchange`, `support`, `admin`, `superadmin`.
- دسترسی دانه‌ای (permission-level)، نه فقط نقش سطحی.
- هر endpoint: `@requirePermission(...)`.
- محدودیت داده بر اساس tenant/role.
- Principle of least privilege.

### ماتریس دسترسی (نمونه)
| منبع | customer | merchant | exchange | support | admin | superadmin |
|------|----------|----------|----------|---------|-------|------------|
| کیف پول خود | RW | RW | RW | — | — | — |
| انتقال | RW | RW | RW | — | — | — |
| پنل فروشگاه | — | RW | — | R | R | RW |
| پنل صراف | — | — | RW | R | R | RW |
| کاربران | R(self) | — | — | R | RW | RW |
| audit log | — | — | — | R | R | RW |
| تنظیمات سیستم | — | — | — | — | RW | RW |

## ۴.۳ رمزنگاری (Encryption)
- **At rest:** AES-256 برای داده حساس (شناسه ملی، توکن‌ها، log مالی). کلید در KMS/secret manager.
- **In transit:** TLS 1.2+ اجباری؛ هیچ پروتکل متن‌باز در CDE.
- **Tokenization:** جایگزینی داده حساس با توکن در لایه‌های غیرسی.

## ۴.۴ Audit Log و Threat Modeling
- هر عملیات حساس در audit log غیرقابل تغییر (actor، IP، device، action، before/after hash، timestamp).
- Threat model برای هر ماژول پیش از پیاده‌سازی (STRIDE: Spoofing, Tampering, Repudiation, Info disclosure, DoS, Elevation).
- Rate limit: IP، کاربر، endpoint حساس (ورود، انتقال).

## ۴.۵ Fraud Detection
- محدودیت مبلغ/تعداد تراکنش؛ بررسی دستگاه جدید؛ مکان غیرمعمول؛ الگوی غیرعادی.
- صف بررسی (manual review queue) در admin.
- هشدار امنیتی لحظه‌ای به کاربر (ورود/انتقال).

## ۴.۶ PCI DSS v4.0.1 (در صورت لمس کارت)
- کاهش scope: توکنی‌سازی، عدم ذخیره PAN.
- کنترل اسکریپت صفحه پرداخت (۶.۴.۳ / ۱۱.۶.۱): integrity بررسی اسکریپت third-party.
- MFA برای همه دسترسی CDE.
- تست نفوذ دوره‌ای، SAST/DAST در CI.

## ۴.۷ مدل تهدید — نمونه (انتقال پول)
- **Spoofing:** جعل هویت فرستنده → احراز قوی + device binding.
- **Tampering:** دستکاری مبلغ → امضای درخواست + idempotency + ledger immutable.
- **Repudiation:** انکار تراکنش → audit log + confirmation.
- **Info disclosure:** نشت مبلغ/مشخصات → رمزنگاری + کمینه نمایش.
- **DoS:** سیل درخواست → rate limit + queue.
- **Elevation:** دسترسی فراتر → RBAC دانه‌ای + تست نفوذ.
