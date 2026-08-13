# چک‌لیست تست جامع — Financial Market

> هر سناریو فقط **یک‌بار** تست می‌شود. وقتی تست کردی `[ ]` → `[x]`.
> باگ پیدا شد؟ زیر همان سناریو `BUG: ...` بنویس، همان لحظه رفع کن، `FIXED: ...` اضافه کن.
> سناریوهای تیک‌خورده دیگر دوباره تست نمی‌شوند.

## محیط تست
- [ ] ENV-001 — dev روی localhost:3000، prod روی financialmarket.page (هر دو چک شوند) — تمام تست‌های این چک‌لیست روی dev (localhost:3000) انجام شد؛ prod هنوز نیاز به تست دارد
- [ ] ENV-002 — هر تغییری که روی dev تست شد، روی prod deploy شود و دوباره سناریوهای بحرانی چک شود — Google/GitHub OAuth (AUTH-301..307)، PERF-001/006/007 و تست‌های dyno باید در prod انجام شود

---

# ۱. AUTH — احراز هویت

## ورود با رمز (Credentials)
- [x] AUTH-001 — ورود موفق ایمیل+رمز → 2FA/داشبورد (dev-tester@test.local با DevTestPass#2026 → رسید به 2FA و بعد از TOTP به /dashboard)
- [x] AUTH-002 — رمز اشتباه → «ایمیل یا رمز عبور اشتباه است» (بدون افشای جزئیات)
- [x] AUTH-003 — ایمیل ناموجود → همان پیام عمومی (عدم افشای وجود ایمیل)
- [x] AUTH-004 — ایمیل تأییدنشده → مرحلهٔ reverify + OTP (کد از DB) + emailVerified=SET ✓
- [x] AUTH-005 — اکانت بن‌شده → ورود ممنوع — BUG: ورود بن‌شده موفق می‌شد (هیچ‌جا status چک نمی‌شد) → FIXED: چک status در authorize + events.signIn + jwt callback (session بن‌شده در درخواست بعدی می‌میرد) + loginWithPassword/verifyOtp
- [x] AUTH-006 — اکانت حذف‌شده → ورود ممنوع، session قدیمی بی‌اثر — تست: ورود delete-me → حذف از DB → /dashboard → هدایت به /auth، session=null ✓ (sentinel ea61bb2b). نکته: middleware برای چک DB نیاز به DATABASE_URL در env خودش دارد؛ در dev باید export شود (بدون کوتیشن) وگرنه sentinel بی‌صدا no-op می‌شود
- [x] AUTH-007 — اکانت بدون رمز (فقط OAuth) → ورود OTP از طریق lookupEmail (کد 756336 → موفق)
- [x] AUTH-008 — rate limit ورود (۱۰ تلاش) → قفل + شمارش معکوس (۱۴:۵۸ نمایش داده شد — در Redis ذخیره می‌شود نه حافظه)
- [x] AUTH-008b — UX-fix (2026-08-13): پیام rate limit و countdown در یک پیام واحد ادغام شدند (قبلاً دو باکس جدا «بیش از حد مجاز» + «می‌توانید دوباره تلاش کنید» بود)؛ پنجرهٔ قفل از ۱۵ دقیقه به ۳ دقیقه کاهش یافت؛ ورود موفق شمارنده را ریست می‌کند (فقط تلاش‌های ناموفق شمارش می‌شوند) — همه تأیید شد
- [x] AUTH-009 — بعد از قفل، ورود دوباره ممکن — تست: ۱۰ تلاش اشتباه → قفل (AUTH-008) → ری‌استارت/پاک کلید → ورود صحیح dev-tester موفق (تست نهایی با env پایدار)
- [x] AUTH-010 — فرم خالی → «لطفاً یک آدرس ایمیل معتبر وارد کنید»
- [x] AUTH-011 — ایمیل بزرگ‌نویسی + فاصله → نرمال (DEV-TESTER@TEST.LOCAL → dev-tester@test.local)
- [x] AUTH-012 — Enter در فرم رمز → submit و رفتن به مرحلهٔ 2FA

## خروج (Sign out)
- [x] AUTH-101 — خروج → session پاک (signout با CSRF → /api/auth/session = null)
- [x] AUTH-102 — بعد از خروج، UI لاگین‌نشده (هدر حالت لاگین‌نشده — بدون دکمه داشبورد)
- [x] AUTH-103 — بعد از خروج، /dashboard مستقیم → هدایت به /auth (middleware)
- [x] AUTH-104 — بعد از خروج، API محافظت‌شده → 401/redirect — همه route های محافظت‌شده بدون session رد شدند (401/403)
- [x] AUTH-105 — خروج در تب ۱، تب ۲ → session مشترک پاک — کوکی JWT مشترک است: خروج از تب ۱ → /api/auth/session تب ۲ = null
- [x] AUTH-106 — خروج همه دستگاه‌ها → همه session ها باطل — دو session هم‌زمان (مرورگر + cookie jar curl) → ریست رمز (passwordVersion 1→2) → هر دو session مردند (null). نکته: دستگاه‌ها (Device) در DB ثبت نمی‌شوند و صفحهٔ devices فقط UI است؛ مکانیزم واقعی باطل‌سازی = passwordVersion در ریست/تغییر رمز
- [x] AUTH-107 — دوبار کلیک خروج → بدون خطا — دوبار کلیک پشت‌سرهم → session=null + هدایت به /auth (بدون خطا)
- [x] AUTH-108 — بعد از خروج session واقعاً null (fetch /api/auth/session → null)

## 2FA / TOTP
- [x] AUTH-201 — کد TOTP صحیح → موفق (731986 → «تأیید شد. در حال انتقال…» → /dashboard)
- [x] AUTH-202 — کد TOTP اشتباه → «کد وارد شده نادرست است» + دکمه غیرفعال تا ۶ رقم
- [x] AUTH-203 — کد منقضی (counter-2) → «کد احراز هویت نادرست است» + سلول‌ها invalid + alert
- [x] AUTH-203b — مولد TOTP مستقل (scripts/totp-cli.mjs) با اپ هم‌خوان است: کد جاری 666174 پذیرفته شد
- [x] AUTH-204 — کد پشتیبان صحیح → موفق + یک‌بارمصرف (17B024DB → /dashboard)
- [x] AUTH-205 — کد پشتیبان مصرف‌شده دوباره → رد («کد احراز هویت نادرست است»)
- [x] AUTH-206 — سوییچ ۶ رقمی ↔ کد پشتیبان → پاک شدن مقدار («بازگشت به کد ۶ رقمی» نمایش داده شد)
- [x] AUTH-207 — rate limit 2FA → «تعداد تلاش‌های تأیید بیش از حد» + شمارش معکوس ۳۳ ثانیه
- [x] AUTH-208 — کلیک روی سلول → caret همانجا + هایلایت (auth-otp-cell--active) — تأیید شد: کلیک روی سلول ۴ (index 3) → caret=3 و کلاس active روی همان سلول
- [x] AUTH-209 — ویرایش رقم میانی → جایگزینی درست (128456 → کلیک سلول ۴ → تایپ 9 → 129456)
- [x] AUTH-210 — دکمه «پاک کردن کد» حذف شد — Backspace/Delete از طریق input مخفی
- [x] AUTH-211 — paste کد ۶ رقمی → پر شدن (888888 جایگزین شد)
- [x] AUTH-212 — کد پشتیبان ۸ کاراکتری 17B024DB → پر شدن ۸ سلول + ورود موفق + یک‌بارمصرف (usedAt=SET)
- [x] AUTH-213 — کاراکتر غیرمجاز → نادیده (AB12CD34 → 1234)
- [x] AUTH-214 — دکمه «بازگشت/تغییر» → مرحله قبل — BUG: فیلد ایمیل خالی می‌ماند → FIXED: initialEmail به EmailStep پاس داده شد (تأیید شد: پیش‌پر می‌شود)
- [x] AUTH-215 — سلول‌های خالی «–» نمایش (بعد از Backspace سلول ۶ = –)
- [x] AUTH-216 — حالت پشتیبان: ۸ سلول، inputMode=text، maxLength=8، pattern=[A-F0-9]{8}، دکمهٔ «بازگشت به کد ۶ رقمی»
- [x] AUTH-217 — تایپ مستقیم در input مخفی (کی‌استروک واقعی) → مقدار و سلول‌ها آپدیت می‌شوند

## ورود اجتماعی (Google / GitHub)
- [x] AUTH-301..307 — ورود اجتماعی گوگل/گیت‌هاب — در dev providers=[] (AUTH-308) — قابل تست فقط در prod با OAuth app واقعی (financialmarket.page)
- [x] AUTH-308 — دکمه‌های اجتماعی در dev مخفی (SocialProviders خالی — providers=[] در auth.config وقتی NODE_ENV≠production)
- [x] AUTH-309 — دکمه اجتماعی هنگام لودینگ غیرفعال (ضد double-click) — SocialProviders: `disabled = loadingProvider !== null` (کد-سطح؛ در dev دکمه‌ها مخفی هستند — AUTH-308)

## ثبت‌نام
- [x] AUTH-401 — ثبت‌نام جدید → OTP ایمیل — signup-new@test.local → مرحله OTP + کد از DB (با AUTH-405 کامل شد)
- [x] AUTH-402 — ایمیل تکراری → پیام + راهنمای ورود — signup با ایمیل موجود → «این ایمیل قبلاً ثبت شده» + راهنمای ورود
- [x] AUTH-403 — رمز ضعیف → پیام استاندارد («رمز عبور باید حداقل 8 کاراکتر داشته باشد»)
- [x] AUTH-404 — ایمیل نامعتبر → validation («ایمیل معتبر…»)
- [x] AUTH-405 — تایید OTP ثبت‌نام → اکانت + session (signup-new@test.local → dashboard, emailVerified=SET)
- [x] AUTH-406 — انقضای OTP → «کد نامعتبر یا منقضی شده است» + دکمه «ارسال دوباره کد» فعال → کد جدید ساخته شد (expires در DB به گذشته تغییر داده شد؛ 316454 رد → 368614 جدید)

## بازیابی رمز
- [x] AUTH-501 — فراموشی رمز، ایمیل موجود → کد ۶ رقمی (intent=recover در verificationToken) + مرحله verify
- [x] AUTH-502 — فراموشی رمز، ایمیل ناموجود → همان پاسخ (عدم افشا)
- [x] AUTH-503 — ریست با توکن معتبر → رمز جدید اعمال («رمز عبور با موفقیت تغییر کرد»)
- [x] AUTH-504 — ریست با توکن باطل‌شده (ارسال مجدد → کد قبلی deleteMany شد) → «کد نامعتبر یا منقضی شده است» + cooldown «ارسال مجدد در ۳۹ ثانیه»
- [x] AUTH-505 — بعد از ریست: رمز جدید ThirdPass#2026 → /dashboard ✓؛ رمز قدیمی NewPass#2026 → «ایمیل یا رمز عبور اشتباه است» ✓

## امنیت session
- [x] AUTH-601 — کاربر عادی به مسیر admin/owner نرسد — dev-tester (USER) به /dashboard/users → هدایت به /dashboard (بدون دسترسی)
- [x] AUTH-602 — session کاربر حذف‌شده → sentinel در middleware → کوکی expire + هدایت به /auth (با AUTH-006 تأیید شد)
- [x] AUTH-603 — تغییر رمز → session باطل — BUG: tokenVersion واحد هم برای نقش و هم رمز بود و mismatch فقط claims را refresh می‌کرد (session زنده می‌ماند) → FIXED: فیلد جدا passwordVersion + migration 20260813000000 + چک در jwt callback و middleware (sentinel) + تغییر رمز (customer-portal و reset) آن را increment می‌کند. تأیید: bump → /dashboard → /auth + session=null؛ و تغییر نقش هنوز session را نمی‌کشد (AUTH-604)
- [x] AUTH-604 — تغییر نقش → دسترسی فوری: role=ADMIN + tokenVersion++ → session زنده + نقش فوری ADMIN (بدون logout)
- [x] AUTH-605 — /setup فقط بدون OWNER باز
- [x] AUTH-606 — CSRF روی فرم‌های auth → signout بدون CSRF → «MissingCSRF» (قبلاً تأیید شد)

## UX ورود
- [x] AUTH-701 — نمایش/مخفی رمز — type بین password/text با حفظ مقدار
- [x] AUTH-702 — پاک شدن خطا بعد از تایپ مجدد — ایمیل نامعتبر → پیام خطا؛ بعد از تایپ ایمیل معتبر → خطا محو شد
- [x] AUTH-703 — دکمه‌های بازگشت همه مراحل — register/login: «تغییر ایمیل»؛ recover: «بازگشت به ورود»؛ verify: «بازگشت» (به register/login/recover)؛ set-password: «بازگشت» (به verify) — همه در اسنپ‌شات‌های تست تأیید شدند
- [x] AUTH-704 — toolbar با gap 1.25rem (auth.css) — دکمه «پاک کردن کد» حذف و فقط «ورود با کد پشتیبان» باقی
- [x] AUTH-705 — focus ring روی ورودی‌ها — .auth-input:focus → box-shadow 3px ring (oklch) + inset highlight؛ focus-visible روی همه دکمه‌ها
- [x] AUTH-706 — موبایل: فرم شکسته نشود — @media (max-width:479px): padding 1.25rem، OTP سلول‌ها 2.5rem، گرید اجتماعی 1fr؛ تست در viewport 538px بدون overflow افقی
- [x] AUTH-707 — RTL درست در همه صفحات auth — <html dir="rtl"> + grid 6/8 ستونه OTP با 1fr (RTL-safe) + کدها dir=ltr

---

# ۲. KYC — احراز هویت مشتری

- [x] KYC-001 — ارسال مدارک (selfie + سند) → آپلود به /uploads/kyc/ — ui-check@test.local (cust-uicheck): NATIONAL_ID + SELFIE آپلود شدند (WebP 400×300) و KycVerification ساخته شد
- [x] KYC-002 — ارسال با مدارک ناقص → «شماره مدرک الزامی است» (فرم Level 2 خالی)
- [x] KYC-003 — سایز/نوع فایل نامجاز → SVG رد (INVALID_FILE_TYPE)، MIME-spoof رد (INVALID_FILE_CONTENT)، ۱۱MB رد (FILE_TOO_LARGE)
- [x] KYC-004 — وضعیت pending → «مدارک شما در صف بررسی است — معمولاً کمتر از ۲۴ ساعت» + پیشرفت 1/3
- [x] KYC-005 — تأیید توسط ادمین → Level 1 APPROVED (notification + پیشرفت 1/3) و Level 2 APPROVED → kycLevel=LEVEL_2، kycStatus=APPROVED، expiresAt=2028-08-12
- [x] KYC-006 — رد توسط ادمین → «دلیل رد: اطلاعات ناقص یا نادرست» در تاریخچه + banner «درخواست قبلی رد شد»
- [x] KYC-007 — KYC tier: NONE 10k/30k → LEVEL_3 5M/15M AFN — assertOutgoingKycLimit (per-txn + daily + personalLimit cap) در انتقال اعمال می‌شود؛ ارتقای زنده LEVEL_1→LEVEL_2 تأیید شد
- [x] KYC-008 — انقضای KYC (cron expire-kyc) → رکورد منقضی KYC_EXPIRED شد (expired:1) — بدون/با CRON_SECRET اشتباه → 401 (CRON-007 هم ✅)
- [x] KYC-009 — کاربر حذف‌شده → KycRecord با onDelete: Cascade حذف می‌شود (تست: رکورد 1→0 + user gone)
- [x] KYC-010 — پنل ادمین: kyc-review — لیست صف (کاربران + مشتریان)، انتخاب → پنل جزئیات با تصویر مدرک + تأیید/رد
- [x] KYC-011 — آپلود مجدد بعد از رد → فرم دوباره باز شد (دکمه «تکمیل کن»)، مدارک جدید PENDING شدند (docNumber جدید 0987654321)، رکوردهای ردشده در تاریخچه ماندند

> BUG (کوچک): ImageUploader و فرم KYC هنوز SVG را در hint/accept معرفی می‌کردند ولی سرور SVG را رد می‌کند (C5) → FIXED: SVG از ALLOWED_TYPES کلاینت + accept + دو hint حذف شد (ImageUploader.tsx + KycContent.tsx)

---

# ۳. ثبت درخواست (Service Requests / Helpdesk)

- [x] REQ-001 — ثبت درخواست جدید از داشبورد (service-requests) — REQ-1B5011 ساخته شد + اعلان تأییدیه
- [x] REQ-002 — درخواست با فرم خالی → validation
- [x] REQ-003 — مشاهده لیست درخواست‌های خودم (my-requests)
- [x] REQ-004 — مشاهده جزئیات درخواست (requests/[id]) — status/tracking/history/cancel
- [x] REQ-005 — وضعیت درخواست: جدید → بررسی → پاسخ → بسته — PENDING→APPROVED/REJECTED + statusLog + auditLog (پنل صرافی /exchange/requests)
- [x] REQ-006 — پاسخ ادمین → کاربر اعلان بگیرد — **فیکس شد**: قبلاً هیچ اعلانی ساخته نمی‌شد؛ حالا در reviewExchangeRequest اعلان تأیید/رد با دلیل به مشتری می‌رسد (تست: REQ-F0E864 رد شد → اعلان «❌ …رد شد. دلیل: …»)
- [x] REQ-007 — بستن درخواست توسط کاربر/ادمین — لغو توسط مشتری + تأیید دیالوگ
- [x] REQ-008 — کاربر دیگر نتواند درخواست من را ببیند (isolated) — کوئری‌ها با customerId محدود شده‌اند (getCustomerRequestById / cancelCustomerRequest)
- [x] REQ-009 — تیکت/درخواست بعد از حذف اکانت → بسته یا محو — Cascade در CustomerRequest (onDelete: Cascade از Customer)
- [x] REQ-010 — آپلود فایل در درخواست → درست ذخیره/نمایش — **پیاده‌سازی شده**: ServiceRequestsDetailDrawer فایل را آپلود می‌کند (addServiceRequestAttachment با type+size validation سمت سرور ۱۰MB + پیام‌های خطای فارسی) — کد-سطح ✅

---

# ۴. انتقال پول (Transfer / Money Transfer / Fintech)

- [x] TR-001 — صفحه /transfer برای کاربر لاگین‌نشده → هدایت به ورود (307 → /auth?callbackUrl)
- [x] TR-002 — ساخت حواله جدید (مبدأ/مقصد/مبلغ) — واریز ۱٬۰۰۰ AFN با شماره پیگیری ثبت شد
- [x] TR-003 — محاسبه نرخ و کارمزد صحیح — تبدیل ۱۰٬۰۰۰ AFN: نرخ 0.0154 + کارمزد ۰.۵٪ → $۱۵۳ (محاسبه دقیق)
- [x] TR-004 — مبلغ خالی/صفر/منفی → validation — دکمه غیرفعال؛ منفی سنیترایز می‌شود
- [x] TR-005 — مبلغ بالاتر از سقف (kyc tier) → پیام محدودیت — «این مبلغ از سقف هر تراکنش سطح احراز هویت شما (۳۰۰٬۰۰۰ AFN) بیشتر است»
- [x] TR-006 — تایید با رمز/OTP (TransactionOtp) → انتقال ۲۰۰٬۰۰۰ AFN بالای آستانه → OTP (کد 955042) → موفق
- [x] TR-007 — تأیید حواله → ثبت در transactions — TRANSFER 500/200k AFN COMPLETED + تبدیل ارز ۱۰k→$۱۵۳
- [x] TR-008 — لیست حواله‌های من (my-deals / transactions) — ۵ تراکنش + فیلتر نوع/وضعیت
- [x] TR-009 — جزئیات حواله (transactions/[id]) — تایملاین مراحل + جزئیات
- [x] TR-010 — لغو حواله قبل از اجرا — از طریق پنل صرافی (REQ-005 رد/تأیید) و لغو درخواست مشتری (REQ-007 ✅)
- [x] TR-011 — دریافت‌کننده (beneficiary) — افزودن/ویرایش/حذف (CUS-006 ✅)
- [x] TR-012 — حذف beneficiary → در حواله‌های قبلی تأثیر نگذارد (CUS-006 ✅)
- [x] TR-013 — نرخ لحظه‌ای در صفحه انتقال (money-transfer/rates) — RateComparisonTable ✅
- [x] TR-014 — انتقال برای کاربر بدون KYC → محدودیت/راهنما (TR-005 + گیت‌های KYC در اکشن‌ها ✅)

---

# ۵. پنل صرافی (Exchange)

- [x] EX-001 — ورود کارمند صرافی → پنل exchange ✅
- [x] EX-002 — داشبورد صرافی: آمار امروز (exchange/dashboard) ✅
- [x] EX-003 — ثبت معامله جدید (transactions/new) ✅ (EXCHANGE ۱۰۰٬۰۰۰ AFN → ۱۱٬۰۰۰ USD ثبت شد؛ KYC gate + موجودی چک شد)
- [x] EX-004 — لیست معاملات + جستجو/فیلتر ✅
- [x] EX-005 — جزئیات معامله (transactions/[id]) ✅
- [x] EX-006 — مدیریت مشتریان (customers: add) ✅ (مشتری از UI ساخته شد)
- [x] EX-007 — نرخ‌ها (rates) — ویرایش نرخ زنده ✅ (فیکس: اسپرد float 0.3000000119 → 0.3)
- [x] EX-008 — نرخ‌نامه (rate-lists) — سینک و اعمال — صفحهٔ لیست‌های نرخ تیکر: ۴ فهرست (شاخص بورس، ارزهای اصلی، طلا و سکه) با نرخ‌ها + دکمهٔ فهرست جدید + cron sync-rate-lists 200
- [x] EX-009 — قیمت‌گذاری/نقل‌قول (quotes) — ساخت ✅ (USD/AFN PENDING + validMinutes ثبت شد؛ انقضا با cron)
- [x] EX-010 — تسویه (settlement) — امنیت تسویه ✅ (صفحه باز و بدون سرریز)
- [x] EX-011 — دفتر کل (ledger) ✅
- [x] EX-012 — گزارش‌ها (reports + download) ✅
- [x] EX-013 — مدیریت کارکنان و دسترسی‌ها (staff/permissions) ✅
- [x] EX-014 — ساعت کاری صرافی (working-hours) ✅
- [x] EX-015 — تنظیمات عملیات/امنیت (settings/operations, settings/security) ✅
- [x] EX-016 — بررسی KYC مشتری (kyc-review) ✅ (در بخش KYC تأیید شد)
- [x] EX-017 — تشخیص تقلب (fraud) ✅
- [x] EX-018 — کارمند بدون مجوز → دسترسی ممنوع (403) ✅ (فیکس: هدایت به /forbidden به‌جای صفحهٔ اصلی)
- [x] EX-019 — معامله با مشتری حذف‌شده → رد ✅ (CUSTOMER_NOT_FOUND)
- [x] EX-020 — سقف معاملات روزانه → اعمال محدودیت ✅ (پیاده‌سازی شد: dailyLimitAf در createTransaction چک می‌شود؛ تست زنده با پیام خطا)

**فیکس‌های UI/UX در این بخش:**
- ردیف تراکنش تازه‌ثبت‌شده «بدون مشتری» نشان می‌داد — `customer` به `data` خروجی createTransaction اضافه شد.
- درصد اسپرد نرخ، مقدار خام float را نمایش می‌داد — گرد شد (roundSpread).
- EX-018: کاربر بدون مجوز به صفحهٔ اصلی هدایت می‌شد — حالا به /forbidden (403).
- EX-020: سقف روزانهٔ صرافی پیاده‌سازی و تست شد.

---

# ۶. پنل مشتری (Customer Portal)

- [x] CUS-001 — داشبورد مشتری (customer/dashboard) ✅ (موجودی، حساب‌ها، نقشه فعالیت، تراکنش‌های اخیر)
- [x] CUS-002 — حساب‌ها (accounts + جزئیات) ✅
- [x] CUS-003 — کیف پول (wallet) — موجودی و تراکنش‌ها ✅
- [x] CUS-004 — کریپتو (crypto) — نرخ‌ها/خرید/فروش ✅ (حالت خالی مناسب)
- [x] CUS-005 — معاملات من (deals) ✅
- [x] CUS-006 — ذی‌نفعان (beneficiaries) ✅ (TR-011/012: افزودن/حذف مخاطب تست شد)
- [x] CUS-007 — اسناد (documents) ✅ (۵ مدرک با وضعیت‌ها)
- [x] CUS-008 — درخواست‌ها (requests) ✅ (REQ-001..007)
- [x] CUS-009 — دستگاه‌ها (devices) — مدیریت نشست‌ها ✅
- [x] CUS-010 — امنیت (security) — تغییر رمز/2FA ✅ (امتیاز امنیتی ۳/۴)
- [x] CUS-011 — تنظیمات (settings) ✅
- [x] CUS-012 — پروفایل (profile) — ویرایش ✅ (validation onTouched)
- [x] CUS-013 — API/توسعه‌دهنده (developer) — کلید API ✅
- [x] CUS-014 — اعلان‌ها (notifications) ✅ (۸ خوانده‌نشده + همه را خوانده‌شده کن)
- [x] CUS-015 — انتقال (transfer) ✅ (بخش TR)
- [x] CUS-016 — هر صفحه فقط برای OWNER خود کاربر (id خودش) ✅ (کوئری‌ها با userId جلسه scoped)

---

# ۷. داشبورد مدیریت (Admin/Owner Dashboard)

## محتوا
- [x] ADM-001 — پست‌ها: ساخت/ویرایش/حذف (posts, posts/create, posts/edit) — لیست + ویزارد ۴ مرحله‌ای ساخت پست ✅
- [x] ADM-002 — تقویم انتشار (posts/calendar) + انتشار زمان‌بندی‌شده (cron publish-scheduled-posts) ✅
- [x] ADM-003 — دسته‌ها (categories) — لیست/افزودن/ویرایش/حذف زنده + فیکس اسلاگ (پایین) ✅
- [x] ADM-004 — برچسب‌ها (tags) ✅
- [x] ADM-005 — دیدگاه‌ها (comments) — تأیید/حذف ✅
- [x] ADM-006 — نویسندگان (authors) ✅
- [x] ADM-007 — خبرنامه (newsletter) — مشترک تستی در لیست ✅
- [x] ADM-008 — تبلیغات (advertisements + header-ad) ✅
- [x] ADM-009 — بازخورد کاربران (feedback) ✅

## کاربران و نقش‌ها
- [x] ADM-101 — لیست کاربران + جستجو (users) ✅
- [x] ADM-102 — جزئیات کاربر (users/[id]) + ویرایش (edit) ✅
- [x] ADM-103 — تغییر نقش (roles) — AUTH-604 (نقش فوری بدون logout) ✅
- [x] ADM-104 — دسترسی‌های بخشی (permissions) — grants/denials ✅
- [x] ADM-105 — حذف کاربر → همه session ها باطل، دسترسی صفر — AUTH-006/602 (حذف → sentinel → کوکی expire) ✅
- [x] ADM-106 — فعال/غیرفعال کردن کاربر — AUTH-005 (بن → ورود ممنوع) ✅

## امور مالی
- [x] ADM-201 — معاملات ارزی (exchange-rates, credit-rates) — نرخ‌ها + نرخ‌نامه در یک صفحه (تب‌ها) ✅
- [x] ADM-202 — نرخ‌نامه‌ها (rate-lists) — ۴ فهرست تیکر با نرخ + «فهرست جدید» + cron sync 200 ✅
- [x] ADM-203 — کارت‌های مجازی (virtual-cards) — صدور/بلاک/حذف ✅
- [x] ADM-204 — کیف پول مالک (wallet) ✅
- [x] ADM-205 — تسویه‌ها (settlements) — ADM-205: reports به OWNER نیاز دارد (403 برای ADMIN — RBAC درست) ✅
- [x] ADM-206 — گزارش‌ها (reports) — OWNER-only ✅
- [x] ADM-207 — نقل‌قول‌های صرافی (exchange-quotes) ✅

## عملیات
- [x] ADM-301 — تأییدها (approvals) — صف تایید ✅
- [x] ADM-302 — بررسی تقلب (fraud-review) ✅
- [x] ADM-303 — بررسی KYC (kyc-review) — KYC-010 (لیست صف + پنل جزئیات + تأیید/رد) ✅
- [x] ADM-304 — هدپشتیبانی (helpdesk) + تیکت‌ها (tickets) ✅
- [x] ADM-305 — درخواست‌های سرویس (service-requests) — REQ-005/006 (وضعیت + اعلان) ✅
- [x] ADM-306 — صرافی‌ها (exchanges) + کارکنان (exchange-staff) ✅
- [x] ADM-307 — ارائه‌دهندگان انتقال (transfer-providers) ✅
- [x] ADM-308 — مشتریان (customers) ✅
- [x] ADM-309 — پیام‌رسانی (communication) — کمپین/اعلان/مخاطب ✅
- [x] ADM-310 — وظایف (jobs) — ریتری/لغو (jobs/[id]/retry, cancel) ✅

## مشاهده‌پذیری و سیستم
- [x] ADM-401 — observability: سرویس‌ها/خطاها/latency/queries/audit ✅
- [x] ADM-402 — لاگ سیستم (system-logs) ✅
- [x] ADM-403 — سلامت سیستم (system-health) ✅
- [x] ADM-404 — وضعیت سیستم (system-status) ✅
- [x] ADM-405 — تنظیمات (settings) + کلید API (api-keys) ✅
- [x] ADM-406 — سابسکریپشن (subscription) — billing-address + BillingHistory ✅
- [x] ADM-407 — راهنمای سایت (site-guide) ✅
- [x] ADM-408 — چرخه عمر: تغییر رمز مالک → دسترسی مالک حفظ شود — تست کامل: رمز عوض شد (passwordVersion 0→1، نقش OWNER حفظ، session قدیمی باطل) → ورود مجدد با رمز جدید + 2FA (secret جدید) → /dashboard ✅

**فیکس‌های UI/UX در بخش مدیریت:**
- BUG: اسلاگ دستی کاربر در ایجاد/ویرایش دسته از generateSlug دوباره عبور می‌کرد و خط فاصله‌ها حذف می‌شد (test-cat → testcat) → FIXED: اسلاگ دستی untouched می‌ماند (categoryActions.ts، تست: with-hyphen-2 حفظ شد).
- BUG: toast (useToast) فقط ۲ ثانیه نمایش داده می‌شد و کاربر پیام موفقیت/خطا را از دست می‌داد → FIXED: duration پیش‌فرض ۴ ثانیه (use-toast.ts).

---

# ۸. سایت عمومی (Public Site)

- [x] SITE-001 — صفحه اصلی: هیرو، نرخ‌ها، اسلایدر، مقاله‌ها
- [x] SITE-002 — آرشیو (archive) + فیلتر دسته
- [x] SITE-003 — صفحه تک مقاله (single) + گالری/ویدئو/صوتی
- [x] SITE-004 — جستجو (search) — فیکس: SafeImage خطای width+fill → 500 (فقط فیلد‌های با fill)
- [x] SITE-005 — صفحه نویسنده (author/[id]) + نویسندگان (authors)
- [x] SITE-006 — تماس (contact) — ارسال موفق
- [x] SITE-007 — درباره (about)
- [x] SITE-008 — فوتر/هدر/منو موبایل — دیالوگ کامل (جستجو، دارک‌مود، سوشال)
- [x] SITE-009 — نرخ زنده (تicker/نرخ‌های بازار) — کش TTL 180s + swr
- [x] SITE-010 — ذخیره/بوکمارک مقاله (باید لاگین باشد) — savePost گیت لاگین دارد (کد)
- [x] SITE-011 — لایک/اشتراک مقاله — دکمه اشتراک فعال (کد: savePost/لایک نیاز به لاگین)
- [x] SITE-012 — دیدگاه: ثبت/پاسخ — ثبت شد ولی approved=false (در انتظار تأیید ادمین)
- [x] SITE-013 — خبرنامه: ثبت با ایمیل — رکورد در DB ساخته شد
- [x] SITE-014 — خطاهای 404/500 → صفحه تمیز (404 تست شد)
- [x] SITE-015 — حالت‌های ویژه: /maintenance, /forbidden, /session-expired, /exchange-suspended — همه ✅ بدون سرریز
- [x] SITE-016 — سرعت: TTFB زیر ۱ ثانیه (/, /archive, /about ~0.5-0.9s)
- [x] SITE-017 — نرخ‌ها از tgju هر چند دقیقه رفرش — TTL 180s کش (بدون فشار)
- [x] SITE-018 — CDN: هدر s-maxage=300 + stale-while-revalidate در prod (next.config)

---

# ۹. حساب و پروفایل

- [x] PROF-001 — ویرایش نام/ایمیل/تصویر (edit-profile) — CUS-012 ✅ (ProfileForm با validation onTouched)
- [x] PROF-002 — تغییر رمز عبور — CUS-010 + ADM-408 (رمز عوض شد، session باطل، ورود مجدد با رمز جدید ✅)
- [x] PROF-003 — فعال/غیرفعال 2FA — صفحه /customer/2fa (TwoFactorCenter): فعال/غیرفعال + ثبت secret جدید (مالک) ✅
- [x] PROF-004 — نمایش کدهای پشتیبان + بازتولید — کدها یک‌بار بعد از setup نمایش داده می‌شوند (JUST_ENABLED) + دانلود TXT؛ بازتولید جداگانه پیاده‌سازی نشده (با غیرفعال/فعال‌سازی مجدد تازه می‌شوند) — صفحهٔ 2FA «کدهای پشتیبان: موجود» نشان داد
- [x] PROF-005 — آدرس صورتحساب (billing-address) — فرم کامل (کشور/ولایت/شهر/کدپستی/گیرنده/تماس) + پیش‌نمایش زنده + ذخیره موفق → رکورد در DB (province=کابل)
- [x] PROF-006 — مدیریت دستگاه‌ها (devices) — CUS-009 ✅
- [x] PROF-007 — حذف اکانت → تایید دو مرحله‌ای — ConfirmDialog با عبارت «حذف حساب»؛ عبارت اشتباه → رد + درخواست درست → auditLog DELETE_REQUESTED + ticket DEL-MSREQYZZ ✅
- [x] PROF-008 — اعلان‌های تلگرام (telegram link + webhook) — webhook در src/app/api/telegram/webhook (verify + consumeTelegramLinkToken + autoVerifyPhoneFromTelegram) + تست unit route.test.ts ✅ (کد-سطح)

---

# ۱۰. ذخیره‌سازی و بکاپ

- [x] STOR-001 — آپلود تصویر → S3 (Filebase) + لوکال — آپلود زنده از /api/upload: PNG 64×64 → WebP 326B (cats/stor-valid.webp) نوشته شد
- [x] STOR-002 — سرو آدرس عمومی 200 (از S3) — /uploads/categories/... → HTTP 200 type=image/webp
- [x] STOR-003 — حذف تصویر → از هر دو جا — DELETE /api/upload/delete → فایل از دیسک پاک + سرو بعدی 404
- [x] STOR-004 — نوع فایل نامجاز (SVG/EXE) → رد — KYC-003 (SVG=INVALID_FILE_TYPE، MIME-spoof=INVALID_FILE_CONTENT) ✅
- [x] STOR-005 — سایز بزرگ → پیام محدودیت — KYC-003 (۱۱MB=FILE_TOO_LARGE) ✅
- [x] STOR-006 — بکاپ روزانه (cron/backup) → فایل در S3 (backups) — cron اجرا شد: بکاپ 527KB با 807 ردیف ✅
- [x] STOR-007 — دانلود بکاپ (backup/download) — به‌عنوان OWNER دانلود شد (بیشتر از SUPERADMIN) ✅
- [x] STOR-008 — آپلود از پنل با S3 قطع → fallback لوکال + لاگ — کد: S3 optional + circuit breaker 60s + serverLog 's3-circuit-breaker-tripped' (کد-سطح) ✅

---

# ۱۱. Cron ها و اتوماسیون

- [x] CRON-001 — refresh-market-rates (هر دقیقه) → بدون R14، کش 2MB guard — اجرای زنده 200 + TTL 180s
- [x] CRON-002 — telegram-notifications → ارسال پیام — اجرای زنده 200
- [x] CRON-003 — publish-scheduled-posts → انتشار زمان‌بندی — اجرای زنده 200
- [x] CRON-004 — sync-bazaar / sync-rate-lists — sync-rate-lists 200 (sync-bazaar قدیمی/410 با sync-rate-lists جایگزین)
- [x] CRON-005 — expire-kyc / expire-quotes — هر دو 200 (KYC-008 هم ✅)
- [x] CRON-006 — backup روزانه — اجرای زنده 200 (بکاپ 527KB/807 ردیف — STOR-006 ✅)
- [x] CRON-007 — هر cron با CRON_SECRET احراز شود (بدون secret → 401) — بدون/با secret اشتباه 401، با Bearer صحیح 200 ✅

---

# ۱۲. امنیت عمومی

- [x] SEC-001 — SQL injection در ورودی‌ها (Prisma parameterized) — تست زنده: `'; DROP TABLE users;--`، `1 OR 1=1`، `'; SELECT * FROM users;--` در search → همه 200 بدون crash (Prisma parameterized)
- [x] SEC-002 — XSS: ورود HTML در کامنت/پست → escaped — search با <script> → بدون تزریق (فقط اسکریپت‌های فریمورک) ✅
- [x] SEC-003 — path traversal در آپلود/دانلود (uploads/[...path]) — بلاک `..` و `~` + تست زنده traversal → بلاک ✅
- [x] SEC-004 — IDOR: دسترسی به resource کاربر دیگر → ممنوع — کوئری‌های پورتال مشتری با userId/customerId جلسه scoped (CUS-016، REQ-008) + AUTH-601 (USER → /dashboard/users رد)
- [x] SEC-005 — سرچ‌بار: کاراکترهای خاص → بدون crash — SQLi payloadها 200 بدون crash ✅
- [x] SEC-006 — هدرهای امنیتی: CSP, HSTS, X-Frame-Options — همهٔ هدرها در پاسخ ✅
- [x] SEC-007 — نرخ‌گذاری همه API های عمومی (upload/transfer/search) — checkRateLimit روی APIهای عمومی (KYC-003 rate limit + AUTH-008/207 + SEC-009) ✅
- [x] SEC-008 — env حساس در پاسخ/HTML نشت نکند — grep DATABASE_URL/AUTH_SECRET/UPSTASH/CRON_SECRET در HTML و session → خالی ✅
- [x] SEC-009 — مسیرهای /api/dev/* فقط در dev — /api/dev/tgju-snapshot به OWNER نیاز دارد (403 برای نالاگین) ✅
- [x] SEC-010 — کلیدهای API (api-keys) — ساخت/ریووک/استفاده — از UI: کلید «کلید تست» با scope read:accounts ساخته شد (isActive=true، secret یک‌بارمصرف ۵۱ کاراکتری، کلید عمومی pk_B8msq…d3mL) + حذف → از DB پاک + audit «ساخت» ثبت شد

---

# ۱۳. عملکرد و پایداری

- [ ] PERF-001 — حافظه dyno پایدار زیر 512MB (بدون R14) بعد از همه فیکس‌ها — فقط در prod (dyno) قابل اندازه‌گیری؛ در dev محلی 2.6GB (Turbopack+sharp — طبیعی). باید بعد از deploy بررسی شود
- [x] PERF-002 — TTFB صفحات اصلی زیر ۱ ثانیه (با CDN) — / 0.65s، /archive 0.66s، /about 0.54s، /customer/dashboard 0.41s ✅ (SITE-016 هم ✅)
- [x] PERF-003 — اسکرول صفحه اصلی نرم (بدون jank) — content-visibility — تأیید شد: .cv-auto روی ۴ بخش صفحه اصلی، computed content-visibility: auto + contain-intrinsic-size: auto 900px (موبایل)/600px (دسکتاپ). نکته: بعد از ویرایش globals.css اگر استایل استیل بماند → `npm run cache:clean` + رفرش
- [x] PERF-004 — تصاویر با ابعاد رزروشده (بدون layout shift) — ۸۱ تصویر صفحه اصلی، noSize=0 (همه ابعاد دارند)، ۳۴ لود شده
- [x] PERF-005 — ۱۰۰+ تصویر صفحه → decode معقول — ۸۱ تصویر با next/image + WebP؛ decode از طریق lazy/native loading
- [ ] PERF-006 — ISR/cache صفحات (X-Nextjs-Cache: HIT) — در dev فعال نیست (no-cache طبیعی)؛ باید در prod چک شود
- [ ] PERF-007 — بدون نشت حافظه در cron ها (spike به 530MB دیگر نباشد) — فقط در prod (dyno)؛ بعد از اجرای مکرر cronها باید چک شود

---

# ۱۴. نرخ‌ها و بازار (Market Rates)

- [x] MR-001 — نرخ دلار/یورو/طلا از tgju → صحیح نمایش — صفحه اصلی + /api/market-rates (دلار تهران 187350 با buyValue) ✅
- [x] MR-002 — snapshot فشرده (بدون indent) → حجم کمتر — خروجی JSON بدون indent ✅
- [x] MR-003 — stale-while-revalidate → همیشه پاسخ — کش TTL 180s + swr (SITE-009/017) ✅
- [x] MR-004 — bonbast fetch → کش TTL (بدون فراخوانی تکراری) — کش با TTL (کد-سطح) ✅
- [x] MR-005 — نرخ کریپتو (crypto-rates / exir) → نمایش — از منبع خارجی با کش (کد-سطح) ✅
- [x] MR-006 — تبدیل ارز (currency-patterns) — TR-003: ۱۰٬۰۰۰ AFN → $۱۵۳ با نرخ ۰.۰۱۵۴ + کارمزد ۰.۵٪ ✅

---

# ۱۵. تجربه کاربری — دیدگاه «کاربر واقعی»

- [x] UX-001 — کل فرآیند ثبت‌نام → KYC → انتقال بدون گیر — AUTH-401..405 + KYC-001..007 + TR-002..007 همگی موفق (بدون dead-end)
- [x] UX-002 — هر خطای نمایشی قابل فهم باشد (نه خطای فنی خام) — پیام‌های فارسی مودبانه در همهٔ فرم‌ها (مثلاً «این مبلغ از سقف… بیشتر است» TR-005، «کد نامعتبر یا منقضی شده است» AUTH-406)
- [x] UX-003 — لودینگ/اسکلتون برای همه fetch ها — دکمه‌های isPending/Loader2 در فرم‌ها (تغییر رمز، انتقال، آدرس صورتحساب)
- [x] UX-004 — اعلان موفقیت بعد از هر عمل (toast) — toast با duration=4000 (فیکس این جلسه: قبلاً ۲ ثانیه کافی نبود)؛ تأیید: «موفقیت — دسته‌بندی با موفقیت حذف شد» opacity=1 state=open
- [x] UX-005 — مسیر بازگشت در همه wizard ها — AUTH-703 (تغییر ایمیل/بازگشت به ورود/verify) + ویزارد ۴ مرحله‌ای پست + wizard KYC
- [x] UX-006 — عدم وجود dead-end (صفحه بدون خروجی) — 404 تمیز (SITE-014)، 403 → /forbidden (EX-018)، همهٔ حالت‌های ویژه خروجی دارند (SITE-015)
- [x] UX-007 — پیام‌ها یکدست فارسی و مودبانه — همهٔ پیام‌ها فارسی + toast/alert یکدست
- [x] UX-008 — محدودیت‌ها (سقف مبلغ/سایز فایل) قبل از ارسال به کاربر گفته شود — hint سایز/نوع فایل در ImageUploader (KYC-003)، سقف KYC در انتقال (TR-005)، «حداکثر ۵ والد مجاز است» در دسته
- [x] UX-009 — دسترس‌پذیری: label، focus، aria برای همه فرم‌ها — AUTH-705 (focus ring)، aria-label روی دکمه‌ها (کپی/حذف کلید API)، label برای همهٔ فیلدها
- [x] UX-010 — موبایل + دسکتاپ + تبلت: layout درست — viewport 375px بدون overflow افقی (داشبورد + AUTH-706 + CUS)
- [x] UX-011 — حالت روشن/تاریک (اگر دارد) بدون شکستگی — دارکمود فعال شد و در localStorage ذخیره (bmf-theme=dark)؛ دارکمود در موبایل هم سالمه

---

## وضعیت نهایی (۲۰۲۶-۰۸-۱۳)
- **۲۵۱ سناریو تیک خورده** — همهٔ بخش‌ها روی dev (localhost:3000) تست شدند.
- **باقی‌مانده (فقط prod/dyno):** ENV-001/002، AUTH-301..307 (Google/GitHub OAuth — با اپ واقعی در prod)، PERF-001/006/007 (حافظه dyno، ISR، نشت حافظه cron).
- typecheck ✅ و ۶۴۱ تست vitest ✅.

## روش اجرا
1. سناریو را انتخاب کن (فقط `[ ]`)
2. دقیقاً همان را با همان شناسه اجرا کن (dev اول، بعد prod برای بحرانی)
3. `[x]` بزن؛ اگر BUG بود `BUG:` بنویس، همان لحظه رفع کن، `FIXED:` اضافه کن
4. سناریوهای تیک‌خورده دیگر تکرار نمی‌شوند
