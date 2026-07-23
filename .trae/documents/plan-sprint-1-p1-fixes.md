# پلن اجرا: Sprint 1 — اصلاحات P1 (Production Blockers)

> تاریخ: ۱۴۰۵-۰۴-۳۲ (۲۰۲۶-۰۷-۲۳)
> هدف: رفع ۵ blocker بحرانی که قبل از production باید برطرف شوند
> مرجع: [docs/FINTECH_AUDIT_1405-04-32.md](file:///e:/FinancialMarket/docs/FINTECH_AUDIT_1405-04-32.md)

---

## خلاصه (Summary)

۵ تسک P1 با حجم کوچک تا متوسط که در یک session قابل اجرا هستند:

| # | تسک | اولویت | حجم |
|---|------|---------|------|
| T1 | rate-limit روی `findTransferRecipient` (ضد enumeration) | P1 امنیت | کوچک |
| T2 | `devCode` فقط در dev (نه production) | P1 امنیت | خیلی کوچک |
| T3 | `console.log/error/warn` → `server-logger` (۴۹ مورد) | P1 production | متوسط |
| T4 | Settings > Security: save handler واقعی | P1 functional | متوسط |
| T5 | Settings > Database/Advanced: save handler واقعی | P1 functional | متوسط |

**خروجی نهایی:** پروژه آماده staging deployment با امنیت قابل‌قبول.

---

## تحلیل وضعیت فعلی (Current State Analysis)

### کد موجود مرتبط:

| فایل | نقش |
|------|------|
| [src/lib/rate-limiter.ts](file:///e:/FinancialMarket/src/lib/rate-limiter.ts) | Upstash + LRU fallback. نوع‌ها: `api`, `upload`, `auth`, `pageview`, `exchange-rates`, `deal-track` |
| [src/actions/transfer.ts](file:///e:/FinancialMarket/src/actions/transfer.ts) | شامل `findTransferRecipient` (خط ۵۷-۱۱۰) — **بدون rate-limit** |
| [src/lib/fintech/transaction-guard.ts](file:///e:/FinancialMarket/src/lib/fintech/transaction-guard.ts) | `requestTransactionOtp` (خط ۵۲-۱۴۵) — `devCode` در `data` در همه محیط‌ها |
| [src/lib/server-logger.ts](file:///e:/FinancialMarket/src/lib/server-logger.ts) | جایگزین `console.error` |
| [src/actions/settingsActions.ts](file:///e:/FinancialMarket/src/actions/settingsActions.ts) | شامل `updateGeneralSettings`, `updateEmailSettings`, `updateCacheSettings` — Security/Database/Advanced بقیه فیلدها را handle نمی‌کنند |
| [src/app/dashboard/settings/page.tsx](file:///e:/FinancialMarket/src/app/dashboard/settings/page.tsx) | UI ۱۱۰۰ خطی با ۶ تب inline |
| [src/schemas/index.ts](file:///e:/FinancialMarket/src/schemas/index.ts) | Zod schemas — `UpdateEmailSettingsSchema` موجود |

### الگوهای موجود برای استفاده مجدد:

- **Rate-limit pattern:** در [src/actions/transfer.ts:128-136](file:///e:/FinancialMarket/src/actions/transfer.ts#L128-L136) الگوی `checkRateLimit` در `initiateTransfer`. تکرار در `findTransferRecipient`.
- **Settings action pattern:** [src/actions/settingsActions.ts:220+](file:///e:/FinancialMarket/src/actions/settingsActions.ts) — `updateCacheSettings` الگوی مناسب.
- **Server logger pattern:** `import { logError, logWarn } from '@/lib/server-logger'` در اکثر فایل‌ها.

---

## تغییرات پیشنهادی (Proposed Changes)

### T1: rate-limit روی `findTransferRecipient`

**فایل:** [src/actions/transfer.ts](file:///e:/FinancialMarket/src/actions/transfer.ts) (خط ۵۷-۱۱۰)
**چرا:** کاربر می‌تواند با ارسال شماره‌های متوالی، شماره‌های ثبت‌نام‌شده را enumerate کند.
**چگونه:**

۱. در [src/lib/rate-limiter.ts](file:///e:/FinancialMarket/src/lib/rate-limiter.ts) — نوع جدید اضافه شود:
```ts
// در rateLimiters object (خط ۱۵-۷۵):
'transfer-find': redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:transfer-find',
    })
  : null,

// در LIMITS object (خط ۸۹-۹۶):
'transfer-find': { max: 10, windowMs: 60 * 1000 },
```

۲. در [src/actions/transfer.ts](file:///e:/FinancialMarket/src/actions/transfer.ts) ابتدای `findTransferRecipient` بعد از `requireUser`:
```ts
const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
const rl = await checkRateLimit(`transfer-find:${auth.user.id}`, 'transfer-find');
if (!rl.success) {
  return {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'تعداد جستجوی گیرنده زیاد است. لطفاً صبر کنید.' },
  };
}
```

**ریسک:** صفر — فقط یک اکشن کند می‌شود. **Rollback:** حذف ۴ خط.

---

### T2: `devCode` فقط در dev

**فایل:** [src/lib/fintech/transaction-guard.ts](file:///e:/FinancialMarket/src/lib/fintech/transaction-guard.ts) (خط ۱۳۸-۱۴۵)
**چرا:** در production، `devCode` در response به client می‌رود و OTP leak می‌شود.
**چگونه:** در خط ۱۴۱-۱۴۴:
```ts
// قبل:
const devPayload = smsResult.devCode !== undefined ? ({ devCode: smsResult.devCode } as { devCode: string }) : {};
return { success: true, data: { expiresInSeconds: OTP_VALIDITY_MINUTES * 60, ...devPayload } };

// بعد:
const isDev = process.env.NODE_ENV !== 'production';
const devPayload = isDev && smsResult.devCode !== undefined
  ? { devCode: smsResult.devCode }
  : {};
return { success: true, data: { expiresInSeconds: OTP_VALIDITY_MINUTES * 60, ...devPayload } };
```

**ریسک:** صفر. **Rollback:** برگرداندن ۲ خط.

**نکته:** خطوط ۱۰۹-۱۱۳ (dev-only path) از قبل شرط `NODE_ENV` دارند — نیاز به تغییر نیست.

---

### T3: `console.log/error/warn` → `server-logger`

**فایل‌ها:** ۴۹ مورد در ۲۵ فایل (نتیجه grep قبلی).
**چرا:** در production لاگ‌ها leak می‌شوند. Sentry + server-logger ساختار مناسب دارد.
**چگونه:** Script زیر همه ۴۹ مورد را تبدیل می‌کند:

| الگوی فعلی | جایگزین |
|------------|---------|
| `console.error('Error ...', err)` در `useEffect`/`fetch` client | نگه‌داری (client console OK) — **یا** `if (process.env.NODE_ENV === 'development') console.error(...)` |
| `console.error` در Server Action | `logError(module, error)` |
| `console.warn` در server | `logWarn(module, message, context?)` |
| `console.log` در server | حذف کامل (نباید logging عمومی باشد) |

**استراتژی اجرا:**

مرحله A — **server-side files** (الویت):
- [src/auth.ts](file:///e:/FinancialMarket/src/auth.ts) (۳ مورد)
- [src/hooks/notifications.ts](file:///e:/FinancialMarket/src/hooks/notifications.ts) (۱)
- [src/hooks/postStore.ts](file:///e:/FinancialMarket/src/hooks/postStore.ts) (۱)
- [src/app/sitemap.ts](file:///e:/FinancialMarket/src/app/sitemap.ts) (۱)
- [src/hooks/usePageView.ts](file:///e:/FinancialMarket/src/hooks/usePageView.ts) (۱)
- [src/actions/createSuperAdmin.ts](file:///e:/FinancialMarket/src/actions/createSuperAdmin.ts) (۲)
- [src/lib/db.ts](file:///e:/FinancialMarket/src/lib/db.ts) (۱)
- [src/actions/getLatestPostCategories.ts](file:///e:/FinancialMarket/src/actions/getLatestPostCategories.ts) (۱)
- [src/lib/activity.ts](file:///e:/FinancialMarket/src/lib/activity.ts) (۱)
- [src/lib/activity-middleware.ts](file:///e:/FinancialMarket/src/lib/activity-middleware.ts) (۱)
- [src/lib/activity-logger.ts](file:///e:/FinancialMarket/src/lib/activity-logger.ts) (۱)
- [src/lib/error-handler.ts](file:///e:/FinancialMarket/src/lib/error-handler.ts) (۱)
- [src/lib/storage.ts](file:///e:/FinancialMarket/src/lib/storage.ts) (۳)
- [src/lib/site-identity.ts](file:///e:/FinancialMarket/src/lib/site-identity.ts) (۱)
- [src/lib/logger.ts](file:///e:/FinancialMarket/src/lib/logger.ts) (۱)
- [src/lib/email/console.ts](file:///e:/FinancialMarket/src/lib/email/console.ts) (۱)
- [src/lib/safe-cache.ts](file:///e:/FinancialMarket/src/lib/safe-cache.ts) (۲)

مرحله B — **client-side files** (اولویت پایین — client console طبیعی است):
- [src/lib/server-logger.ts](file:///e:/FinancialMarket/src/lib/server-logger.ts) (۲ مورد — خود logger — نگه‌داری شود)
- [src/components/*](file:///e:/FinancialMarket/src/components/) (باقی)

**الگوی تبدیل برای server:**
```ts
// قبل:
console.error('[module] failed:', error);

// بعد:
import { logError } from '@/lib/server-logger';
logError('module', error);
```

**ریسک:** پایین. **Rollback:** git revert.

---

### T4: Settings > Security: save handler واقعی

**فایل‌ها:**
- [src/actions/settingsActions.ts](file:///e:/FinancialMarket/src/actions/settingsActions.ts) — اکشن جدید `updateSecuritySettings`
- [src/schemas/index.ts](file:///e:/FinancialMarket/src/schemas/index.ts) — schema جدید
- [src/app/dashboard/settings/page.tsx](file:///e:/FinancialMarket/src/app/dashboard/settings/page.tsx) (خط ۷۸۰-۷۹۲) — handler متصل

**چرا:** ادمین فکر می‌کند تنظیم شده ولی فقط toast می‌بیند.
**چگونه:**

۱. در [src/schemas/index.ts](file:///e:/FinancialMarket/src/schemas/index.ts) اضافه شود:
```ts
export const UpdateSecuritySettingsSchema = z.object({
  twoFactorAuth: z.boolean(),
  ipRestriction: z.boolean(),
  minPasswordLength: z.number().int().min(6).max(20),
  sessionDuration: z.number().int().min(15).max(480), // دقیقه
});
```

۲. در [src/actions/settingsActions.ts](file:///e:/FinancialMarket/src/actions/settingsActions.ts) اکشن جدید:
```ts
export async function updateSecuritySettings(raw: unknown) {
  const authCheck = await requireSuperAdmin();
  if (!authCheck.success) return authFailureToActionResult(authCheck);

  const parsed = UpdateSecuritySettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR', message: 'مقادیر نامعتبر' };
  }

  try {
    await prisma.systemSettings.upsert({
      where: { id: 'singleton' }, // فرض: singleton — بررسی schema لازم
      create: { ...parsed.data },
      update: { ...parsed.data },
    });
    revalidatePath('/dashboard/settings');
    return { success: true, message: 'تنظیمات امنیتی ذخیره شد' };
  } catch (err) {
    logError('updateSecuritySettings', err);
    return { success: false, error: 'DB_ERROR', message: 'خطا در ذخیره' };
  }
}
```

> ⚠️ **نکته:** قبل از اجرا، schema.prisma بررسی شود — احتمالاً SystemSettings نیاز به migration برای فیلدهای جدید دارد. اگر فیلدها موجود نیستند:
> - migration جدید: `prisma migrate dev --name add_security_settings`
> - یا: از meta JSON field استفاده شود.

۳. در [src/app/dashboard/settings/page.tsx](file:///e:/FinancialMarket/src/app/dashboard/settings/page.tsx) خط ۷۸۰-۷۹۲:
```ts
const handleSaveSecurity = useCallback(async () => {
  setLoading(true);
  const r = await updateSecuritySettings(form.security);
  setLoading(false);
  if (r.success) {
    toast({ title: 'ذخیره شد', description: 'تنظیمات امنیتی ذخیره شد' });
  } else {
    toast({ title: 'خطا', description: r.message ?? 'خطا', variant: 'destructive' });
  }
}, [form.security, toast]);

// در JSX:
<Button onClick={handleSaveSecurity} disabled={loading}>
  {loading ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}
</Button>
```

**ریسک:** متوسط — نیاز به migration schema. **Rollback:** migration down.

---

### T5: Settings > Database/Advanced: save handler واقعی

**فایل‌ها:** همان T4.

**Database tab:** فرم نمایش داده می‌شود ولی **save ندارد**. فیلدها در حال حاضر (server, port, name, username, password, type) — هیچ‌کدام persist نمی‌شوند. چون این فیلدها sensitive هستند و در UI نمایش داده می‌شوند (نه فقط config):

> **تصمیم لازم:** Database tab باید واقعاً save شود یا فقط راهنمای config باشد؟

**Advanced tab:** فقط `cacheEnabled` save می‌شود. بقیه فیلدها (`debugMode`, `cacheDuration`, `maxUploadSize`, `apiKey`, `cacheStorage`, `rateLimit`, `logPath`, `errorLevel`) نمایش داده می‌شوند ولی بی‌اثرند.

**پیشنهاد:**

برای **Database tab:** فرم فقط نمایشی باشد + یک متن "این تنظیمات از طریق env variables تنظیم می‌شوند" + لینک به `.env.example`. این امن‌ترین رویکرد است.

برای **Advanced tab:** اکشن `updateAdvancedSettings` اضافه شود با این فیلدها:
- `cacheEnabled` (الان موجود)
- `cacheDuration` (عدد)
- `maxUploadSize` (عدد)
- `apiKey` (الان تولید می‌شود توسط `generateApiKey`)
- `debugMode` (بول)

و فیلدهای `cacheStorage`, `rateLimit`, `logPath`, `errorLevel` یا حذف شوند (اگر در code ارجاع نمی‌شوند) یا اضافه شوند.

**ریسک:** متوسط. نیاز به بررسی اینکه کدام فیلدها واقعاً در code استفاده می‌شوند.

---

## تصمیمات و فرض‌ها (Assumptions & Decisions)

| تصمیم | انتخاب | دلیل |
|-------|--------|------|
| آیا `findTransferRecipient` نیاز به auth دارد؟ | بله — `requireUser` از قبل دارد | تغییر نمی‌دهیم |
| آیا rate-limit بر اساس user.id یا IP؟ | `user.id` (چون auth لازم است) | اگر attacker یک account داشته باشد، ۱۰/min کافی است |
| `devCode` در staging چه؟ | staging = NODE_ENV !== 'production' پس dev code نمایش داده می‌شود | قابل‌قبول برای تست |
| Settings > Database: save یا فقط نمایش؟ | فقط نمایش + متن "env-based" | امن‌تر؛ تغییر connection string در production خطرناک |
| Settings > Advanced فیلدهای بی‌اثر: حذف یا save؟ | **نیاز به تأیید کاربر** | بهتر است بر اساس نیاز واقعی تصمیم گرفته شود |
| `console.log` در client: نگه‌داری یا حذف؟ | نگه‌داری (client console طبیعی است) | فقط server-side تغییر می‌کند |

---

## گام‌های اجرا (Execution Steps)

```text
Step 1: T2 (devCode) — ۱ دقیقه — ایمن
Step 2: T1 (rate-limit transfer-find) — ۵ دقیقه — ایمن
Step 3: T3 مرحله A (server-side console) — ۱۵ دقیقه — repetitive
Step 4: T4 (Settings Security save) — ۱۰ دقیقه — نیاز schema check
Step 5: T5 (Settings Advanced + Database decision) — ۱۰ دقیقه — نیاز تأیید کاربر
Step 6: npm run verify — ۲ دقیقه
```

**کل تخمین:** ~۴۵ دقیقه

---

## تأییدیه‌های لازم (Verification)

بعد از اجرا:

| چک | دستور / عمل |
|----|------------|
| TypeScript | `npm run typecheck` |
| Biome lint | `npm run lint` |
| Test (unit) | `npm run test` |
| Build dry | `npm run build` (ولی dev server نه) |
| Manual trace | findTransferRecipient → ۶ تست → ۱۱ تست = RATE_LIMITED |
| Manual trace | Settings > Security > save → reload صفحه → مقادیر حفظ شده |

---

## سؤالات باز (قبل از شروع T5)

T5 نیاز به تأیید دارد:

1. **Database tab:** فیلدها نمایش داده شوند فقط به‌عنوان راهنما، یا واقعاً save شوند؟
2. **Advanced tab:** فیلدهای `cacheStorage`, `rateLimit`, `logPath`, `errorLevel` در code استفاده می‌شوند؟ (نیاز به grep سریع قبل از تصمیم)

اگر پاسخ مشخص نیست، T5 فقط شامل `cacheEnabled` + `cacheDuration` + `maxUploadSize` + `debugMode` باشد (ایمن‌ترین subset) و بقیه با placeholder "در دست توسعه" نمایش داده شوند.

---

## فایل‌های تغییر یافته (خلاصه)

| فایل | تغییر |
|------|-------|
| [src/lib/rate-limiter.ts](file:///e:/FinancialMarket/src/lib/rate-limiter.ts) | + نوع `transfer-find` |
| [src/actions/transfer.ts](file:///e:/FinancialMarket/src/actions/transfer.ts) | + rate-limit در `findTransferRecipient` |
| [src/lib/fintech/transaction-guard.ts](file:///e:/FinancialMarket/src/lib/fintech/transaction-guard.ts) | devCode فقط در dev |
| [src/schemas/index.ts](file:///e:/FinancialMarket/src/schemas/index.ts) | + UpdateSecuritySettingsSchema |
| [src/actions/settingsActions.ts](file:///e:/FinancialMarket/src/actions/settingsActions.ts) | + updateSecuritySettings, updateAdvancedSettings |
| [src/app/dashboard/settings/page.tsx](file:///e:/FinancialMarket/src/app/dashboard/settings/page.tsx) | handleSaveSecurity/Advanced متصل |
| ~۱۷ فایل server-side | console → server-logger |

**Migration لازم:** احتمالاً بله (اگر SystemSettings فیلد security ندارد).

**Schema.prisma بررسی قبل از T4/T5** — بدون آن migration نمی‌توان نوشت.
