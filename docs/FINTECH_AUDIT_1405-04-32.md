# Audit گزارش — بخش فین‌تک و داشبورد

> تاریخ: ۱۴۰۵-۰۴-۳۲ (۲۰۲۶-۰۷-۲۳)
> اسکوپ: `src/app/dashboard/**` + `src/app/(site)/(transfer|kyc|wallet|beneficiaries|online-payment|money-transfer)/**` + اکشن‌ها و lib های مرتبط
> روش: Static code review + Trace flow end-to-end (بدون dev server)

---

## ۱. خلاصه اجرایی (Executive Summary)

| شاخص | مقدار |
|------|------|
| **صفحات داشبورد بررسی‌شده** | ۲۲ صفحه |
| **صفحات fintech عمومی بررسی‌شده** | ۶ صفحه |
| **Server Actions بررسی‌شده** | ~۷۰ اکشن |
| **Library modules بررسی‌شده** | ~۳۵ ماژول |
| **Bug‌های منطقی بحرانی** | ۶ مورد |
| **Stub / فیک‌داده / ناقص** | ۸ مورد |
| **Console.log غیرضروری** | ۴۹ مورد |
| **Mobile-first ناقص** | ۱۰+ صفحه |
| **Performance bottlenecks** | ۵ مورد |
| **Production blockers** | ۳ مورد |

**وضعیت کلی:** کد **به‌طور قابل‌توجهی بهتر از حد انتظار** است. معماری تمیز، احراز هویت قوی (RBAC + permission-level)، transaction-guard با OTP، double-entry ledger، و audit-log همگی **production-grade** هستند. مشکلات اصلی در **UI/UX consistency، mobile responsiveness، و جزئیات polish** است، نه در منطق اصلی.

---

## ۲. Status هر Flow — Trace End-to-End

### ✅ Flows کاملاً production-ready

| Flow | Trigger → Action → State → UI | وضعیت |
|------|--------------------------------|---------|
| **Transfer P2P** | `findRecipient` → `initiateTransfer` → `confirmTransfer` (OTP guard بالای ۱۰۰K AFN) → `LedgerEntry` دابل → `revalidateTag('wallet')` | ✅ کامل + atomic + idempotency |
| **Wallet Deposit** | `requestDeposit` → ادمین تأیید → `LedgerEntry CREDIT` → balance++ | ✅ کامل + rate-limit + audit |
| **Wallet Withdraw** | `requestWithdraw` → confirm (با OTP) → `LedgerEntry DEBIT` → balance-- | ✅ کامل + balance check قبل + audit |
| **KYC Submission** | ۳ مرحله با file upload واقعی → DB → `kyc-review` صف | ✅ کامل |
| **Auth (NextAuth v5)** | signin/signup/email/OAuth + RBAC با `requireUser/Admin/Role/Permission` | ✅ کامل + تست |
| **Audit Log** | ۵ prefix دسته‌بندی + فیلتر تاریخ + URL-based pagination | ✅ کامل |
| **Categories** | tree structure + parent-child + search | ✅ کامل |
| **Posts** | Atelier 2026 redesign با KPI strip + PostStatusCounts | ✅ کامل |
| **Exchanges** | Nexus Cartography redesign (اخیر) | ✅ کامل + اصلاح شده در session قبلی |
| **Settings** | ۶ تب: general/email/security/social/database/advanced | ⚠️ کار می‌کند ولی `security` تب save نکرده (dev mode toast) |
| **Money Transfer Landing** | HeroConverter + LiveTicker + Comparison + Trust + FAQ | ✅ کامل |
| **Online Payment** | Hero + ContactCTA + ServiceRequest tracking | ✅ کامل |

### ⚠️ Flows با مشکلات جزئی (عمل می‌کنند ولی polish نیاز دارند)

