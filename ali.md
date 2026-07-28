# طراحی داشبورد فرانت‌اند

> **Workspace:** /mnt/FinancialMarket

---

**User**

`/mnt/FinancialMarket/طراحی داشبورد فرانت‌اند میلیون دلاری.md` 
 
 ادامه تسک ها و صفحات که مونده و اینکه لوگو اپلود بشه

**Assistant**

## گزارش تسک

### ✅ انجام شد — Logo Upload (P0)

| فایل | تغییر |
|------|-------|
| [route.ts](file:///mnt/FinancialMarket/src/app/api/upload/route.ts#L20-L30) | افزودن `logos` و `exchange` به `ALLOWED_FOLDERS` + استثنای authenticated-only برای این دو پوشه (binding در `updateExchangeSelf` کنترل می‌شود) |
| [ImageUploader.tsx](file:///mnt/FinancialMarket/src/components/ImageUpload/ImageUploader.tsx#L21-L29) | گسترش `UploadFolder` type برای پشتیبانی از `logos` و `exchange` |
| [LogoUploader.tsx](file:///mnt/FinancialMarket/src/app/(exchange)/exchange/profile/_components/LogoUploader.tsx) | **جدید** — آپلودر inline با drag&drop، XHR progress، preview، جایگزینی/حذف، اعتبارسنجی سمت کلاینت (۵MB / PNG-JPG-WebP-GIF) |
| [LogoUploader.module.css](file:///mnt/FinancialMarket/src/app/(exchange)/exchange/profile/_components/LogoUploader.module.css) | **جدید** — طراحی P2026 هم‌خوان با ProfileWorkspace (token-only، logical props، ریسپانسیو) |
| [ProfileWorkspace.tsx](file:///mnt/FinancialMarket/src/app/(exchange)/exchange/profile/_components/ProfileWorkspace.tsx#L42) | جایگزینی فیلد URL قدیمی با `<LogoUploader>` + hint جدید |
| [ProfileWorkspace.module.css](file:///mnt/FinancialMarket/src/app/(exchange)/exchange/profile/_components/ProfileWorkspace.module.css) | پاکسازی کلاس‌های مرده (`.logoRow`, `.logoPreview`, `.logoImg`, `.logoFallback`) + افزودن `.logoHint` |

### 🎯 ویژگی‌های LogoUploader
- **drag & drop** با visual feedback (border + scale)
- **keyboard accessible** (Enter/Space برای فعال‌سازی، focus ring)
- **real-time progress** از `xhr.upload.progress` (نه fake)
- **validation سمت کلاینت** (MIME + size 5MB — سرور هم چک می‌کند)
- **3 حالت**: idle / uploading (با overlay + percent) / success (با badge) / error (با alert)
- **مقاوم در برابر آپلود تکراری همان فایل** (reset input value)
- **ریسپانسیو** (column در ≤600px)
- **disabled state** برای کاربران بدون دسترسی ویرایش (staff غیرمالک)
- **دسترسی‌پذیری**: `aria-label`، `aria-live`، `role="progressbar"`

### 💡 نکات معماری
- **CUSTOM-FIRST, NATIVE-NEVER رعایت شد** — LogoUploader به‌جای استفاده از `<input type="file">` به‌صورت خام، dropzone اختصاصی ساخته شد
- **Token-only CSS** — `--at-*` و `--ds-*` بدون hex/rgb/px
- **P2026 design language** — هم‌خوان با سایر کامپوننت‌های settings/profile
- **Binding امن** — حتی اگر کاربر authenticated باشد، `updateExchangeSelf` قبل از نوشتن `Exchange.logoUrl` چک می‌کند که OWNER/MANAGER باشد (auth در server action، نه فقط upload)

### 📋 وضعیت صفحات (طبق فایل طراحی قبلی)
همهٔ صفحات بازطراحی‌شده در فایل `طراحی داشبورد فرانت‌اند میلیون دلاری.md` تکمیل شده‌اند:
- ✅ `/exchange/profile` — با logo upload جدید
- ✅ `/exchange/settings` (overview + operations + working-hours + security)
- ✅ `/exchange/dashboard` با ۱۸ کامپوننت sub-section
- ✅ `/exchange/staff` با sub-routes
- ✅ `/exchange/customers`, `/transactions`, `/quotes`, `/rates`, `/settlement`, `/reports`

### ⚠️ ناقص / بعداً
- **verify (lint + tsc)** — در sandbox اجرا نشد (node/biome در PATH موجود نیست). لطفاً در محیط dev اجرا کنید:
  ```bash
  npm run verify
  ```
  هر خطایی که پیدا شد برطرف می‌کنم.

### 🐛 خطرات احتمالی
- **رنگ‌های `--at-fg-faint` در dark mode** ممکن است کنتراست کم داشته باشد (طبق تعریف `oklch(44% 0.02 250)` در dark) — اگر placeholder خیلی کم‌رنگ شد، `color-mix` با `--at-fg-muted` جایگزین شود.
- **`MAX_CANONICAL_WIDTH=1920`** در upload API: لوگوها معمولاً کوچک‌تر از 1920 هستند، پس این فقط یک سقف ایمن است. اگر نیاز به canonical چند size باشد، باید `getImageVariants` در storage توسعه یابد.

سؤال: **صفحات خاصی** از سایر بخش‌ها (مثلاً `dashboard/billing-address`، `customer/profile`، `customer/kyc` یا `/dashboard/exchanges/[id]`) مد نظرتان هست که بازطراحی شود؟ یا این تسک (logo upload) تمام چیزی بود که می‌خواستید؟

---

**User**

http://localhost:3000/exchanges/omid 
 میزنه خطای 404

**Assistant**

Error: Your requests have exceeded the quota.

---

