# DESIGN REFERENCE — FinancialMarket 2026
> **این فایل مرجع طراحی پروژه است.**
> قبل از هر تصمیم بصری جدید، این فایل را بخوان.
> آخرین بروزرسانی: 2026-08-05 (از روی سایت‌های واقعی با playwright)

---

## ۱. مرجع‌های اصلی — سایت‌های واقعی دیده‌شده

### 🏦 Mercury (mercury.com) — نزدیک‌ترین به ما
**چرا مرجع اصلی:** fintech dashboard، نئوبانک، target audience مشابه

| ویژگی | جزئیات |
|---|---|
| **پس‌زمینه** | Navy dark: `oklch(14% 0.02 255)` — نه سیاه محض |
| **کارت‌ها** | بدون border، فقط background تیره‌تر از canvas |
| **اعداد** | Extra-bold، tabular-nums، سفید روی تاریک |
| **Icon حساب** | دایره کوچک با حرف اول — ساده، نه SVG fancy |
| **لیست تراکنش** | دو ستون (account | balance)، خط جداکننده بسیار ظریف |
| **رنگ accent** | آبی روشن `#4B6EFF` برای CTA، نه بنفش |
| **Typography** | Inter/System font، weight 400/600/700 — نه 800/900 |
| **فضا** | padding بزرگ، breathing room واقعی |
| **Hover** | background تغییر می‌کند، نه transform/scale |

**درس اصلی از Mercury:** سادگی با عمق — depth از contrast رنگ می‌آید، نه از shadow یا blur

---

### 💳 Stripe (stripe.com/payments) — مرجع فرم و جریان پرداخت

| ویژگی | جزئیات |
|---|---|
| **پس‌زمینه** | سفید خالص `#fff` |
| **کارت payment** | border `1px solid #e5e7eb`، radius `12px`، shadow خیلی ظریف |
| **دکمه اصلی** | `rounded-full`، رنگ solid بدون gradient |
| **Layout** | دو ستون — متن چپ، demo راست |
| **رنگ brand** | بنفش `#635BFF` — ولی ما بنفش نداریم |
| **Input fields** | border ظریف، focus ring آبی ملایم |
| **Typography** | sans-serif bold برای headline، regular برای body |

**درس از Stripe:** فرم‌ها باید breathing room داشته باشند — هر input در یک row مستقل

---

### 💸 Wise (wise.com) — مرجع currency conversion

| ویژگی | جزئیات |
|---|---|
| **Typography** | `font-weight: 900` uppercase برای hero — جسور |
| **اعداد exchange** | بسیار بزرگ، decimal کوچک‌تر (`1,146.63`) |
| **رنگ brand** | سبز `#00B9A1` — ما از `var(--nova-up)` استفاده می‌کنیم |
| **Layout** | دو ستون تمام صفحه — متن + widget |
| **کارت currency** | پس‌زمینه سفید با border ظریف، select در داخل کارت |

**درس از Wise:** عدد exchange باید **hero** صفحه باشد، نه یک input معمولی

---

### ⚡ Linear (linear.app) — مرجع dashboard dark mode

| ویژگی | جزئیات |
|---|---|
| **پس‌زمینه** | سیاه کامل `#000` — بدون هیچ texture یا gradient |
| **Typography hero** | `font-size: clamp(3rem, 6vw, 5rem)`, weight 800 |
| **رنگ** | فقط سفید و خاکستری — accent فقط در icon‌های status |
| **Sidebar** | خاکستری تیره، hover با background ظریف |
| **Row items** | فشرده (32-36px height)، دو ستون |
| **Focus state** | ring آبی `2px solid` |

**درس از Linear:** در dark mode، فقط یک رنگ accent داشته باش. بقیه grayscale.

---

## ۲. قوانین طراحی 2026 (از روی مرجع‌های واقعی)

### ❌ چیزهایی که شرکت‌های بزرگ **نمی‌کنند**

