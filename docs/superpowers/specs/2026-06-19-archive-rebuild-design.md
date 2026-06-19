# Archive Page Rebuild — Design Spec

**تاریخ**: 2026-06-19  
**مسئول**: Principal Architect (Front-end)  
**وضعیت**: Approved (awaiting implementation plan)  
**اولویت**: High

---

## ۱. خلاصه و اهداف

### ۱.۱ چرا این بازسازی؟

صفحه‌ی `archive` قلب محتوایی سایت است. در حال حاضر:

1. **تکرار CSS**: هم `.arc-card` (v2) و هم `.arc-card-v3` در `globals.css` وجود دارند — نقض آشکار DRY.
2. **فایل‌های مرده**: `ModalCategories.tsx`، `ModalTags.tsx`، `ArchiveFilterListBoxClient.tsx` (comment شده) import نمی‌شوند.
3. **عدم استخراج Design System**: کامپوننت‌های قابل‌استفاده‌ی مجدد در route group دفن شده‌اند.
4. **ناهماهنگی بصری**: کامپوننت‌های مختلف، valueهای OKLCH متفاوت hardcode شده دارند.
5. **عدم هماهنگی با قوانین معمار**: `ARCHITECT_RULES.md` می‌گوید «DRY»، «Production Ready»، «از رنگ‌های AI-style پرهیز شود».

### ۱.۲ اهداف (Goals)

- **G1**: صفحه‌ی Archive به یک تجربه‌ی editorial premium تبدیل شود (حس Vercel Blog / Stripe Blog / Linear Changelog).
- **G2**: یک Design System پایه (DS) در `src/components/ds/` ساخته شود که آرشیو از آن استفاده کند و الگویی برای آینده باشد.
- **G3**: قانون DRY به‌طور کامل رعایت شود (v2 حذف، v3 به نام اصلی، DS مرکزی).
- **G4**: Performance، Accessibility (WCAG 2.2 AA)، و RTL بهبود یابند.
- **G5**: **منطق بک‌اند و URL contract هیچ تغییری نکند.**

### ۱.۳ Non-Goals (صراحتاً خارج از scope)

- تغییر در server actions یا `getArchivePosts` و امثال آن.
- تغییر URL schema (`/archive/category/[slug]`, `?filter=`, `?q=`).
- تغییر cache tags.
- بهبود سایر صفحات (`(home)`, `(singles)`) — فقط به‌عنوان الگو برای آینده.
- مهاجرت کامل سایت به DS در همین PR.

---

## ۲. محدوده‌ی کار (Scope)

### ۲.۱ داخل scope

| دسته | موارد |
|---|---|
| **فایل‌های route group (archives)** | ۱۸ فایل موجود + ۱ فایل جدید (`ArchiveGrid.tsx`) |
| **فایل‌های جدید DS** | `src/components/ds/primitives/*` (۶) + `src/components/ds/patterns/*` (۲) + `src/components/ds/styles/tokens.css` + `src/components/ds/index.ts` |
| **تمیزکاری CSS** | `src/app/globals.css` — حذف قوانین v2 (`.arc-card`، `.arc-fcard`، `.arc-card-media` و...) و v3 تکراری، انتقال باقی به نام‌های تمیز |
| **حذف فایل‌های مرده** | `ModalCategories.tsx`، `ModalTags.tsx`، `ArchiveFilterListBoxClient.tsx` |

### ۲.۲ خارج از scope (صراحتاً)

- تغییر ساختار دایرکتوری کل سایت
- تغییر فونت
- ایجاد صفحه‌ی جدید
- تغییر در دیتابیس
- ایجاد API جدید
- بهبود performance با CDN (فقط client-side optimizations)

---

## ۳. طراحی بصری (Visual Design)

### ۳.۱ لحن و حس

**Editorial Premium با چاشنی Power-User.**  
- فضای سفید زیاد (premium)
- اطلاعات متراکم اما منظم (power-user)
- تایپوگرافی بالانس (clamp fluid)
- یک نقطه‌ی کانونی (Featured post) در ابتدای grid
- Micro-animations ظریف (conic ring on hover، scale on image، pill transitions)

**مرجع‌های الهام**: Vercel Blog · Stripe Blog · Linear Changelog · The Economist · FT Alphaville

### ۳.۲ پالت رنگ (True Black OLED for dark)

