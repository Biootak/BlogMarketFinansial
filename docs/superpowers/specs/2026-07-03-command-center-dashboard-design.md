# Command Center Dashboard — Design Spec

**تاریخ:** ۲۰۲۶-۰۷-۰۳
**نویسنده:** Biotak + AI Architect
**وضعیت:** Draft — منتظر بررسی کاربر

---

## ۱. خلاصه اجرایی

### مشکل
داشبورد فعلی (NOVA) از الگوی سنتی تایل‌های جداگانه استفاده می‌کند که:
- اطلاعات پراکنده و شلوغ است
- MarketPulseTile مقادیر hardcoded دارد
- نسل‌های قدیمی (Aurora, V2, Atlas, TIDE) dead code هستند
- تجربه کاربری شبیه داشبوردهای ۲۰۲۰ است نه ۲۰۲۶

### راه‌حل
**Command Center** — یک workspace هوشمند الهام‌گرفته از Linear + Attio + Raycast:
- Command Bar هوشمند (مرکز فرماندهی)
- Timeline زنده (خط زمانی فعالیت‌ها)
- Context Panel تطبیقی (پنل زمینه‌ای)
- Quick Actions نقش‌محور (اقدامات سریع)

### مزایا
- **مدرن:** الگوی ۲۰۲۶ (Linear, Attio, Raycast)
- **هوشمند:** تطبیقی بر اساس نقش کاربر
- **کارآمد:** دسترسی سریع با Command Bar
- **تمیز:** حذف dead code و اطلاعات غیرضروری

---

## ۲. معماری

### ساختار فایل‌ها
```
src/components/Dashboard/DashboardPage/command/
├── CommandCenter.tsx       // Main orchestrator (Client Component)
├── CommandBar.tsx          // Smart command bar (⌘K)
├── Timeline.tsx            // Live activity timeline
├── ContextPanel.tsx        // Adaptive context panel
├── QuickActions.tsx        // Role-aware quick actions
├── tiles/
│   ├── StatsCard.tsx       // Today's stats with sparkline
│   ├── MarketPulse.tsx     // Real market rates (API-driven)
│   ├── PostsList.tsx       // Recent posts + drafts
│   ├── TasksList.tsx       // Tasks and reminders
│   └── AnalyticsChart.tsx  // Interactive analytics chart
├── hooks/
│   ├── useCommand.ts       // Command bar logic
│   ├── useTimeline.ts      // Timeline data + polling
│   └── useTasks.ts         // Tasks CRUD logic
└── index.ts                // Barrel export
```

### Data Flow
```
src/app/dashboard/page.tsx (Server Component)
    │
    ├── auth() → checkRole(['OWNER', 'ADMIN', 'AUTHOR'])
    │
    ├── Promise.all([
    │   ├── getStats()           → آمار کلی
    │   ├── getPopularPosts()    → پست‌های محبوب
    │   ├── getRecentDrafts()    → پیش‌نویس‌ها
    │   ├── getViewStats()       → آمار بازدید
    │   ├── getRecentActivity()  → فعالیت‌های اخیر
    │   └── getExchangeRates()   → نرخ‌های ارز (جدید)
    │ ])
    │
    └── <CommandCenter data={...} role={...} />
```

### Component Hierarchy
```
CommandCenter (Client)
├── CommandBar
│   ├── Search input
│   ├── Command list (filtered)
│   └── Recent commands
│
├── Main Content (2-column layout)
│   ├── Timeline (left — 60%)
│   │   ├── Date headers
│   │   ├── Activity items
│   │   └── Filter tabs
│   │
│   └── ContextPanel (right — 40%)
│       ├── Tab navigation
│       ├── Content area
│       └── Action buttons
│
└── QuickActions (bottom)
    └── Action buttons (role-based)
```

---

## ۳. زبان بصری