```
✗ Glass morphism / backdrop-blur روی کارت‌های معمولی
✗ Gradient background روی کارت stat
✗ Box-shadow بزرگ و رنگی (glow effect)
✗ Animation hover با transform: translateY یا scale
✗ border-radius > 20px روی همه چیز
✗ Icon size < 16px داخل button/badge
✗ Text با opacity کمتر از 0.5 برای readable content
✗ بیش از ۲ رنگ accent در یک صفحه
✗ Skeleton با shimmer تند (> 1.5s)
✗ Card با بیش از ۳ سطح visual hierarchy
```

### ✅ چیزهایی که همه **می‌کنند**

```
✓ Shadow فقط 1-2px blur برای depth ظریف
✓ Border 1px solid با رنگ خیلی ملایم
✓ Hover فقط با border-color یا background تغییر
✓ Typography: label کوچک بالا، عدد بزرگ وسط، sub کوچک پایین
✓ Tabular-nums برای همه اعداد مالی
✓ letter-spacing: -0.02em تا -0.04em برای headline‌های بزرگ
✓ Gap بین المان‌ها: حداقل 8px، معمولاً 16-24px
✓ Padding کارت: حداقل 20px، معمولاً 24px
✓ Focus ring: 2px solid brand-color با offset
✓ Transition: max 200ms، فقط opacity/color/border — نه transform
```

---

## ۳. پالت رنگ مرجع (برای ما)

### Light Mode
```css
/* Background layers */
--bg-page:    oklch(98% 0.003 240)   /* خیلی روشن، تقریباً سفید */
--bg-card:    oklch(100% 0 0)         /* سفید خالص */
--bg-subtle:  oklch(96% 0.005 240)   /* برای sidebar/filter */

/* Borders */
--border-sm:  oklch(92% 0.005 240)   /* ظریف‌ترین */
--border-md:  oklch(86% 0.008 240)   /* hover state */

/* Text */
--text-primary:   oklch(15% 0.01 250)  /* تقریباً سیاه */
--text-secondary: oklch(40% 0.01 250)  /* خاکستری */
--text-muted:     oklch(60% 0.008 250) /* placeholder */

/* Accents */
--up:    oklch(55% 0.18 145)  /* سبز — واریز/موفق */
--down:  oklch(55% 0.20 25)   /* قرمز — برداشت/خطا */
--amber: oklch(70% 0.16 60)   /* زرد — در انتظار */
--brand: oklch(55% 0.18 255)  /* آبی — primary action */
```

### Dark Mode (dashboard)
```css
--bg-page:    oklch(12% 0.01 255)    /* navy تاریک */
--bg-card:    oklch(16% 0.012 255)   /* کارت */
--bg-elevated:oklch(20% 0.014 255)   /* hover/elevated */
--border-sm:  oklch(28% 0.01 255)    /* ظریف */
```

---

## ۴. Typography Scale

```css
/* اعداد مالی بزرگ (موجودی، مبلغ) */
.financial-hero {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

/* Label بالای عدد */
.metric-label {
  font-size: 0.75rem;      /* 12px */
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.01em;
}

/* عدد stat کارت */
.stat-value {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.03em;
}

/* متن ردیف لیست */
.row-primary {
  font-size: 0.875rem;  /* 14px */
  font-weight: 600;
}
.row-secondary {
  font-size: 0.75rem;   /* 12px */
  font-weight: 400;
  color: var(--text-muted);
}
```

---

## ۵. Card Patterns — از روی Mercury/Stripe

### Pattern A — Stat Card (کارت آماری)
```
┌──────────────────────────────┐
│  Label          [  Icon  ]   │  ← label + icon در دو طرف
│                              │
│  1,234                       │  ← عدد بزرگ (font-size: 2rem+)
│  توضیح کوتاه                 │  ← sub-label کوچک
└──────────────────────────────┘
border: 1px solid --border-sm
background: --bg-card
shadow: 0 1px 3px rgba(0,0,0,0.06)
radius: 16px
padding: 24px
hover: border-color → --border-md (فقط)
```