| کاربرد | Light | Dark |
|---|---|---|
| Canvas (page bg) | `oklch(99% 0.003 240)` | `oklch(15% 0.01 250)` |
| Surface (cards) | `oklch(100% 0 0 / 0.7)` | `oklch(20% 0.012 250 / 0.7)` |
| Text primary | `oklch(20% 0.01 240)` | `oklch(95% 0.005 240)` |
| Text secondary | `oklch(45% 0.01 240)` | `oklch(70% 0.01 240)` |
| Border subtle | `oklch(92% 0.005 240 / 0.6)` | `oklch(28% 0.012 250 / 0.6)` |
| Brand (primary 500) | `oklch(55% 0.10 235)` | `oklch(65% 0.10 235)` |

> ❌ **از رنگ‌های جیغ AI-style (بنفش_سایانی، سبز_نئونی، صورتی_شارپ) اجتناب می‌شود.** همه‌ی saturationها زیر 0.15.

### ۳.۳ تایپوگرافی (Fluid)

| Token | اندازه | کاربرد |
|---|---|---|
| `--ds-text-xs` | `clamp(0.75rem, 0.7rem + 0.2vw, 0.8125rem)` | meta, badge |
| `--ds-text-sm` | `clamp(0.875rem, 0.82rem + 0.25vw, 0.9375rem)` | body, excerpt |
| `--ds-text-base` | `clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)` | default |
| `--ds-text-lg` | `clamp(1.0625rem, 1rem + 0.4vw, 1.25rem)` | card title |
| `--ds-text-xl` | `clamp(1.25rem, 1.1rem + 0.7vw, 1.5rem)` | section h2 |
| `--ds-text-2xl` | `clamp(1.5rem, 1.3rem + 1vw, 1.875rem)` | featured title |
| `--ds-text-4xl` | `clamp(2.25rem, 1.8rem + 2vw, 3rem)` | hero h1 |

**فونت**: `var(--font-vazirmatn)` (فعلی، بدون تغییر).  
**letter-spacing**: `normal` (نه منفی، چون فارسی متصل است).  
**font-feature-settings**: `"ss01", "kern"`, `font-optical-sizing: auto`.  
**text-wrap**: `balance` برای title, `pretty` برای excerpt.

### ۳.۴ Spacing (Fluid)

| Token | clamp | کاربرد |
|---|---|---|
| `--ds-space-1` | `0.25rem → 0.375rem` | gap-1 |
| `--ds-space-2` | `0.5rem → 0.75rem` | gap-2 |
| `--ds-space-3` | `0.75rem → 1rem` | gap-3 |
| `--ds-space-4` | `1rem → 1.5rem` | gap-4, card padding |
| `--ds-space-6` | `1.5rem → 2.25rem` | section gap |
| `--ds-space-8` | `2rem → 3rem` | hero padding |

### ۳.۵ Radius

| Token | مقدار | کاربرد |
|---|---|---|
| `--ds-radius-sm` | `0.5rem` | small chips |
| `--ds-radius-md` | `0.75rem` | inputs |
| `--ds-radius-lg` | `1rem` | cards (compact) |
| `--ds-radius-xl` | `1.25rem` | cards (default) |
| `--ds-radius-2xl` | `1.5rem` | hero, featured |
| `--ds-radius-full` | `9999px` | pills, avatars |

### ۳.۶ Motion

| Token | مقدار | کاربرد |
|---|---|---|
| `--ds-ease-out-quart` | `cubic-bezier(0.22, 1, 0.36, 1)` | همه‌ی transitions |
| `--ds-duration-fast` | `180ms` | hover, focus |
| `--ds-duration-base` | `280ms` | default |
| `--ds-duration-slow` | `420ms` | page transitions |

**`prefers-reduced-motion: reduce`** → همه‌ی animation/transition به `0.01ms` کاهش می‌یابد.

---

## ۴. ساختار کامپوننت (Component Architecture)

### ۴.۱ Design System (`src/components/ds/`)

```
ds/
├── primitives/
│   ├── Card.tsx           [پایه‌ی کارت: container + header + body + footer slots]
│   ├── Pill.tsx           [تگ قابل‌حذف با variant: primary | accent | default]
│   ├── Chip.tsx           [eyebrow chip با icon + label + variant color]
│   ├── SegmentedControl.tsx [role="tablist"، single-select، keyboard nav]
│   ├── SearchField.tsx    [input + leading icon + trailing (kbd/clear/spinner)]
│   └── IconButton.tsx     [square button با focus ring]
├── patterns/
│   ├── EmptyState.tsx     [icon + title + description + CTA slot]
│   └── Skeleton.tsx       [شیمر با width/height/radius prop]
├── styles/
│   └── tokens.css         [همه‌ی CSS variables (colors, spacing, type, motion)]
└── index.ts               [re-export همه]
```