### Color Palette (OKLCH)
```css
/* Light Mode */
--cc-primary:    oklch(65% 0.15 265);  /* آبی-بنفش */
--cc-accent:     oklch(70% 0.18 155);  /* سبز */
--cc-warning:    oklch(75% 0.15 70);   /* کهربایی */
--cc-error:      oklch(65% 0.18 25);   /* قرمز */
--cc-surface:    oklch(98% 0.005 265); /* سفید مایل به بنفش */
--cc-canvas:     oklch(97% 0.003 265); /* پس‌زمینه */
--cc-text:       oklch(20% 0.01 265);  /* متن اصلی */
--cc-text-muted: oklch(50% 0.01 265);  /* متن کم‌رنگ */
--cc-border:     oklch(90% 0.005 265); /* حاشیه */

/* Dark Mode */
--cc-surface:    oklch(18% 0.01 265);
--cc-canvas:     oklch(13% 0.01 265);
--cc-text:       oklch(95% 0.005 265);
--cc-text-muted: oklch(65% 0.005 265);
--cc-border:     oklch(25% 0.01 265);
```

### Typography
```css
--cc-font-heading: 'Vazirmatn', system-ui, sans-serif;
--cc-font-body:    'Vazirmatn', system-ui, sans-serif;
--cc-font-mono:    'JetBrains Mono', monospace;

/* Fluid sizes */
--cc-text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--cc-text-sm:   clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
--cc-text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
--cc-text-lg:   clamp(1.125rem, 1rem + 0.6vw, 1.25rem);
--cc-text-xl:   clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem);
--cc-text-2xl:  clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
--cc-text-3xl:  clamp(2rem, 1.5rem + 2.5vw, 3rem);

/* Weights */
--cc-weight-normal:   400;
--cc-weight-medium:   500;
--cc-weight-semibold: 600;
--cc-weight-bold:     700;
```

### Spacing
```css
--cc-space-1:  clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem);
--cc-space-2:  clamp(0.5rem, 0.4rem + 0.5vw, 0.75rem);
--cc-space-3:  clamp(0.75rem, 0.6rem + 0.75vw, 1rem);
--cc-space-4:  clamp(1rem, 0.8rem + 1vw, 1.5rem);
--cc-space-6:  clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
--cc-space-8:  clamp(2rem, 1.6rem + 2vw, 3rem);
--cc-space-12: clamp(3rem, 2.4rem + 3vw, 4rem);
```

### Border Radius
```css
--cc-radius-sm:   8px;
--cc-radius-md:   12px;
--cc-radius-lg:   16px;
--cc-radius-xl:   24px;
--cc-radius-full: 9999px;
```

### Shadows
```css
--cc-shadow-sm:  0 1px 2px oklch(0% 0 0 / 0.05);
--cc-shadow-md:  0 4px 12px oklch(0% 0 0 / 0.08);
--cc-shadow-lg:  0 8px 24px oklch(0% 0 0 / 0.12);
--cc-shadow-xl:  0 16px 48px oklch(0% 0 0 / 0.16);
```

### Surfaces
```
Level 0: Canvas     — پس‌زمینه اصلی (--cc-canvas)
Level 1: Surface    — کارت‌ها (--cc-surface + --cc-border)
Level 2: Elevated   — hover state (--cc-surface + --cc-shadow-md)
Level 3: Floating   — Command Bar, tooltip (--cc-surface + --cc-shadow-xl)
```

---

## ۴. Component Specifications

### ۴.۱ CommandBar