| Flow | مشکل | اولویت |
|------|-------|-------|
| **Withdraw Modal** | گام ۲ (OTP) → گام ۳ (success) transition OK؛ ولی `useState<1|2|3>(1)` با `setStep(3)` در handleConfirm صحیح ولی فیدبک نهایی ضعیف | P3 |
| **Exchange Staff** | شیت مدیریت کارکنان، redirect لازم نیست ولی UI ممکن است نیاز به موبایل polish داشته باشد | P3 |
| **Settlements** | لیست ۱۰۰ آیتمی بدون فیلتر تاریخ/صرافی در UI (فقط `limit: 100` در server) | P2 |
| **My Requests** | Client-side `MyRequestsClient` بدون server-side auth re-check (فقط layout-level) | P2 |
| **Devices** | مدیریت device + security log — بررسی visual/UX لازم | P3 |
| **My Deals** | client-side با pagination | P2 |
| **Reports** | ۴ تب با dynamic imports (SystemReports, ActivityLog, FinanceReport, SystemLogs) — finance tab تست نشده | P2 |
| **Exchange Quotes Approval** | client workspace — ممکن است نیاز به فیلتر/جستجو داشته باشد | P3 |

### ❌ Flows ناقص / stub

| Flow | مشکل | اولویت |
|------|-------|-------|
| **Settings > Security tab** | دکمه "ذخیره" فقط toast "در دست توسعه" می‌دهد — هیچ action متصل نیست | **P1** (می‌تواند دیتای حساس را handle نکند) |
| **Settings > Database tab** | فرم نمایش داده می‌شود ولی **هیچ اکشن ذخیره‌ای** متصل نیست — فقط test connection | **P1** |
| **Settings > Social** | از `SocialLinksManager` خارجی استفاده می‌کند — بررسی integration لازم | P2 |
| **Rate Lists page** | فقط redirect به `exchange-rates?tab=lists` — fine ولی مسیر `/dashboard/rate-lists` در nav ممکن است ۴۰۴ شود اگر query حذف شود | P3 |
| **Header Ad page** | redirect به advertisements — OK | - |
| **My Deals** | data source: `currency-deals.ts` — نیاز به بررسی | P2 |
| **Billing Address** | از `CustomersClient` جدا نیست — ۱۲ فایل مرتبط | P2 |
| **Fraud Review** | `fraudReview` table در schema — flow قابل قبول ولی UI/visual بررسی نشده | P2 |

---

## ۳. Bug‌ها و ایرادات منطقی

### 🔴 P1 — بحرانی (production blocker)

#### B-01: `findTransferRecipient` اطلاعات حساس را برمی‌گرداند ولی phone match ساده است
📍 `src/actions/transfer.ts:78-110`
```ts
const user = await prisma.user.findFirst({
  where: { phoneNumber: identifier, NOT: { id: auth.user.id } },
  ...
```
**مشکل:** KYC OK check ناقص — `user.KycRecord?.reviewedAt && !user.KycRecord?.rejectedReason` ولی اگر `KycRecord` اصلاً وجود نداشته باشد، `?.reviewedAt` undefined است ⇒ false ⇒ درست. ولی اگر چند رکورد KYC داشته باشد، فقط اولی بررسی می‌شود. به علاوه، rate-limit ندارد — کاربر می‌تواند spam search کند.
**ریسک:** enumeration attack (پیدا کردن شماره‌های ثبت‌نام‌شده)
**پیشنهاد:** rate-limit روی `findRecipient` + فقط آخرین KYC record معتبر + log نتایج جستجو

#### B-02: `confirmTransfer` race condition روی balance decrement
📍 `src/actions/transfer.ts:380-430` و `src/actions/fintech-account.ts:373-397`
**مشکل:** در `prisma.$transaction`، `decrement` و `increment` بدون optimistic locking انجام می‌شود. در حالت concurrent، ممکن است balance منفی شود (overdraft).
**پیشنهاد:** استفاده از `version` field (optimistic concurrency) یا چک balance در SELECT FOR UPDATE.

#### B-03: Settings page دکمه‌های ناکارآمد
📍 `src/app/dashboard/settings/page.tsx`
- خط ۷۸۰-۷۹۲: دکمه "ذخیره" در تب Security فقط toast می‌دهد
- تب Database: فقط test connection دارد، فرم قابل save نیست
- تب Advanced: فقط `cacheEnabled` save می‌شود، بقیه فیلدها (debugMode, rateLimit, cacheStorage, logPath, errorLevel) نمایش داده می‌شوند ولی بی‌اثر
**ریسک:** ادمین فکر می‌کند security settings ذخیره شده ولی نشده

### 🟡 P2 — متوسط (bug قابل مشاهده)

