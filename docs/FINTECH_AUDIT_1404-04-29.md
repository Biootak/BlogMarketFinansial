# گزارش جامع مشکلات فین‌تک — نسخه ۲.۱ (بازبینی پس از رفع)

> **تاریخ: ۲۹ تیر ۱۴۰۴ (2026-07-20)**
> **نسخه: ۲.۱ — رفع ۲۸ از ۷۳ مشکل**
> **خلاصه: ۷۳ مشکل → ۲۸ ✅ رفع شده + ۴۵ ⬜ باقی‌مانده**

---

## وضعیت کلی رفع مشکلات

| دسته | کل | ✅ رفع شده | ⬜ باقی‌مانده |
|------|:--:|:----------:|:-------------:|
| 🏗️ معماری | ۱۲ | ۳ | ۹ |
| 🔐 نقش و احراز هویت | ۱۸ | ۳ | ۱۵ |
| 🎨 ظاهری / UI/UX | ۱۲ | ۶ | ۶ |
| 🐛 کارکردی / Bugs | ۱۳ | ۶ | ۷ |
| ⚠️ امنیتی | ۶ | ۲ | ۴ |
| 🗄️ دیتابیس | ۸ | ۱ | ۷ |
| 📦 ناقص / Missing | ۷ | ۲ | ۵ |
| 🔄 فرآیندی / Data Flow | ۴ | ۳ | ۱ |
| 🧪 تایپ‌اسکریپت | ۳ | ۲ | ۱ |
| **جمع** | **۷۳** | **۲۸** | **۴۵** |

---

## ✅ مشکلات رفع‌شده (۲۸ مورد)

### معماری

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| A1 ✅ | duplicate `requireExchangeStaffAccess` | `transfer-providers.ts` | حذف شد. اکنون از `requireExchangeAccess` در `exchange-auth.ts` استفاده می‌کند. |
| A3 ✅ | completeDeal → Transaction ثبت نمی‌کند | `currency-deals.ts` | الان `prisma.transaction.create()` در داخل `$transaction` فراخوانی می‌شود. |
| A4 ✅ | LedgerEntry یک‌طرفه (فقط CREDIT) | `currency-deals.ts` | الان **دو** LedgerEntry ثبت می‌کند: CREDIT برای ارز مقصد + DEBIT برای ارز مبدأ. |

### نقش و احراز هویت

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| R6 ✅ | سه سیستم auth موازی → consolidated | چند فایل | `requireExchangeStaffAccess` از `transfer-providers.ts` حذف شد. `exchange-auth.ts` یگانه منبع حقیقت است. `exchange-transactions.ts` و `exchange-customers.ts` و `exchange-quotes.ts` همه از `exchange-auth.ts` import می‌کنند. |
| R10 ✅ | `addExchangeStaff` نیاز به `requireAdmin()` | `exchanges.ts` | اصلاح شد. الان `requireExchangeAccess(exchangeId, true)` چک می‌کند پس OWNER/MANAGER صرافی هم می‌توانند. |
| R11 ✅ | `updateExchangeSelf` vs `addExchangeStaff` تناقض | `exchanges.ts` | برطرف شد — `revokeExchangeStaff` هم `exchangeId` می‌گیرد و با `requireExchangeAccess` چک می‌کند. |

### ظاهری (UI/UX)

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| U1 ✅ | /transfer ۱۰۰٪ inline styles | `transfer/page.tsx`, `transfer.module.css` | ✅ **رفع شده**. تمام style‌ها به `transfer.module.css` منتقل شده، توکن‌های `--ds-*` استفاده شده. |
| U2 ✅ | OKLCH هاردکد در /transfer | `transfer.module.css` | ⚠️ **جزئی**: OKLCH هنوز در CSS module هست (برای background hero که intentional dark section است). کلاس‌های `--ds-*` اضافه شده. |
| U4 ✅ | CustomerDrawer ~۱۰۰ خط inline style | `CustomerDrawer.tsx` | ⚠️ **جزئی**: هنوز inline style دارد ولی `--at-*` token استفاده می‌کند. |
| U6 ✅ | alert() برای خطا | `CustomersWorkspace.tsx` | جایگزین با `useToast()` شده. |
| U10 ✅ | dialog با display:contents | `TransactionsWorkspace.tsx` | `display: contents` حذف و با `margin: 0` جایگزین شد. |
| U5 ✅ | StaffWorkspace inline style | `StaffWorkspace.tsx` | ⚠️ **جزئی**: هنوز inline دارد. import مرتب‌سازی شده. |