**موقعیت:** بالای صفحه، ثابت (sticky)
**اندازه:** عرض کامل، ارتفاع 56px
**Shortcut:** `⌘K` / `Ctrl+K`

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 هر کاری می‌خواهی انجام بده...          ⌘K              │
└─────────────────────────────────────────────────────────────┘
```

**States:**
- Default: placeholder text + subtle border
- Focus: glow ring (primary color) + shadow
- Open: dropdown با لیست دستورات

**Commands (role-aware):**
| دستور | AUTHOR | ADMIN | OWNER |
|-------|--------|-------|-------|
| پست جدید | ✅ | ✅ | ✅ |
| مشاهده پست‌ها | ✅ | ✅ | ✅ |
| دسته‌بندی‌ها | ✅ | ✅ | ✅ |
| تسک جدید | ✅ | ✅ | ✅ |
| نرخ ارز | ❌ | ✅ | ✅ |
| کاربران | ❌ | ✅ | ✅ |
| گزارش‌ها | ❌ | ✅ | ✅ |
| تنظیمات | ❌ | ❌ | ✅ |
| سلامت سیستم | ❌ | ❌ | ✅ |

**Behavior:**
- جستجوی فازی (fuzzy search)
- Autocomplete هنگام تایپ
- نمایش آخرین دستورات کاربر
- Navigate مستقیم به صفحه مربوطه

### ۴.۲ Timeline

**موقعیت:** ستون چپ (60% عرض)
**ارتفاع:** قابل اسکرول
**Auto-refresh:** هر ۳۰ ثانیه

```
┌─────────────────────────────────────────────────────────────┐
│  📅 امروز — ۱۲ تیر ۱۴۰۵                                  │
│                                                             │
│  ۱۲:۳۰  📄 پست "آموزش React 19" منتشر شد                  │
│         └─ ۴۵ بازدید • ۱۲ لایک • ۳ نظر                    │
│                                                             │
│  ۱۱:۴۵  💬 نظر جدید از "علی" روی پست "Next.js 16"         │
│         └─ "ممنون، عالی بود!"                              │
│                                                             │
│  ۱۱:۲۰  ☑️ تسک "بررسی مقاله TypeScript" تکمیل شد          │
│                                                             │
│  ۱۰:۵۵  💱 نرخ دلار بروزرسانی شد: ۵۸,۲۵۰ تومان ↑ ۰.۵%   │
│                                                             │
│  ۱۰:۳۰  📄 پیش‌نویس "مقایسه Bun و Deno" ذخیره شد          │
│                                                             │
│  [📅 امروز] [📆 این هفته] [📊 این ماه]                     │
└─────────────────────────────────────────────────────────────┘
```

**Activity Types:**
| نوع | آیکون | رنگ | منبع |
|-----|-------|-----|------|
| post_published | 📄 | accent | ActivityLog |
| post_draft | 📄 | muted | ActivityLog |
| comment_new | 💬 | primary | ActivityLog |
| task_completed | ☑️ | accent | Tasks |
| rate_updated | 💱 | warning | ExchangeRates |
| user_action | 👥 | primary | ActivityLog |

**Filters:**
- همه | پست‌ها | نظرات | تسک‌ها | نرخ‌ها

**Click Behavior:**
- کلیک روی هر آیتم → Context Panel مربوطه باز می‌شود

### ۴.۳ Context Panel

**موقعیت:** ستون راست (40% عرض)
**ارتفاع:** هم‌ارتفاع Timeline

```
┌─────────────────────────────────────────────────────────────┐
│  [پست‌ها] [تسک‌ها] [Market] [آمار]                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📄 پست‌های اخیر                                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ۱. آموزش React 19          [ویرایش] [حذف]          │    │
│  │    منتشر شده • ۱۲ تیر • ۴۵ بازدید                  │    │
│  │                                                     │    │
│  │ ۲. Next.js 16: ویژگی‌های جدید [ویرایش] [حذف]       │    │
│  │    پیش‌نویس • ۱۱ تیر • ۰ بازدید                     │    │
│  │                                                     │    │
│  │ ۳. مقایسه Bun و Deno        [ویرایش] [حذف]         │    │
│  │    زمان‌بندی شده • ۱۵ تیر                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [📝 پست جدید]  [مشاهده همه]                                │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **پست‌ها:** لیست پست‌های اخیر + پیش‌نویس‌ها + زمان‌بندی شده‌ها
2. **تسک‌ها:** لیست تسک‌ها + افزودن تسک جدید
3. **Market:** نرخ‌های ارز + نمودار ۷ روزه
4. **آمار:** نمودار بازدید + KPI‌ها

**Tab Content:**

#### پست‌ها
- لیست ۵ پست اخیر
- هر پست: عنوان + وضعیت + تاریخ + بازدید
- Actions: ویرایش، حذف، مشاهده
- CTA: پست جدید

#### تسک‌ها
- لیست تسک‌های فعال
- هر تسک: عنوان + deadline + وضعیت
- Actions: تکمیل، ویرایش، حذف
- CTA: تسک جدید

