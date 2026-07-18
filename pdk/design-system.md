# بخش ۸ — DESIGN SYSTEM (تخصصی افغانستان)

این ماژول پاسخ به درخواست «طراحی تخصصی، به‌روز ۲۰۲۶، غیر AI-Slop» است. برای چرخه خوداصلاح‌گر به `design-cycle.md` ارجاع شود.

> ## ⚠️ آشتی با واقعیت ریپو (مهم)
> ریپو از قبل یک **Design System واقعی و باکیفیت** دارد: `src/components/ds/styles/tokens.css` (توکن‌های **OKLCH کم‌اشباع**) + `src/components/ui/*` (کامپوننت‌های Radix/CVA) + motion کاملاً CSS-driven + RTL/logical properties.
> **برند فعلی:** indigo/periwinkle `#5E6AE6` (`--color-primary-500`). این سیستم از نظر بصری **تخصصی و غیر AI-Slop** است.
> ✅ **قانون:** هر صفحه فین‌تک باید روی این DS بنا شود. **سیستم رقیب نساز.** جداول توکن زیر «لایهٔ فین‌تک» (افزودنی) را تعریف می‌کنند، نه جایگزین توکن‌های موجود.
> 🔴 **تصحیح PDK قبلی:** پیشنهاد «برند زعفران/فیروزه» در نسخهٔ greenfield **لغو** شد — مگر در صورت بازبرندینگ صریح. پیش‌فرض: حفظ ایندیگو.
> قبل از طراحی هر صفحه، حتماً `src/components/ds/styles/tokens.css` و `src/components/ui` را بخوان.

## ۸.۱ فلسفه طراحی
1. **اعتماد از طریق آرامش (Calm Confidence):** طراحی calm, clear, quick. مالی احساسی است؛ در لحظه تراکنش اضطراب در ثانیه کاهش یابد.
2. **Role-aware، نه یکسان:** چارچوب Role-Metric-Density-Action — با عددی شروع کن که پرسش اول کاربر را پاسخ دهد.
3. **Progressive Disclosure:** فقط آنچه لازم است در هر مرحله.
4. **Micro-confidence:** بازخورد کوچک لحظه‌ای به جای نشانه بزرگ اعتماد.
5. **شفافیت ساختاری (Structural Honesty):** کارمزد پیش از تأیید، وضعیت صریح، هیچ dark pattern.
6. **استمرار (Continuity):** انیمیشن همیشه به جلو؛ هیچ pop-in.
7. **محدودیت = معنا:** سبک‌های کمتر، سلسله‌مراتب قوی‌تر.

## ۸.۲ معماری Design Tokens (W3C DTCG v1.0)
```
Primitive (خام)  →  Semantic (معنایی)  →  Component (مولفه)
```
- هیچ مقدار خام مستقیم در کامپوننت (همیشه semantic).
- نسخه‌بندی توکن‌ها مثل کد (semver).
- دارک‌مود با modes (نه override جداگانه).
- یکپارچگی Figma ↔ Code: خروجی JSON توکن‌ها → CSS variables / Tailwind theme.

## ۸.۳ جداول توکن — رنگ (Primitive)
| توکن | Light | Dark | یادداشت |
|------|-------|------|---------|
| `blue-500` | #2E74C7 | #4C90E0 | interactive |
| `blue-600` | #1F5FA8 | #3C7BC8 | primary anchor |
| `blue-700` | #184C88 | #2E63A8 | header/امنیت |
| `slate-900` | #0F1216 | #0F1216 | near-black bg |
| `slate-800` | #161B22 | #161B22 | surface raised |
| `slate-100` | #F7F8FA | #1B212B | surface |
| `slate-200` | #E4E7EC | #232A33 | border subtle |
| `green-600` | #1F9D55 | #2FB56A | success |
| `red-600` | #D64545 | #E86565 | danger |
| `amber-600` | #C9871B | #E0A23A | warning |
| `saffron-500` | #E0A526 | #F0B73E | Tier-3 personality |

## ۸.۴ جداول توکن — رنگ (Semantic)

> **آشتی:** توکن‌های زیر «لایهٔ فین‌تک پیشنهادی» هستند. منبع حقیقت رنگ‌ها `src/components/ds/styles/tokens.css` (ایندیگو `#5E6AE6`) است و باید حفظ شود.
> `color-personality` (saffron) **فقط در صورت بازبرندینگ** استفاده شود؛ پیش‌فرض روی برند ایندیگو موجود است.

| توکن | مقدار | کاربرد |
|------|-------|--------|
| `color-primary` | blue-600 | دکمه اصلی، لینک |
| `color-primary-hover` | blue-700 | هاور |
| `color-surface` | slate-100 / slate-900 | پس‌زمینه صفحه |
| `color-surface-raised` | #FFF / slate-800 | کارت |
| `color-border` | slate-200 / #232A33 | حاشیه |
| `color-text` | #1A1F29 / #E6E9EF | متن بدنه |
| `color-text-muted` | #5B6472 / #9AA4B2 | متن فرعی |
| `color-success` | green-600 | برداشت مثبت |
| `color-danger` | red-600 | خطا/برداشت منفی |
| `color-warning` | amber-600 | هشدار |
| `color-personality` | saffron-500 | accent اختصاصی (CTA ثانویه/برند) |