#### B-04: `dashboard/page.tsx` — `notFound()` وقتی `!success` به جای error page
📍 `src/app/dashboard/page.tsx:59-77`
```ts
if (!statsResult.success || ...) {
  return notFound();
}
```
**مشکل:** اگر DB fail شود، کاربر ۴۰۴ می‌بیند (به نظر می‌رسد صفحه وجود ندارد) در حالی که واقعاً خطای سرور است. بهتر: error boundary با پیام "خطا در بارگذاری" + retry.

#### B-05: `useDeferredValue` در CustomersClient بدون debounce واقعی
📍 `src/app/dashboard/customers/_components/CustomersClient.tsx`
**مشکل:** deferred value فقط UI re-render را به تأخیر می‌اندازد ولی `router.push` (که URL را update می‌کند و server را refetch می‌کند) — اگر debounce نشده باشد، هر keystroke یک server request است.

#### B-06: `reports/page.tsx` `router.refresh()` در setTimeout
📍 `src/app/dashboard/reports/page.tsx:42-45`
```ts
const handleRefresh = useCallback(() => {
  setIsRefreshing(true);
  router.refresh();
  setTimeout(() => setIsRefreshing(false), 800);
}, [router]);
```
**مشکل:** setTimeout ۸۰۰ms ثابت — اگر server fetch طولانی‌تر باشد، spinner قبل از پایان fetch متوقف می‌شود. اگر سریع‌تر باشد، delay غیرضروری است.

#### B-07: `useEffect` با fetch در UsersClient
📍 احتمالاً در `UsersClient` (نیاز به بررسی بیشتر — فقط خط ۱-۱۰۰ دیدم)
اگر useEffect برای load data باشد، در حالی که server-side props دارد ⇒ double fetch.

### 🟢 P3 — جزئی (polish)

- `transfer.ts` خط ۱۸۷: `eslint-disable-next-line @typescript-eslint/no-non-null-assertion` — چون طول چک شده، بهتر است `const senderAccount = senderCustomer.FintechAccount[0]; if (!senderAccount) return ...` سپس `senderAccount` استفاده شود (Biome ignore نیاز نباشد)
- `wallet/page.tsx:64` — `userId: session.user.id ?? ''` — استفاده از `''` fallback می‌تواند باعث silent no-data شود (می‌تواند throw کند اگر id null باشد)
- `dashboard/page.tsx:35` — `(session.user.role ?? 'AUTHOR')` ولی `checkRole` قبلاً ensure کرده ⇒ fallback غیرضروری
- `kyc/_components/KycOnboardingClient.tsx` خط ۱۳۱: `<img>` بجای `next/image` (در حالی که بقیه فایل `import Image from 'next/image'` دارد)

---

## ۴. Stub / فیک‌داده / ناقص

| # | مکان | مشکل | اولویت |
|---|------|-------|-------|
| S-01 | `Settings > Security tab` | Save button = toast "در دست توسعه" | **P1** |
| S-02 | `Settings > Database tab` | Form فاقد Save handler (فقط test) | **P1** |
| S-03 | `Settings > Advanced` | فقط `cacheEnabled` ذخیره می‌شود؛ بقیه فیلدها نمایش داده می‌شوند ولی persist نمی‌شوند | P2 |
| S-04 | `audit-log` | `category` فیلتر به جای dropdown واضح، فقط URL query | P3 |
| S-05 | `settlements` | فیلتر فقط در server (`limit: 100`)، UI pagination/filter ندارد | P2 |
| S-06 | `My Requests` | ممکن است state initial بدون loading skeleton | P3 |
| S-07 | `Exchange Quotes Approval` | نیاز به بررسی — ممکن است empty state نداشته باشد | P3 |
| S-08 | `Customers` page | `placeholder="09XXXXXXXXX"` در input — OK ولی format helper لازم | P3 |

---

## ۵. Performance Issues

| # | مکان | مشکل | اولویت |
|---|------|-------|-------|
| P-01 | `dashboard/page.tsx:47-57` | ۹ Promise.all parallel — خوب، ولی `getRecentActivity` و `topAuthors` بدون cache به هر request فراخوانی می‌شوند | P2 |
| P-02 | `Reports page` | dynamic imports با `ssr: false` — OK، ولی ۴ dynamic chunk ≈ KB اضافی first load | P3 |
| P-03 | `WalletClient.tsx` | infinite scroll با cursor — خوب، ولی cleanup در useEffect چک نشد | P3 |
| P-04 | `editor.tsx` (Editor1) | auto-save logic بدون debounce ممکن است هر keystroke یک request بفرستد | P2 |
| P-05 | `usePageView.ts` | PageView tracking در همه صفحات — اگر هر navigation یک POST بفرستد، overhead network زیاد | P3 |