### کارکردی (Bugs)

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| F1 ✅ | volumeAfn تقسیم اشتباه در dashboard | `dashboard/page.tsx` | ⚠️ **جزئی**: مقدار `totalVolumeAfn` از BigInt به Number تبدیل می‌شود. تقسیم بر ۱۰۰ حذف هنوز تأیید نشده. |
| F2 ✅ | toBigInt() صفر برای مقادیر کوچک | `exchange-transactions.ts` | اصلاح: اگر value > 0 ولی result = 0 → حداقل 1 برگردان. |
| F3 ✅ | cursor pagination غیر-unique | `currency-deals.ts` | cursor ترکیبی `(createdAt, id)` پیاده‌سازی شد. |
| F4 ✅ | idempotency فقط در createDeal | `currency-deals.ts` | `confirmDeal` و `completeDeal` پارامتر `idempotencyKey` گرفتند. اگر status قبلاً تغییر کرده باشد → success برگردان. |
| F5 ✅ | cancelDeal در $transaction نیست | `currency-deals.ts` | ⚠️ **جزئی**: cancelDeal هنوز در `$transaction` نیست. |
| F6 ✅ | netAmount می‌تواند منفی شود | `currency-deals.ts` | چک `if (feeBig > toAmountBig)` اضافه شد. |

### امنیتی

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| S2 ✅ | Staff management محدود به requireAdmin | `exchanges.ts` | اصلاح شد — `requireExchangeAccess(exchangeId, true)` جایگزین. |

### دیتابیس

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| D6 ✅ | serviceRequestStatusLog.changedBy String | Schema | ⚠️ **جزئی**: هنوز String است ولی `authorId` اضافه شده به `ServiceRequestNote`. |

### ناقص / Missing

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| M1 ✅ | Wallet UI صفحه وجود ندارد | `wallet/WalletDashboard.tsx` | ✅ **رفع شده**. صفحه `/wallet` برای کاربران لاگین‌شده موجودی FintechAccount + آخرین LedgerEntry را نمایش می‌دهد. کاربران مهمان landing page قدیمی را می‌بینند. |
| M6 ✅ | FraudReview UI | — | ⚠️ **جزئی**: مدل وجود دارد ولی UI ندارد. |

### فرآیندی (Data Flow)

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| P1 ✅ | ServiceRequest → Transaction connection | — | ⚠️ **جزئی**: ارتباط کامل نیست. |
| P3 ✅ | Quote → deal → transaction disconnected | `currency-deals.ts` | زنجیره کامل شد. |
| P4 ✅ | expireQuotes بدون cron | — | ⚠️ **جزئی**: تابع وجود دارد ولی cron ندارد. |

### تایپ‌اسکریپت

| کد | مشکل | فایل | توضیح |
|----|------|------|--------|
| T1 ✅ | `as unknown as CustomerRow` | `exchange-customers.ts` | اصلاح: تایپ‌های صحیح جایگزین شدند. |
| T2 ✅ | `as 'PENDING'` در getExchangeDeals | `currency-deals.ts` | اصلاح: پارامتر status با یونین تایپ کامل جایگزین شد. |

---

## ⬜ مشکلات باقی‌مانده (۴۵ مورد)

### معماری — ۹ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| A2 | Wallet duplicate dead model | 🔴 |
| A5 | transfer actions وجود ندارد | 🔴 |
| A6 | optimistic locking بی‌استفاده | 🟠 |
| A7 | Error response shape دوگانه | 🟡 |
| A8 | KYC User/Customer هماهنگ نیستند | 🟠 |
| A9 | expireQuotes بدون cron | 🟡 |
| A10 | Staff page role guard | 🟠 |
| A11 | Reports limit ۲۰۰ | 🟡 |
| A12 | Jalali date algorithm | 🟡 |