**اصل**: DS **هیچ business logic ندارد**، فقط presentation. تمام data fetching در route group.

### ۴.۲ Route Group (`src/app/(site)/(archives)/`)

```
(archives)/
├── archive/[[...slug]]/page.tsx       [server، بدون تغییر]
├── layout.tsx                          [بدون تغییر]
├── loading.tsx                         [Skeleton جدید]
└── _components/                        [پوشه‌ی جدید — page-specific]
    ├── ArchiveHero.tsx                 [server]
    ├── ArchiveCard.tsx                 [server، rename از V3]
    ├── ArchiveFeatured.tsx             [server، rename از V3]
    ├── ArchiveGrid.tsx                 [server، جدید — auto-fit grid]
    ├── FilterRail.tsx                  [client]
    ├── MobileFilterSheet.tsx           [client]
    ├── CommandPanel.tsx                [client]
    ├── CommandTrigger.tsx              [client]
    ├── ArchiveSearchInput.tsx          [client، wraps ds/SearchField]
    ├── ArchiveViewToggle.tsx           [client، wraps ds/SegmentedControl]
    └── ActiveFilters.tsx               [client، wraps ds/Pill]
```

**فایل‌های حذف‌شونده** (dead code):
- `ModalCategories.tsx`
- `ModalTags.tsx`
- `ArchiveFilterListBoxClient.tsx`

---

## ۵. Design Tokens — جزئیات کامل

### ۵.1 Spacing (Fluid)

```css
:root {
  --ds-space-1: clamp(0.25rem, 0.2rem + 0.2vw, 0.375rem);
  --ds-space-2: clamp(0.5rem, 0.4rem + 0.4vw, 0.75rem);
  --ds-space-3: clamp(0.75rem, 0.6rem + 0.6vw, 1rem);
  --ds-space-4: clamp(1rem, 0.8rem + 0.8vw, 1.5rem);
  --ds-space-5: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  --ds-space-6: clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem);
  --ds-space-8: clamp(2rem, 1.5rem + 2vw, 3rem);
  --ds-space-10: clamp(2.5rem, 2rem + 2.5vw, 3.75rem);
}
```

### ۵.۲ Typography (Fluid)

```css
:root {
  --ds-text-xs: clamp(0.75rem, 0.7rem + 0.2vw, 0.8125rem);
  --ds-text-sm: clamp(0.875rem, 0.82rem + 0.25vw, 0.9375rem);
  --ds-text-base: clamp(0.9375rem, 0.9rem + 0.2vw, 1rem);
  --ds-text-lg: clamp(1.0625rem, 1rem + 0.4vw, 1.25rem);
  --ds-text-xl: clamp(1.25rem, 1.1rem + 0.7vw, 1.5rem);
  --ds-text-2xl: clamp(1.5rem, 1.3rem + 1vw, 1.875rem);
  --ds-text-3xl: clamp(1.875rem, 1.5rem + 1.5vw, 2.5rem);
  --ds-text-4xl: clamp(2.25rem, 1.8rem + 2vw, 3rem);

  --ds-leading-tight: 1.12;
  --ds-leading-snug: 1.45;
  --ds-leading-normal: 1.65;
  --ds-leading-relaxed: 1.75;

  --ds-weight-medium: 500;
  --ds-weight-semibold: 600;
  --ds-weight-bold: 700;
  --ds-weight-extrabold: 800;
}
```

### ۵.۳ Radius

```css
:root {
  --ds-radius-sm: 0.5rem;
  --ds-radius-md: 0.75rem;
  --ds-radius-lg: 1rem;
  --ds-radius-xl: 1.25rem;
  --ds-radius-2xl: 1.5rem;
  --ds-radius-full: 9999px;
}
```

### ۵.۴ Colors (OKLCH)