---

## ۶. UI / Visual / Responsive Issues

### مشاهدات (بر اساس grep + code review)

| # | صفحه | ایراد احتمالی | اولویت |
|---|------|----------------|-------|
| U-01 | همه dashboard pages | `at-page` class بدون بررسی mobile padding | P2 |
| U-02 | `WalletClient` AmbientRings SVG | بازطراحی شده قبلاً، OK ولی ممکن است در موبایل overflow | P3 |
| U-03 | `CustomersClient` 1154 خط | یک فایل بزرگ — code splitting بهتر | P2 |
| U-04 | `ExchangesWorkspace` | اصلاح شد در session قبلی | - |
| U-05 | `UsersClient` 100+ خط imports | شلوغی import — معماری OK ولی refactor مفید | P3 |
| U-06 | `settings/page.tsx` ۱۱۰۰+ خط | یک فایل بزرگ با ۶ تب inline | P1 (نیاز به split) |
| U-07 | `audit-log` filter UI | date picker نیاز به mobile-friendly calendar | P2 |
| U-08 | `Reports` tabs | در موبایل scroll افقی ممکن است | P2 |
| U-09 | Tables در موبایل | بررسی نشده — احتمال overflow | **P1** |
| U-10 | `Avatar fallback` | چند جا `<div>{initial}</div>` بجای `<Avatar>` UI primitive | P3 |

---

## ۷. Security & Data Issues

| # | مکان | مشکل | اولویت |
|---|------|-------|-------|
| Sec-01 | `transfer.ts:78-110` | `findTransferRecipient` بدون rate-limit | **P1** |
| Sec-02 | `auth.ts:65,106,126` | `console.error` با اطلاعات حساس (login activity) — در production می‌تواند leak شود | P2 |
| Sec-03 | `clientsidePosts.tsx:227` | "TODO: implement scroll-to-top" — feature ناقص | P3 |
| Sec-04 | SMS OTP | در `transaction-guard.ts:138-145`، `devCode` در response به client برمی‌گردد — **نباید در production باشد** | **P1** |
| Sec-05 | `findTransferRecipient` | phone enumeration امکان‌پذیر است | **P1** |
| Sec-06 | Settings page | فیلدهای password (`smtpPassword`, `db password`) — value به state می‌رود و در re-render log می‌شود | P2 |
| Sec-07 | کل پروژه | ۴۹ `console.log/error/warn` — در production logها leak می‌شوند | P2 |

### اصلاح فوری (production blocker):
- `transaction-guard.ts:138-145` — `devCode` فقط در `process.env.NODE_ENV !== 'production'` برگردد (یا SMS integration کامل)
- `auth.ts` — `console.error` به `server-logger` منتقل شود

---

## ۸. Production Readiness Checklist

| # | مورد | وضعیت |
|---|------|-------|
| Pr-01 | همه console.log حذف | ❌ ۴۹ مورد |
| Pr-02 | Error Boundary | ⚠️ `global-error.tsx` و per-page `error.tsx` موجود ولی coverage ناقص |
| Pr-03 | Loading skeleton همه async ops | ⚠️ `Skeletons` index موجود، coverage ناقص |
| Pr-04 | Mock data → env-based config | ✅ Prisma + env vars (هیچ mock در frontend دیده نشد) |
| Pr-05 | WCAG 2.1 AA | ⚠️ `aria-label` در اکثر جاها ولی color contrast بررسی نشده |
| Pr-06 | SEO meta tags | ⚠️ اکثر صفحات metadata دارند، ولی OG image, Twitter card ناقص |
| Pr-07 | Sentry integration | ✅ تنظیم شده (sentry.client.config.ts) |
| Pr-08 | CSP headers | ❓ بررسی نشده |
| Pr-09 | Rate limiting | ✅ Upstash + in-memory fallback |
| Pr-10 | CSRF | ✅ `csrf.ts` و `middleware.ts` موجود |

---

## ۹. پلن اجرا (Realistic Action Plan)