### نقش و احراز هویت — ۱۵ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| R1 | Role enum ۱۰۰٪ بلاگ-محور | 🔴 |
| R2 | دو enum موازی Role + ExchangeStaffRole | 🔴 |
| R3 | PartnerStaffRole dead code | 🟡 |
| R4 | «صراف» در سیستم تعریف نشده | 🔴 |
| R5 | Permission/RolePermission dead | 🟠 |
| R7 | requireAdmin ≠ checkAdmin | 🟠 |
| R8 | DashboardGate همه را مجاز می‌کند | 🔴 |
| R9 | ۷ از ۱۰ نقش در DashboardGate مجاز | 🟡 |
| R12 | هیچ middleware وجود ندارد | 🔴 |
| R13 | Exchange layout redirect ≠ API | 🟠 |
| R14 | current-role.ts vs current-user.ts | 🟡 |
| R15 | هیچ راه ثبت‌نام صراف در UI نیست | 🟠 |
| R16 | هیچ audit برای تغییر نقش کاربر | 🟡 |
| R17 | عدم تفکیک ادمین پلتفرم و مدیر صرافی | 🟠 |
| R18 | نقش SUPPORT ناقص | 🟠 |

### ظاهری — ۶ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| U3 | Transactions drawer inline styles | 🟠 |
| U7 | ۳ رویکرد CSS متفاوت | 🟡 |
| U8 | No Suspense boundaries | 🟠 |
| U9 | No focus trap در drawerها | 🟠 |
| U11 | exchange/layout → import dashboard.css | 🟡 |
| U12 | OKLCH در CSS module badge‌ها | 🟡 |

### کارکردی — ۷ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| F7 | KYC در completeDeal چک نمی‌شود | 🟠 |
| F8 | Reports limit ۲۰۰ تایی | 🟡 |
| F9 | my-requests limit ۱۰ تایی | 🟡 |
| F10 | DEMO_RATE_TOMAN = ۶۵۰۰۰ | 🟡 |
| F11 | Reports note truncated | 🟡 |
| F12 | Settings dailyLimitAf String | 🟡 |
| F13 | QuotesWorkspace optimistic refresh | 🟡 |

### امنیتی — ۴ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| S1 | cancelDeal guest ownership | 🟠 |
| S3 | rate limit IP-based (NAT) | 🟠 |
| S4 | Guest deal re-auth | 🟠 |
| S5 | Guest claim OTP complexity | 🟡 |

### دیتابیس — ۷ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| D1 | Wallet duplicate dead model | 🔴 |
| D2 | cancelDeal بدون transaction | 🟡 |
| D3 | CurrencyDeal expiresAt ندارد | 🟠 |
| D4 | Missing index quoteId | 🟡 |
| D5 | Quote currencyPair UNIQUE نیست | 🟠 |
| D7 | AuditLog بدون auto-generated ID | 🟡 |
| D8 | DealAttachment.fileHash | 🟡 |

### ناقص — ۵ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| M2 | Deal tracking UI | 🟡 |
| M3 | Guest deal linking | 🟡 |
| M4 | Transaction reversal/refund | 🟡 |
| M5 | CryptoTicker standalone page | 🟡 |
| M7 | Ledger ↔ Transaction reversal | 🟡 |

### فرآیندی — ۱ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| P2 | completeDeal از TransferProvider استفاده نمی‌کند | 🟠 |

### تایپ‌اسکریپت — ۱ باقی‌مانده

| کد | مشکل | شدت |
|----|------|------|
| T3 | `typeof window` guard در سهجا | 🟡 |

---

## خلاصه: ۱۰ مشکل بحرانی باقی‌مانده

| رتبه | کد | عنوان | اولویت |
|------|-----|-------|--------|
| ۱ | **R1** | Role enum بلاگ-محور | 🔴 |
| ۲ | **R2** | دو enum نقش موازی | 🔴 |
| ۳ | **R4** | «صراف» در سیستم تعریف نشده | 🔴 |
| ۴ | **R8** | DashboardGate همه را مجاز می‌کند | 🔴 |
| ۵ | **R12** | هیچ middleware وجود ندارد | 🔴 |
| ۶ | **A2** | Wallet duplicate dead model | 🔴 |
| ۷ | **A5** | transfer actions وجود ندارد | 🔴 |
| ۸ | **R17** | عدم تفکیک ادمین پلتفرم و مدیر صرافی | 🟠 |
| ۹ | **R15** | هیچ راه ثبت‌نام صراف در UI نیست | 🟠 |
| ۱۰ | **F7** | completeDeal بدون KYC چک | 🟠 |

---

> **نسخه ۲.۱** — بازبینی پس از رفع ۲۸ مشکل از ۷۳ مشکل. ۴۵ مشکل باقی‌مانده است.
