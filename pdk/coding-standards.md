# بخش ۵ — استانداردهای کدنویسی (Coding Standards)

## ۵.۱ زبان و فرمت
- TypeScript strict؛ naming انگلیسی:
  - `camelCase` متغیر/تابع
  - `PascalCase` کامپوننت/نوع
  - `UPPER_SNAKE` ثابت
  - فایل‌ها `kebab-case` (`transfer-form.tsx`)
- ESLint + Prettier اجباری؛ هیچ خطای lint در PR.
- هیچ `any`، هیچ `console.log` در production (از logger استفاده کن).

## ۵.۲ کامپوننت‌ها
- function components + hooks.
- کامپوننت کوچک و تک‌مسئولیت (SRP).
- جداسازی presentational از container؛ منطق در `lib`/`features`.
- هیچ منطق مالی در client component.

## ۵.۳ State Management
- Server state: RSC + fetch مستقیم؛ کش با `unstable_cache`.
- Client state موقت: `useState`/`useReducer`؛ پیچیده: Zustand (سبک) یا Context محدود.
- مدیریت فرم: React Hook Form + Zod (اعتبارسنجی هم‌سطح client/server).
- هیچ global mutable state بزرگ بی‌دلیل.

## ۵.۴ خطایابی و تایپ
- همه ورودی‌های خارجی (API، form، query params) با Zod اعتبارسنجی.
- خطاها typed؛ هیچ `catch (e)` بدون نوع‌دهی.
- Result pattern ترجیحاً برای عملیات مالی:
  ```ts
  type Result<T> = { ok: true; data: T } | { ok: false; error: AppError }
  ```

## ۵.۵ ساختار feature
```
features/transfer/
  components/        # فقط UI
  server/            # server actions / queries
  schema.ts          # Zod schemas
  types.ts
  index.ts           # public API
```

## ۵.۶ کد تمیز (Clean Code)
- نام‌گذاری توصیفی (فعل+اسم برای تابع: `createTransfer`).
- توابع کوچک (< ۴۰ خط ترجیحاً).
- هیچ تابع با اثر جانبی پنهان.
- تست‌پذیری از ابتدا (dependency injection برای سرویس خارجی).
- هیچ کد مرده / کامنت‌های توضیحی بی‌دلیل.
