# Project Memory — BlogMarketFinansial

## Tailwind v4 + globals.css heading styles

**مشکل:** فایل `src/app/globals.css` (در نسخه‌های قبلی پروژه) heading selector هایی مثل
`h1, h2, h3, ...` و `h2 { font-size: var(--fs-3xl); }` داشت. این‌ها **specificity بالاتری**
از کلاس‌های Tailwind utility مثل `.text-base` ندارن، ولی چون **cascade ترتیب لود** در
Tailwind v4 ممکنه اون‌ها رو بعد از utilities لود کنه، کلاس‌های Tailwind بازنده می‌شدن.

**نتیجه:** هر وقت سعی می‌کردیم `text-base sm:text-xl lg:text-2xl` روی `<h2>` بذاریم،
اندازه واقعی همون `var(--fs-3xl)` (22px) می‌شد نه 16px.

**راه‌حل اعمال‌شده:** در `src/app/globals.css` فقط استایل‌های non-size heading ها
نگه داشته شد (line-height, font-weight, letter-spacing). هیچ `font-size` برای heading
elements تعریف نشده تا Tailwind utilities کنترل کامل داشته باشن.

**قانون برای آینده:**
- هیچ‌وقت `font-size` رو مستقیماً روی heading elements تو globals.css تنظیم نکن.
- اگه لازم شد heading پیش‌فرض داشته باشیم، از `.prose` (Tailwind Typography) یا
  کلاس‌های utility استفاده کن.
- اگه heading ای به‌صورت global نیاز به سایز خاصی داشت، از `[data-heading="..."]`
  یا کلاس سفارشی استفاده کن، نه از element selector.

## آیکون‌های lucide و کاراکترهای خاص

**مشکل:** کاراکترهای `◆` (U+25C6), `▲` (U+25B2), `▼` (U+25BC) تو فونت Vazirmatn
(فونت اصلی پروژه) پشتیبانی نمی‌شن و به کلمه فارسی fallback می‌شن (مثل "خط" بجای `◆`).

**راه‌حل:** همیشه از `lucide-react` icons استفاده کن (`TrendingUp`, `TrendingDown`,
`Minus`) بجای کاراکترهای نمادین.