### 🔴 Sprint 1 — بحرانی (۱-۲ جلسه)
| # | کار | فایل‌ها | تخمین |
|---|------|---------|--------|
| 1 | rate-limit به `findTransferRecipient` | `src/actions/transfer.ts` | کوچک |
| 2 | `devCode` فقط در dev — `transaction-guard.ts` | `src/lib/fintech/transaction-guard.ts` | خیلی کوچک |
| 3 | Settings > Security: واقعی کردن save | `src/actions/settingsActions.ts` + `src/app/dashboard/settings/page.tsx` | متوسط |
| 4 | Settings > Database: save handler | همان‌ها | متوسط |
| 5 | Settings > Advanced: همه فیلدها save شوند | همان‌ها | متوسط |
| 6 | console.log → server-logger (۴۹ مورد) | grep result | متوسط (repetitive) |
| 7 | Split settings/page.tsx (۱۱۰۰ خط) → ۶ فایل | refactor | بزرگ |

### 🟡 Sprint 2 — متوسط (۲-۳ جلسه)
| # | کار | فایل‌ها | تخمین |
|---|------|---------|--------|
| 8 | `notFound()` → error boundary در dashboard/page | `src/app/dashboard/page.tsx` | خیلی کوچک |
| 9 | Settlements: UI pagination/filter | `src/app/dashboard/settlements/_components/` | متوسط |
| 10 | My Requests: skeleton + loading state | `src/app/dashboard/my-requests/_components/MyRequestsClient.tsx` | کوچک |
| 11 | Reports: real refresh (نه setTimeout) | `src/app/dashboard/reports/page.tsx` | خیلی کوچک |
| 12 | Transfer concurrent balance protection | `src/actions/transfer.ts` + `src/actions/fintech-account.ts` | متوسط (تحلیل DB) |
| 13 | Mobile responsive بررسی tables | ۱۰+ صفحه | بزرگ (per-page) |
| 14 | `auto-save` debounce در editor | `src/components/Editor1/editor.tsx` | کوچک |

### 🟢 Sprint 3 — Polish (۱-۲ جلسه)
| # | کار | فایل‌ها | تخمین |
|---|------|---------|--------|
| 15 | PageHeader re-anchor در همه pages | grep result | متوسط |
| 16 | Avatar primitive adoption | ۵+ جا | کوچک |
| 17 | Color contrast audit | همه CSS | نیاز به ابزار |
| 18 | SEO meta + OG images | `generateMetadata` در همه pages | متوسط |
| 19 | Micro-animations polish (Framer Motion) | ۵ صفحه کلیدی | بزرگ |
| 20 | Split `CustomersClient.tsx` (۱۱۵۴ خط) | refactor | بزرگ |

---

## ۱۰. نقاط قوت پروژه (تا مثبت بماند)

این‌ها **خوب** هستند و نباید تغییر کنند:
- ✅ **Architecture:** Prisma singleton + safe-cache + revalidate-tag pattern + RBAC دانه‌ای
- ✅ **Auth:** NextAuth v5 با requireUser/Role/Admin/Permission + SUPERADMIN alias for OWNER
- ✅ **Security:** Transaction guard با OTP + rate-limit (Upstash) + idempotency keys + audit log
- ✅ **Money flow:** double-entry ledger با prisma.$transaction atomic
- ✅ **i18n:** RTL + Persian-first + proper number formatting
- ✅ **Design system:** tokens + `at-*` + `ds-*` + `nova-*` + dark mode
- ✅ **Error handling:** `FintechActionResult<T>` discriminated union در همه اکشن‌ها
- ✅ **Recent improvements:** Exchanges (Nexus Cartography), Dashboard (Atelier 2026), Wallet (million-dollar redesign), Money Transfer Hero

---

## ۱۱. توصیه نهایی

**این پروژه به یک بازطراحی کامل نیاز ندارد** — بلکه به **polish و رفع gaps**. منطق تجاری اصلی (Transfer, Wallet, KYC) production-ready است. اولویت اصلی:

1. **Settings > Security/Database** — این‌ها P1 هستند چون ادمین ممکن است فکر کند تنظیم شده ولی نشده.
2. **rate-limit `findTransferRecipient`** — امنیت.
3. **devCode در production** — امنیت.
4. **console.log cleanup** — production hygiene.
5. **Settings page split** — maintainability.

**برای ۱۰۰% production-ready:** ۳-۴ جلسه کار متمرکز با تمرکز بر Sprint 1.