## ۸.۵ کنتراست (WCAG 2.2)
- متن بدنه: **۴.۵:۱** (هدف ۷:۱).
- عدد مالی: **۷:۱** حداقل.
- عناصر غیرمتنی: **۳:۱**.
- کوررنگی: ۸٪ مردان؛ هرگز فقط red/green؛ آیکون+برچسب الزامی.
- دارک‌مود: پس‌زمینه near-black؛ تست کنتراست در CI (توکن‌محور).

## ۸.۶ تایپوگرافی
- متن دری/پشتو: Vazirmatn یا فونت محلی مناسب (وزن ۴۰۰/۶۰۰).
- عدد/لاتین: فونت عددی با kern مناسب (tabular-nums).
- مقیاس ماژولار (۱.۲۵):
  `xs:12 sm:14 base:16 lg:18 xl:22 2xl:28 3xl:36 4xl:48`
- مبالغ: هم‌تراز رقم، جداکننده هزارگان محلی، بدون لرزش.
- RTL: هم‌ترازی منطقی؛ عدد درون متن دری LTR (`dir` جزئی).

## ۸.۷ فاصله، رادیوس، سایه
- Spacing scale (۴px base): `1:4 2:8 3:12 4:16 5:24 6:32 7:48`.
- Radius: `sm:6 md:10 lg:12` (نه ۲۴ افراطی).
- Shadow: `sm` (کارت)، `md` (dropdown)، `lg` (modal) — نرم و کم‌عمق.

## ۸.۸ مولفه‌ها (Component Spec)
- **Button:** ۴ سطح (primary/success/ghost/danger)، ۳ اندازه، حالت‌های hover/focus/loading/disabled، focus-ring ۲px (۳:۱).
- **Input:** برچسب بالا، پیام خطا زیر، حالت valid/invalid/focus.
- **AmountField:** فرمت‌دهی لحظه‌ای AFN، دکمه‌های سریع (۵۰/۱۰۰/۵۰۰).
- **TransactionRow:** مبدأ/مقصد، مبلغ، زمان نسبی، وضعیت با آیکون+رنگ.
- **Card (Surface):** radius ۱۲، سایه نرم، بدون حاشیه رنگی یک‌طرفه.
- **Navigation:** سایدبار (ادمین/صراف)، تب‌بار پایین (موبایل مشتری).

## ۸.۹ وضعیت‌ها (States)
- **Empty:** راهنمای واضح + اقدام اصلی.
- **Loading:** skeleton معنادار (شکل محتوا) نه spinner بی‌ربط.
- **Error:** پیام انسانی + راه بازگشت.
- **Success:** چک‌مارک + خلاصه تراکنش.
- **Offline/Cached:** وضعیت صریح.

## ۸.۱۰ میکروانیمیشن و حرکت (۲۰۲۶ — Functional, not decorative)
- **هدف:** تأیید عمل، حفظ استمرار (continuity)، هدایت توجه، بیان وضعیت. «موشن برای حس، متن برای معنی».
- **ویژگی‌های قابل انیمیت:** فقط `opacity` + `transform` (+ `filter` با احتیاط). هرگز `width/height/top/left/margin/padding` (layout thrash).
- **Spring physics:** به‌جای cubic-bezier مکانیکی، از mass/stiffness/damping استفاده کن (CSS `linear()`، Motion، React Spring). دکمه/مودال/لیست «زنده» حس می‌شوند.
- **مدت (توکن‌محور):** میکرو ۱۲۰ms · مولفه ۲۰۰–۳۰۰ms · صفحه ۳۰۰–۵۰۰ms. >۵۰۰ms باید توجیه داشته باشد.
- **Easing به‌مثابه فعل:** ease-out برای ورود، ease-in برای خروج، ease-in-out بین دو حالت، linear فقط برای لودر نامعلوم.
- **Scroll-linked:** `scroll-timeline` / `view-timeline` نیتیو CSS + View Transitions API برای shared-element (بدون JS orchestration).
- **Interruptible:** state حرکت را هدایت می‌کند؛ لغو میان‌حالت از فریم جاری برمی‌گردد.
- **prefers-reduced-motion:** در ریشه (CSS global) + guard سطح JS برای حرکت سنگین.
- **بدون pop-in/flash** (اصل استمرار)؛ هیچ Lottie runtime (بدهی ساختاری ۶۰–۱۲۰KB JS).