```css
:root {
  /* canvas */
  --ds-canvas: oklch(99% 0.003 240);
  --ds-canvas-subtle: oklch(97% 0.005 240);
  --ds-surface: oklch(100% 0 0 / 0.7);
  --ds-surface-elevated: oklch(100% 0 0 / 0.85);
  --ds-surface-recessed: oklch(96% 0.005 240 / 0.6);

  /* text */
  --ds-text-primary: oklch(20% 0.01 240);
  --ds-text-secondary: oklch(45% 0.01 240);
  --ds-text-muted: oklch(55% 0.01 240);
  --ds-text-inverse: oklch(98% 0.005 240);

  /* borders */
  --ds-border-subtle: oklch(92% 0.005 240 / 0.6);
  --ds-border-default: oklch(90% 0.005 240 / 0.8);
  --ds-border-strong: oklch(82% 0.01 240 / 0.9);

  /* brand */
  --ds-brand-50: oklch(95% 0.04 240);
  --ds-brand-100: oklch(92% 0.05 240);
  --ds-brand-500: oklch(55% 0.10 235);
  --ds-brand-600: oklch(48% 0.11 235);
  --ds-brand-700: oklch(40% 0.12 235);

  /* accents (برای featured، tags، categories) */
  --ds-accent-amber: oklch(72% 0.13 70);
  --ds-accent-emerald: oklch(60% 0.10 165);
  --ds-accent-rose: oklch(60% 0.13 20);
  --ds-accent-violet: oklch(58% 0.13 290);
  --ds-accent-slate: oklch(60% 0.02 250);

  /* effects */
  --ds-shadow-sm: 0 1px 2px oklch(20% 0.01 240 / 0.04);
  --ds-shadow-md: 0 4px 12px -4px oklch(20% 0.01 240 / 0.10);
  --ds-shadow-lg: 0 18px 50px -20px oklch(45% 0.10 250 / 0.35);
  --ds-glow-brand: 0 0 0 1px oklch(55% 0.10 235 / 0.4),
                   0 8px 24px -8px oklch(55% 0.10 235 / 0.35);
}
.dark {
  --ds-canvas: oklch(15% 0.01 250);
  --ds-canvas-subtle: oklch(18% 0.012 250);
  --ds-surface: oklch(20% 0.012 250 / 0.7);
  --ds-surface-elevated: oklch(22% 0.012 250 / 0.85);
  --ds-surface-recessed: oklch(17% 0.012 250 / 0.6);
  --ds-text-primary: oklch(95% 0.005 240);
  --ds-text-secondary: oklch(70% 0.01 240);
  --ds-text-muted: oklch(55% 0.01 240);
  --ds-text-inverse: oklch(15% 0.01 250);
  --ds-border-subtle: oklch(28% 0.012 250 / 0.6);
  --ds-border-default: oklch(30% 0.012 250 / 0.8);
  --ds-border-strong: oklch(38% 0.02 250 / 0.9);
  --ds-shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.4);
  --ds-shadow-md: 0 4px 12px -4px oklch(0% 0 0 / 0.5);
  --ds-shadow-lg: 0 22px 60px -22px oklch(0% 0 0 / 0.7);
  --ds-glow-brand: 0 0 0 1px oklch(65% 0.10 235 / 0.5),
                   0 8px 24px -8px oklch(65% 0.10 235 / 0.5);
}
```

### ۵.۵ Motion

```css
:root {
  --ds-ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
  --ds-ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ds-duration-fast: 180ms;
  --ds-duration-base: 280ms;
  --ds-duration-slow: 420ms;
  --ds-duration-page: 600ms;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## ۶. ساختار هر کامپوننت (تفصیلی)

### ۶.۱ Archive Card

**Props** (interface دست‌نخورده):
```typescript
interface ArchiveCardProps {
  post: PostWithRelations;
  ratio?: '4/3' | '3/4' | '16/9' | 'square';
  priority?: boolean;
  variant?: 'card' | 'list';
}
```

**ساختار DOM** (بدون تغییر در داده‌ها):
```html
<article class="ds-card" data-ds-reveal>
  <Link class="ds-card__media">
    <SafeImage />
    <span class="ds-badge">دسته</span>  <!-- اگر category داشته باشد -->
    <span class="ds-badge ds-badge--type">ویدیو</span>  <!-- اگر postType !== STANDARD -->
  </Link>
  <div class="ds-card__body">
    <div class="ds-card__tags">#tag1 · #tag2</div>
    <Link><h3 class="ds-card__title">{title}</h3></Link>
    <p class="ds-card__excerpt">{excerpt}</p>
    <div class="ds-card__foot">
      <div>نویسنده · تاریخ</div>
      <div>👁 بازدید · 💬 نظر</div>
    </div>
    <Link class="ds-cta">ادامه مطلب →</Link>
  </div>