### Pattern B — List Row (ردیف لیست)
```
[Icon] نوع تراکنش            +1,234 AFN
       تاریخ · توضیح         موفق ●
```
```
padding-block: 14px
padding-inline: 20px
hover: background کمی تیره‌تر (4% opacity)
separator: 1px solid --border-sm
rail: 3px رنگی در سمت چپ (status indicator)
```

### Pattern C — Filter Chips
```
[ همه ] [ واریز ] [ برداشت ] [ تبدیل ]
```
```
border: 1px solid --border-sm
border-radius: 999px
padding: 4px 12px
active: background: --brand, color: white
hover: border-color → --brand (30% opacity)
```

---

## ۶. Component Libraries 2026 — مرجع کد

### shadcn/ui Blocks (ui.shadcn.com/blocks)
> **بهترین منبع برای dashboard blocks** — open source، قابل copy

- Dashboard-01: sidebar + charts + data table
- `npx shadcn add dashboard-01`
- **مرجع برای:** layout sidebar، stat cards، data tables

### Aceternity UI (ui.aceternity.com/components)
> **بهترین برای micro-interactions** — Tailwind + Framer Motion

- Text Flipping Board، Bento Grid، Spotlight
- **مرجع برای:** hero animations، hover effects
- ⚠️ **احتیاط:** اینجا gimmick زیاد است — فقط ایده بگیر، کپی نکن

### shadcn/ui Charts (ui.shadcn.com/charts)
> **برای charts و graphs** — recharts-based

- Area، Bar، Line، Radial charts
- **مرجع برای:** نمودارهای آماری داشبورد

---

## ۷. Spacing System ما

```
--ds-space-1:  4px
--ds-space-2:  8px
--ds-space-3:  12px
--ds-space-4:  16px
--ds-space-5:  20px
--ds-space-6:  24px
--ds-space-8:  32px
--ds-space-10: 40px

قانون:
- بین icon و text: space-2 (8px)
- بین label و value: space-1 (4px)
- padding کارت: space-5 یا space-6
- gap بین کارت‌ها: space-4
- padding page: space-5 (mobile) → space-8 (desktop)
```

---

## ۸. Shadow System

```css
/* فقط این ۳ shadow استفاده کن */
--shadow-none: none
--shadow-sm: 0 1px 3px oklch(0% 0 0 / 0.06), 0 1px 2px oklch(0% 0 0 / 0.04)
--shadow-md: 0 4px 12px -2px oklch(0% 0 0 / 0.08), 0 2px 4px oklch(0% 0 0 / 0.04)

/* hover: از none → sm، یا از sm → md */
/* هرگز: glow shadow با رنگ، shadow > 20px blur */
```

---

## ۹. Animation Rules

```css
/* فقط این properties را animate کن */
opacity, color, background-color, border-color, box-shadow

/* هرگز */
transform: scale() — در hover card ممنوع
transform: translateY() — در hover card ممنوع
filter: blur() — در hover ممنوع

/* Duration */
hover transitions: 150-180ms
enter animations: 250-350ms
exit animations: 150-200ms

/* Easing */
ease-out-quart برای همه — نه ease-in-out
```

---

## ۱۰. Do/Don't جمع‌بندی

| موضوع | ✅ Do | ❌ Don't |
|---|---|---|
| کارت stat | عدد بزرگ + label ساده | gradient background |
| hover | border-color تغییر | translateY(-2px) |
| icon | 16-20px، دایره | 12px، مربع |
| shadow | 1px یا 4px blur | 20px+ glow |
| رنگ‌ها | ۲ accent max | ۵ رنگ مختلف |
| border | 1px solid ملایم | dashed روی همه (فقط empty state) |
| animation | opacity + color | scale + rotate |
| typography | -0.02 تا -0.04em | letter-spacing مثبت در اعداد |
| padding | 20-24px | 12px کارت |
| radius | 12-16px کارت | 24px همه جا |

---

> **یادداشت:** این مرجع از مشاهده مستقیم سایت‌های واقعی با playwright در 2026-08-05 تهیه شده.
> هر بار که چیز جدیدی یاد گرفتیم، اینجا اضافه کن.