#### Market
- نرخ‌های لحظه‌ای: دلار، یورو، طلا، سکه، بیت‌کوین
- نمودار ۷ روزه هر نرخ
- تغییرات روزانه (delta)
- منبع: API واقعی (نه hardcoded)

#### آمار
- نمودار بازدید ۷/۳۰/۹۰ روزه
- KPI‌ها: بازدید، لایک، نظر، اشتراک
- Trend delta

### ۴.۴ Quick Actions

**موقعیت:** پایین صفحه، ثابت
**اندازه:** عرض کامل، ارتفاع 64px

```
┌─────────────────────────────────────────────────────────────┐
│  [📝 پست جدید]  [📁 دسته‌بندی]  [👥 کاربران]  [📊 گزارش‌ها]  [⚙️ تنظیمات] │
└─────────────────────────────────────────────────────────────┘
```

**Role-Based Actions:**
| دستور | AUTHOR | ADMIN | OWNER |
|-------|--------|-------|-------|
| پست جدید | ✅ | ✅ | ✅ |
| دسته‌بندی | ✅ | ✅ | ✅ |
| کاربران | ❌ | ✅ | ✅ |
| گزارش‌ها | ❌ | ✅ | ✅ |
| تنظیمات | ❌ | ❌ | ✅ |

**Interactions:**
- Hover: scale(1.05) + shadow
- Focus: ring
- Click: navigate to page

---

## ۵. Task System (جدید)

### Prisma Schema
```prisma
model Task {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### Server Actions
```typescript
// src/actions/taskActions.ts
'use server'

import { requireUser } from '@/lib/require-auth'
import { db } from '@/lib/db'
import { revalidateTag } from '@/lib/revalidate'

export async function getTasks(limit = 10) {
  const user = await requireUser()
  return db.task.findMany({
    where: { userId: user.id },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    take: limit,
  })
}

export async function createTask(data: {
  title: string
  description?: string
  dueDate?: Date
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}) {
  const user = await requireUser()
  const task = await db.task.create({
    data: { ...data, userId: user.id },
  })
  revalidateTag('tasks')
  return { success: true, data: task }
}

export async function updateTaskStatus(
  id: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
) {
  const user = await requireUser()
  const task = await db.task.update({
    where: { id, userId: user.id },
    data: { status },
  })
  revalidateTag('tasks')
  return { success: true, data: task }
}

export async function deleteTask(id: string) {
  const user = await requireUser()
  await db.task.delete({
    where: { id, userId: user.id },
  })
  revalidateTag('tasks')
  return { success: true }
}
```

---

## ۶. Exchange Rates (واقعی)

### منبع داده
- **دلار/یورو/طلا/سکه:** از `getExchangeRates()` موجود
- **بیت‌کوین:** از CoinGecko API (رایگان)
- **بروزرسانی:** هر ۵ دقیقه (cache)

### Component
```typescript
// MarketPulse.tsx
interface MarketRate {
  name: string
  value: number
  change: number // درصد تغییر
  icon: string
  unit: string
}