</article>
```

**CSS behavior**:
- `container-type: inline-size; container-name: dsCard;`
- Default: 1 col, 4/3 ratio
- `@container dsCard (min-width: 360px)` → padding بیشتر
- `@container dsCard (min-width: 420px)` → title بزرگ‌تر
- `::before` conic ring با `mask-composite: exclude` (همان فعلی)
- `hover`: `translate3d(0, -4px, 0)` + conic ring opacity 1 + image scale 1.04

### ۶.۲ Archive Featured

همان منطق فعلی، فقط rename classes.  
ساختار DOM یکسان. CSS در `.ds-card--featured` با grid 1.2fr/1fr در ultra-wide.

### ۶.۳ Archive Grid (جدید)

```typescript
// ArchiveGrid.tsx (server component)
interface ArchiveGridProps {
  posts: PostWithRelations[];
  featuredPost?: PostWithRelations | null;
  betweenPostsAd?: Advertisement | null;
}

export default function ArchiveGrid({ posts, featuredPost, betweenPostsAd }: ArchiveGridProps) {
  if (posts.length === 0) return null;
  const rest = featuredPost ? posts.filter(p => p.id !== featuredPost.id) : posts;
  return (
    <div className="archive-grid">
      {featuredPost && (
        <div className="archive-grid__featured">
          <ArchiveFeatured post={featuredPost} />
        </div>
      )}
      {rest.map((post, i) => (
        <Fragment key={post.id}>
          {betweenPostsAd && i === 4 && (
            <div className="archive-grid__ad">
              <BannerAds ad={betweenPostsAd} variant="rich" />
            </div>
          )}
          <ArchiveCard post={post} ratio="4/3" />
        </Fragment>
      ))}
    </div>
  );
}
```

**CSS**:
```css
.archive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ds-space-4);
}
@media (min-width: 640px) {
  .archive-grid {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--ds-space-5);
  }
}
@media (min-width: 1024px) {
  .archive-grid {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--ds-space-6);
  }
}
.archive-grid__featured {
  grid-column: 1 / -1;
  margin-block-end: var(--ds-space-2);
}
.archive-grid__ad {
  grid-column: 1 / -1;
}
```

**List mode** (با `data-archive-view="list"`):
```css
[data-archive-view="list"] .archive-grid {
  grid-template-columns: 1fr;
  gap: var(--ds-space-3);
}
```

### ۶.۴ Archive Hero

**ساختار** (بدون تغییر در منطق):
- ۲ aurora blob پس‌زمینه + grid texture
- Thumbnail با conic ring (همان فعلی)
- Eyebrow chip (با `ds/Chip`)
- Title fluid
- Lead
- Quick-pick chips (با `ds/Chip`)

**بهبود بصری**:
- همه‌ی valueهای hardcoded → tokens
- `bg-aurora` با opacity کمتر (ملایم‌تر)
- `text-wrap: balance` روی title

### ۶.۵ Filter Rail (بهبود بصری)

**ساختار** (بدون تغییر در منطق):
- Sticky بالا
- glassmorphism با tokens
- ۲ ردیف: row اصلی (search + triggers + sort + view) + row quick-pick tags

**بهبودها**:
- `backdrop-filter: blur(14px) saturate(1.4)`
- padding: `var(--ds-space-3) var(--ds-space-4)`
- border-radius: `var(--ds-radius-xl)`
- استفاده از DS primitives

### ۶.۶ Command Panel (بهبود بصری)

**ساختار** (بدون تغییر در منطق):
- Portal به `document.body`
- Backdrop blur
- Dialog با search + list + footer با keyboard hints

**بهبودها**:
- max-width: `min(36rem, 100% - 2rem)`
- shadow-lg با tokens
- hover/active states با tokens
- list item height: `2.75rem` (compact)

### ۶.۷ MobileFilterSheet (بهبود بصری)

ساختار فعلی حفظ می‌شود. فقط classes hardcoded → tokens.

### ۶.۸ ActiveFilters (Pill‌ها)

استفاده از `ds/Pill` به‌جای کلاس‌های hardcoded.

### ۶.۹ EmptyState (جدید)

```typescript
// ds/patterns/EmptyState.tsx
interface EmptyStateProps {
  icon?: React.ReactNode;        // default: <Inbox />
  title: string;
  description?: string;
  action?: { label: string; href: string };
}
```

استفاده در archive page زمانی که `posts.length === 0`.

### ۶.۱۰ Skeleton (بهبود)

`ArchivePageSkeleton` به‌روزرسانی می‌شود:
- استفاده از grid auto-fit
- Skeleton card با `ds/Skeleton` (شیمر)
- Hero skeleton (rectangle بزرگ)

---

## ۷. تمیزکاری CSS (CSS Cleanup)

### ۷.۱ قوانینی که **حذف** می‌شوند (v2 و v3 تکراری)

```
.arc-card, .arc-card-media, .arc-card-media-overlay, .arc-badge, .arc-card-body,
.arc-card-title, .arc-card-excerpt, .arc-card-foot, .arc-cta, .arc-fcard,
.arc-fcard-media, .arc-fcard-body, .arc-fcard-title, .arc-fcard-excerpt,
.arc-fcard-foot, .arc-fcard-pick, .arc-stat, .arc-thumb-ring,
.arc-hero (v1, جایگزین می‌شود با .archive-hero)
```

### ۷.۲ قوانینی که **نگه داشته می‌شوند** (v3 → تمیز)

`.arc-card-v3` → `.ds-card`  
`.arc-fcard-v3` → `.ds-card--featured`  
`.arc-card-v3__title` → `.ds-card__title`  
`.arc-card-v3__body` → `.ds-card__body`  
`.arc-card-v3__excerpt` → `.ds-card__excerpt`  
`.arc-card-v3__foot` → `.ds-card__foot`  
`.arc-card-v3__media` → `.ds-card__media`  
`.arc-card-v3__media-overlay` → `.ds-card__media-overlay`  
`.arc-cta` → `.ds-cta`  
`.arc-grid-magazine` → `.archive-grid`  
`.arc-list-v3`, `.arc-list-row-v3` → `.ds-list-row`  
`.arc-rail-v3` → `.ds-rail`  
`.arc-segmented-v3` → `.ds-segmented`  
`.arc-pill`, `.arc-pill--primary`, `.arc-pill--accent` → `.ds-pill`, `.ds-pill--primary`, `.ds-pill--accent`  
`.arc-active-filters-v3` → `.ds-active-filters`  
`.arc-cmd`, `.arc-cmd__head`, `.arc-cmd__item`, ... → `.ds-cmd*`  
`.arc-fab` → `.ds-fab`  
`.arc-sheet`, `.arc-sheet__handle` → `.ds-sheet`, `.ds-sheet__handle`  
`.arc-result-strip` → `.ds-result-strip`  
`.arc-eyebrow-v3` → `.ds-eyebrow`  
`.arc-quickpick-v3` → `.ds-quickpick`  
`.arc-suggestion` → `.ds-suggestion`  
`.arc-shimmer` → `.ds-skeleton`  
`.arc-compact-stat` → `.ds-compact-stat`  
`.arc-reveal` → `.ds-reveal`  
`.arc-bento-grid` → `.archive-bento`  
`.arc-metric-card` → `.ds-metric`  
`.arc-mesh-bg`, `.arc-mesh-dots` → `.ds-mesh-bg`, `.ds-mesh-dots`  
`.arc-thumb-ring` → `.ds-thumb-ring`  
`.arc-hero-v2__orb` → `.ds-orb`  
`.arc-view-toggle` → `.ds-view-toggle`  
`.arc-cmd-trigger` → `.ds-trigger`  
`.arc-cmd-search-field` → `.ds-search-field`  
`.arc-search-kbd` → `.ds-kbd`  
`.arc-focus` → `.ds-focus`  
`.arc-progress` → `.ds-progress`  
`.arc-sr` → `.ds-sr`

**نتیجه**: کاهش از ~522 قانون به ~80 قانون (page-specific) + ~40 قانون (DS).

---

## ۸. سازگاری با بک‌اند (Backend Compatibility)

### ۸.۱ این موارد هیچ تغییری نمی‌کنند

| لایه | آیتم |
|---|---|
| **Server Actions** | `getArchivePosts`، `getCategories`، `getTags`، `getTopAuthors`، `getActiveAdvertisements` |
| **URL Schema** | `/archive/category/[slug]`, `/archive/tag/[slug]`, `/archive/category/[cat]/[sub]`, `?page=`, `?filter=`, `?q=`, `?view=` |
| **Cache Tags** | `posts`, `archive`, `categories`, `tags`, `dashboard-{section}` |
| **TypeScript Types** | `PostWithRelations`, `TaxonomyType`, `Advertisement` (در `src/types/types.ts`) |
| **Prisma Models** | هیچ تغییری در schema |
| **Metadata** | `generateMetadata` در `page.tsx` دست‌نخورده |
| **API contracts** | هیچ تغییری در response shape |

### ۸.۲ این موارد **می‌توانند** تغییر کنند (فقط interface و presentation)

- کامپوننت‌های React (rename, refactor)
- استایل‌ها (CSS classes)
- Default valueها (مثل default `ratio` یا `variant`)
- ساختار HTML داخلی (تا زمانی که semantic و a11y حفظ شود)
- نام فایل‌ها (V3 suffix حذف می‌شود)

### ۸.۳ تست سازگاری (Verification)

پس از پیاده‌سازی:
1. ✅ `npm run build` موفق
2. ✅ `npm run lint` بدون error
3. ✅ `npx tsc --noEmit` بدون error
4. ✅ تمام URL‌های فعلی سایت (با و بدون query params) در دسترس باشند
5. ✅ `getArchivePosts` با همه‌ی پارامترهای فعلی کار کند
6. ✅ Cache invalidation (revalidateTag) در server actions فعلی دست‌نخورده

---

## ۹. Accessibility (WCAG 2.2 AA)

### ۹.۱ الزامات

| معیار | وضعیت |
|---|---|
| Semantic HTML | `<article>`, `<nav>`, `<section>`, `<h1-h3>`, `<ol>`, `<button>` |
| Keyboard navigation | Tab order منطقی، focus visible، Esc/Enter/Arrow در Command Panel |
| Focus management | focus trap در Command Panel و Sheet |
| ARIA | `role="tablist"`, `aria-current`, `aria-pressed`, `aria-selected`, `aria-label` |
| Screen reader | `sr-only` برای متن‌های مخفی، `aria-hidden` برای المان‌های دکوراتیو |
| Color contrast | متن primary ≥ 7:1، secondary ≥ 4.5:1 (OKLCH مقادیر تست‌شده) |
| Reduced motion | `prefers-reduced-motion: reduce` → animation/transitions صفر |
| Touch target | حداقل 44×44px در mobile |
| Live region | `aria-live="polite"` برای تعداد نتایج |

### ۹.۲ تست

- Lighthouse Accessibility ≥ 95
- axe DevTools: 0 violations
- Keyboard-only navigation flow: search → filter → view toggle → card → CTA

---

## ۱۰. Performance Budgets

| معیار | هدف |
|---|---|
| **CSS size** | از 522 → 120 قاعده (~75% کاهش) |
| **JS bundle (archive route)** | < 80KB gzipped (فقط client components) |
| **LCP** | < 2.5s (تصویر featured با `priority`) |
| **CLS** | < 0.05 (skeleton + aspect-ratio) |
| **INP** | < 200ms (transitions کوتاه) |
| **TBT** | < 200ms |
| **Lighthouse Performance** | ≥ 90 |

**اقدامات**:
- `next/image` با `priority` فقط برای featured + LCP image
- `loading="lazy"` در بقیه
- `dynamic()` import برای `CommandPanel` و `MobileFilterSheet` (اگر لازم شد)
- CSS purge با Tailwind v4 (خودکار)
- حذف `motion.div` از server components (فقط client)

---

## ۱۱. معیارهای پذیرش (Acceptance Criteria)

### ۱۱.۱ عملکردی

- [ ] صفحه `/archive` بدون تغییر URL یا API contract لود می‌شود
- [ ] صفحه `/archive/category/[slug]` و `/archive/tag/[slug]` کار می‌کنند
- [ ] جستجو با debounce 350ms (همان فعلی)
- [ ] فیلتر، pagination، view toggle، sort کار می‌کنند
- [ ] Command Panel با `⌘K` و `/` باز می‌شود
- [ ] موبایل: Sheet با slide-up انیمیشن

### ۱۱.۲ بصری

- [ ] همه‌ی رنگ‌ها از tokens می‌آیند (no hardcoded)
- [ ] همه‌ی spacing از tokens (fluid)
- [ ] همه‌ی typography از tokens (fluid)
- [ ] Dark mode: True Black OLED (`oklch(15% 0.01 250)`)
- [ ] RTL: همه‌ی margins/paddings با logical properties
- [ ] Featured post: 2-ستونه (در ultra-wide)، 1-ستونه (موبایل)
- [ ] Grid: auto-fit 1-4 ستون

### ۱۱.۳ کد

- [ ] DRY: v2 حذف، v3 به نام اصلی، DS مرکزی
- [ ] فایل‌های مرده حذف‌شده
- [ ] TypeScript strict، بدون `any` جدید
- [ ] ESLint بدون error
- [ ] `npm run build` موفق
- [ ] `npx tsc --noEmit` موفق

### ۱۱.۴ Accessibility

- [ ] WCAG 2.2 AA: 0 violations
- [ ] Keyboard navigation کامل
- [ ] Focus visible روی همه‌ی interactive elements
- [ ] Screen reader: landmarks درست

---

## ۱۲. ریسک‌ها و راه‌حل

| ریسک | احتمال | تأثیر | راه‌حل |
|---|---|---|---|
| شکستن layout در صفحات دیگر به‌خاطر تغییر globals.css | بالا | بالا | تغییرات CSS فقط در `@layer utilities` با prefix `ds-*` و `archive-*`؛ کلاس‌های قدیمی alias می‌شوند (backward-compat) |
| Componentهای client که بیش از حد JS می‌فرستند | متوسط | متوسط | فقط `CommandPanel` و `MobileFilterSheet` و `ArchiveSearchInput` و `ArchiveViewToggle` و `ActiveFilters` و `FilterRail` client باشند. بقیه server. |
| Backward-incompatible تغییر در URL | پایین | بالا | **هیچ تغییری در URL اعمال نمی‌شود.** |
| Skeleton در dark mode زشت باشد | پایین | پایین | `ds/Skeleton` با `color-mix` بین surface و border، تست در هردو تم |
| Hydration mismatch در ViewToggle | پایین | متوسط | همان الگوی فعلی: `data-archive-view` روی `<html>` بعد از mount |

---

## ۱۳. زمان‌بندی تخمینی (Phases)

این spec به ۴ فاز تقسیم می‌شود (در writing-plans دقیق می‌شود):

| فاز | نام | تخمین |
|---|---|---|
| **Phase 1** | DS Foundation: tokens.css + primitives (Card, Pill, Chip) | 2-3 ساعت |
| **Phase 2** | DS Patterns: SearchField, SegmentedControl, EmptyState, Skeleton | 2-3 ساعت |
| **Phase 3** | بازسازی ArchiveCard, ArchiveFeatured, ArchiveGrid, ArchiveHero | 3-4 ساعت |
| **Phase 4** | بازسازی FilterRail, MobileFilterSheet, CommandPanel, ActiveFilters, page.tsx + cleanup | 3-4 ساعت |

**جمع**: ~10-14 ساعت کار production-ready.

---

## ۱۴. تغییرات Breaking و Migration

### ۱۴.۱ Breaking Changes (برای توسعه‌دهندگان)

- **CSS class names**: همه‌ی `.arc-*` به `.ds-*` یا `.archive-*` تغییر می‌کنند.  
  → **Migration**: یک alias map در انتهای `globals.css` نگه داشته می‌شود (deprecated comments) برای ۱ release، بعد حذف.
- **File names**: `ArchiveCardV3.tsx` → `ArchiveCard.tsx` (در `_components/`).  
  → **Migration**: import‌ها در `AnimatedPostGridV3` به‌روزرسانی می‌شوند (هم‌زمان).
- **Component locations**: فایل‌ها از root `(archives)/` به `(archives)/_components/` منتقل می‌شوند.  
  → **Migration**: import paths در `page.tsx` به‌روزرسانی می‌شوند.

### ۱۴.۲ Non-Breaking (برای کاربران نهایی)

- URL‌ها، داده‌ها، رفتار filter، animation‌ها (به‌جز بهبود بصری)، رفتار search — **هیچ تغییری نمی‌کنند**.

---

## ۱۵. منابع و مراجع

- `src/app/globals.css` — فایل فعلی برای بررسی v2/v3
- `src/types/types.ts` — تایپ‌های مشترک
- `src/lib/motion-shim.ts` — utility انیمیشن
- `src/components/SafeImage.tsx` — image wrapper
- `ARCHITECT_RULES.md` — قوانین معمار
- `AGENTS.md` — repo conventions

---

**پایان spec.**  
**قدم بعدی**: تأیید نهایی کاربر → `writing-plans skill` → implementation.