## ۸.۱۰ب توکن‌های حرکت (Motion Tokens — لایه DS)
```
--motion-duration-fast:   120ms   /* hover, focus, tap */
--motion-duration-base:   220ms   /* modal, drawer, dropdown */
--motion-duration-slow:   380ms   /* page/view-transition */
--motion-ease-out:        cubic-bezier(0.16,1,0.3,1)
--motion-ease-in:         cubic-bezier(0.4,0,1,1)
--motion-ease-standard:   cubic-bezier(0.4,0,0.2,1)
--motion-spring-tap:      linear(...) /* spring mass/stiffness/damping */
--motion-breath:          0.5Hz  /* ambient stroke oscillation */
```

## ۸.۱۶ افکت‌های سبک‌اما‌خاص ۲۰۲۶ (کتابخانه — با سرعت، با هویت)
هر افکت GPU-friendly (فقط opacity/transform) و دارای نسخه reduced-motion است:
1. **Spring tap:** فشردگی ۱۲۰ms scale-down-and-back روی دکمه (حس هاپتیک بدون هاپتیک واقعی).
2. **Kinetic SVG icons:** مورف نیتیو SMIL/CSS (هامبورگر→X با node-normalized paths)؛ <۱۵ نود، `will-change:transform; contain:paint`.
3. **System-breath:** نوسان ۰.۵Hz opacity/stroke-width روی استروک‌های محیطی = «رابط زنده اما ساکت» (دوست‌دار OLED).
4. **View-Transition drill-down:** کارت→جزئیات عنصر/موقعیت مشترک دارد (استمرار، بدون pop).
5. **Scroll-reveal:** `view-timeline` fade+translateY هنگام ورود سکشن؛ پشتِ reduced-motion.
6. **Hairline glow:** حاشیه ۱px + box-shadow ظریف روی focus (نه glow سنگین).
7. **Ambient SVG light:** استروک نازک خودروشن به‌جای بلوب گلس سنگین.
8. **State-ready SVG:** حلقه پیشرفت با `role="progressbar"` + `aria-valuenow` (دسترس‌پذیر).

> **ممنوع در ۲۰۲۶:** Lottie runtime · مونوکالچر استرایپ (دارک+Inter+بنتو بدون منطق) · موشن صرفاً cubic-bezier · پارالاکس تمام‌صفحه تزیینی · ویدئوی autoplay پس‌زمینه · ۳ کارت گرد یکسان هیرو.

## ۸.۱۱ الگوهای چیدمان (Layout Patterns)
- **مشتری (Mobile-first):** تب‌بار پایین، کارت موجودی بزرگ، FAB انتقال، تاریخچه اسکرولی.
- **صراف/ادمین (High-density):** سایدبار، جداول فشرده، فیلتر سریع، KPI بالا (الهام Mercury).
- **Bento grid** برای خلاصه داشبورد (شکاف منطقی، نه کارت یکسان).
- **Progressive disclosure** در KYC/انتقال.

## ۸.۱۲ RTL و دسترس‌پذیری
- RTL همیشه روشن؛ logical properties اجباری.
- WCAG 2.2 AA: کنتراست، focus visible، ناوبری کیبورد، ARIA.
- عدد/واحد فرمت دری/افغان؛ احترام به `prefers-reduced-motion`.
- تست a11y در PR (axe/lint).

## ۸.۱۳ ریسپانسیو
- Mobile-first؛ نقاط شکست منطقی؛ بدون رفتار شکسته در تبلت/دسکتاپ.
- تعامل لمسی و کیبورد هر دو.

## ۸.۱۴ دارک‌مود درجه‌یک
- طراحی همزمان light/dark با modes توکن.
- پس‌زمینه near-black (#0F1216)، elevation ظریف، کنتراست تست‌شده.
- فوکوس دیدوی، آیکون جداگانه تست شوند.
- گزارش کنتراست در CI.

## ۸.۱۵ منابع
- W3C Design Tokens Community Group (DTCG) v1.0 — 2025-10.
- Coloracci.ai — Fintech Color Psychology 2026.
- WeAndTheColor — Fintech Color Trust Hierarchy 2026.
- Eleken — Modern Fintech Design Guide 2026.
- MadeGoodDesigns — UI Trends 2026.
- **آدامارانت — Functional UI Animation 2026 (checklist: spring, tokens, reduced-motion).**
- **Envato Elements — Calm Interfaces 2026 (پایان نمایش‌های بصری، شفافیت AI).**
- **Internal Orbit — Calm & Clear Interfaces 2026 (motion explains not performs).**
- **Creative Alive — Micro-Interactions 2026 (spring, scroll-timeline, haptic-style, view-transitions).**
- **Lucky Graphics — Kinetic Web / SVG 2026 (native SMIL 2.0, Bioluminescent Minimalism, no Lottie).**
- **The Masterly — Fintech Design 2026 (Stripe monoculture warning, trust via data not decoration).**
- **WSA / Skins Factory / Mara — Fintech UX 2026 (proof-first IA, friction-right, EAA, 44px targets, state clarity).**