// داده‌ها از server action
const rates = await getMarketRates()
```

---

## ۷. حذف‌ها

### فایل‌هایی که حذف می‌شوند:
```
src/components/Dashboard/DashboardPage/aurora/     (خالی)
src/components/Dashboard/DashboardPage/tide/        (نسل قدیمی)
src/components/Dashboard/DashboardPage/overview/    (نسل قدیمی)
src/components/Dashboard/DashboardPage/v2/          (نسل قدیمی)
src/components/Dashboard/DashboardPage/nova/        (نسل فعلی)
```

### CSS‌هایی که حذف می‌شوند:
```
.dashboard.css — بخش‌های Aurora, V2, Atlas, TIDE, NOVA
(فقط بخش Command Center باقی می‌ماند)
```

### Component‌هایی که حذف می‌شوند:
```
MarketPulseTile.tsx (hardcoded)
AsideTile.tsx (quote+health)
StreamTile.tsx (activity feed)
```

---

## ۸. Performance Budget

| Metric | Target | Strategy |
|--------|--------|----------|
| FCP | < 1.5s | Server Component + streaming |
| LCP | < 2.5s | Priority loading for Hero |
| CLS | < 0.1 | Fixed dimensions for all tiles |
| INP | < 200ms | Debounced interactions |
| Bundle | < 150KB | Lazy load charts, code split |

### Optimization Strategies
1. **Server Components:** صفحه اصلی + data fetching
2. **Client Components:** فقط interactive بخش‌ها
3. **Lazy Loading:** Charts + heavy components
4. **Code Splitting:** هر tile جداگانه
5. **Caching:** `unstable_cache` با tags
6. **Streaming:** `Suspense` برای بخش‌های مختلف

---

## ۹. Accessibility

### WCAG 2.2 AA Compliance
- Contrast ratio: حداقل 4.5:1 برای متن
- Focus states: ring 2px با رنگ brand
- Keyboard navigation: Tab order منطقی
- Screen reader: aria-labels برای همه interactive elements
- Reduced motion: `prefers-reduced-motion` غیرفعال‌سازی animations

### Semantic HTML
```html
<main role="main">
  <section aria-label="Command Bar">
    <input role="searchbox" aria-label="جستجوی دستورات" />
  </section>
  
  <section aria-label="Timeline">
    <h2>فعالیت‌های اخیر</h2>
    <ul role="feed" aria-live="polite">
      <!-- timeline items -->
    </ul>
  </section>
  
  <section aria-label="Context Panel">
    <h2>پنل زمینه‌ای</h2>
    <!-- content -->
  </section>
  
  <nav aria-label="Quick Actions">
    <!-- action buttons -->
  </nav>
</main>
```

---

## ۱۰. Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 767px) {
  /* Single column layout */
  /* Command Bar full width */
  /* Timeline full width */
  /* Context Panel hidden (toggle) */
  /* Quick Actions horizontal scroll */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 2-column layout */
  /* Timeline 50% */
  /* Context Panel 50% */
}

/* Desktop */
@media (min-width: 1024px) {
  /* 2-column layout */
  /* Timeline 60% */
  /* Context Panel 40% */
}
```

---

## ۱۱. Migration Plan

### Phase 1: Cleanup (Day 1)
1. حذف نسل‌های قدیمی (Aurora, V2, Atlas, TIDE)
2. حذف component‌های غیرضروری
3. پاکسازی CSS

### Phase 2: Core Build (Day 2-3)
1. ساخت CommandBar
2. ساخت Timeline
3. ساخت ContextPanel
4. ساخت QuickActions

### Phase 3: Features (Day 4-5)
1. اضافه کردن Task system (Prisma + actions)
2. اتصال Market Pulse به API واقعی
3. اضافه کردن Analytics chart

### Phase 4: Polish (Day 6)
1. Responsive design
2. Accessibility audit
3. Performance optimization
4. Testing

---

## ۱۲. Risks & Mitigations

| ریسک | احتمال | تأثیر | Mitigation |
|------|--------|-------|------------|
| Task system نیاز به migration دارد | متوسط | متوسط | Migration ساده، قابل rollback |
| API نرخ ارز ممکن است قطع شود | کم | بالا | Fallback به cache + USDT |
| Performance regression | کم | بالا | Budget monitoring + profiling |
| RTL issues | متوسط | متوسط | استفاده از logical properties |

---

## ۱۳. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first action | < 3s | User testing |
| Command usage | > 30% of interactions | Analytics |
| Task completion rate | > 80% | Database |
| User satisfaction | > 4.5/5 | Survey |

---

## ۱۴. Open Questions

1. آیا Task system نیاز به priority-based sorting دارد؟
2. آیا Market Pulse نیاز به notification برای تغییرات بزرگ دارد؟
3. آیا Command Bar نیاز به AI-powered suggestions دارد؟

---

## ۱۵. Approval

**منتظر بررسی و تایید کاربر قبل از شروع پیاده‌سازی.**

---

*این spec توسط AI Architect نوشته شده و نیاز به بررسی نهایی توسط کاربر دارد.*
