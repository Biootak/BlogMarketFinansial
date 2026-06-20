# Exchange Rates Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** بازطراحی کامل صفحهٔ `/dashboard/exchange-rates` با استفاده از Design System موجود، با ۸ کامپوننت جدید و رفع مشکلات بصری/UX/فنی شناسایی‌شده در spec.

**Architecture:**
- Server Component (`page.tsx`) + Client Islands (`_components/*.tsx`)
- استفاده از DS موجود (`src/components/ds/primitives/*` و `tokens.css`) — هیچ magic number
- URL-persisted filters با `nuqs` یا `useSearchParams`
- Drawer با focus trap، Portal mount، keyboard nav

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind v4 · Radix UI · `cmdk` (Command Palette) · `framer-motion` (motion-shim) · `clsx` + `tailwind-merge` · DS tokens (`oklch`, `clamp()`)

**Spec:** `docs/superpowers/specs/2026-06-20-exchange-rates-redesign-design.md`

---

## File Structure

```
src/app/dashboard/exchange-rates/
├── page.tsx                          (Server, بازنویسی)
├── loading.tsx                       (Skeleton بهتر)
└── _components/
    ├── ExchangeRatesHeader.tsx       (H1 + subhead + StatCards grid)
    ├── ExchangeRatesToolbar.tsx      (Search + filter chips + CTA)
    ├── ExchangeRatesTable.tsx        (جدول با sort/filter client-side)
    ├── ExchangeRateRow.tsx           (یک ردیف با hover-reveal actions)
    ├── RateEditorDrawer.tsx          (3-step drawer)
    ├── DiscoveryCommand.tsx          (Cmd+K — جایگزین DiscoveryDropdown)
    ├── SourceBadge.tsx               (auto/manual با رنگ متمایز)
    └── ValueCell.tsx                 (مقدار DB + delta از TGJU)
```

**مسئولیت هر فایل:**
- هر کامپوننت = یکی از job های زیر: presentational pure، stateful client، یا server data fetcher
- Server Component فقط در `page.tsx` و جایی که data fetch لازم است
- Client Components با `'use client'` در ابتدای فایل

---

## Task 1: Server Page refactor + Header با StatCards

**Files:**
- Modify: `src/app/dashboard/exchange-rates/page.tsx`
- Create: `src/app/dashboard/exchange-rates/_components/ExchangeRatesHeader.tsx`
- Test: visual smoke (browser at `/dashboard/exchange-rates`)

- [ ] **Step 1: نوشتن Server Component برای Header**

فایل `src/app/dashboard/exchange-rates/_components/ExchangeRatesHeader.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/ExchangeRatesHeader.tsx
// 2026-06-20: بازطراحی — StatCards + عنوان با سلسله‌مراتب آشکار
import type { ExchangeRate } from '@prisma/client';

interface HeaderProps {
  total: number;
  auto: number;
  manual: number;
  lastSyncAt: Date | null;
}

export default function ExchangeRatesHeader({ total, auto, manual, lastSyncAt }: HeaderProps) {
  const lastSyncLabel = lastSyncAt
    ? new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' }).format(
        Math.round((Date.now() - lastSyncAt.getTime()) / 60_000),
        'minute',
      )
    : 'هنوز همگام‌سازی نشده';

  return (
    <header className="flex flex-col gap-6">
      {/* Eyebrow + Title + Subhead */}
      <div className="flex flex-col gap-2">
        <span
          className="text-[var(--ds-text-xs)] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--ds-brand-500)' }}
        >
          بازارها
        </span>
        <h1
          className="font-extrabold tracking-tight"
          style={{
            fontSize: 'var(--ds-text-3xl)',
            lineHeight: 'var(--ds-leading-tight)',
            color: 'var(--ds-text-primary)',
          }}
        >
          نرخ‌های بازار
        </h1>
        <p
          className="max-w-2xl"
          style={{
            fontSize: 'var(--ds-text-base)',
            lineHeight: 'var(--ds-leading-relaxed)',
            color: 'var(--ds-text-secondary)',
          }}
        >
          مدیریت نرخ‌های لحظه‌ای برای تیکر صفحهٔ اصلی. آخرین همگام‌سازی از TGJU: {lastSyncLabel}.
        </p>
      </div>

      {/* StatCards grid */}
      <dl
        className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--ds-space-4)]"
        role="list"
      >
        <StatCard label="کل نرخ‌ها" value={total.toLocaleString('fa-IR')} accent="brand" />
        <StatCard label="خودکار (TGJU)" value={auto.toLocaleString('fa-IR')} accent="emerald" />
        <StatCard label="دستی" value={manual.toLocaleString('fa-IR')} accent="amber" />
      </dl>
    </header>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'brand' | 'emerald' | 'amber';
}) {
  const accentColor =
    accent === 'brand'
      ? 'var(--ds-brand-500)'
      : accent === 'emerald'
        ? 'var(--ds-accent-emerald)'
        : 'var(--ds-accent-amber)';

  return (
    <div
      className="flex flex-col gap-1.5 backdrop-blur-sm transition-shadow hover:shadow-md"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        padding: 'var(--ds-space-4) var(--ds-space-5)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      <dt
        className="font-semibold uppercase tracking-[0.06em]"
        style={{
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-muted)',
        }}
      >
        {label}
      </dt>
      <dd
        className="font-extrabold tabular-nums"
        style={{
          fontSize: 'var(--ds-text-2xl)',
          lineHeight: 'var(--ds-leading-tight)',
          color: accentColor,
        }}
      >
        {value}
      </dd>
    </div>
  );
}
```

- [ ] **Step 2: بازنویسی page.tsx**

فایل `src/app/dashboard/exchange-rates/page.tsx`:

```tsx
// src/app/dashboard/exchange-rates/page.tsx
// 2026-06-20: بازطراحی کامل — Server Component + Sub-Components

import { getExchangeRateList } from '@/actions/market-rates';
import ExchangeRatesHeader from './_components/ExchangeRatesHeader';

export const revalidate = 30;

export default async function ExchangeRatesPage() {
  const rows = await getExchangeRateList();
  const total = rows.length;
  const auto = rows.filter((r) => r.provider === 'auto').length;
  const manual = rows.filter((r) => r.provider === 'manual').length;
  const lastSyncAt = rows.reduce<Date | null>(
    (max, r) => (max === null || r.updatedAt > max ? r.updatedAt : max),
    null,
  );

  return (
    <main
      className="mx-auto flex flex-col"
      style={{
        maxWidth: '1200px',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        gap: 'var(--ds-space-8)',
      }}
    >
      <ExchangeRatesHeader total={total} auto={auto} manual={manual} lastSyncAt={lastSyncAt} />
      {/* Toolbar, Table در Task 2/3 اضافه می‌شوند */}
    </main>
  );
}
```

- [ ] **Step 3: Typecheck و Build**

Run: `npx tsc --noEmit`
Expected: EXIT=0

Run: `npm run lint -- src/app/dashboard/exchange-rates/`
Expected: no errors

- [ ] **Step 4: بصری تأیید در مرورگر**

دستور: باز کردن `http://localhost:3000/dashboard/exchange-rates` (dev server)
انتظار:
- Eyebrow بنفش (`var(--ds-brand-500)`) بالای عنوان
- H1 با `font-extrabold` و سایز بزرگ
- Subhead خاکستری ملایم با timestamp
- ۳ StatCard با border subtle، hover shadow، رنگ متمایز برای هر کدام

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/exchange-rates/
git commit -m "feat(dashboard/exchange-rates): redesign header with statcards"
```

---

## Task 2: SourceBadge و ValueCell (presentational components)

**Files:**
- Create: `src/app/dashboard/exchange-rates/_components/SourceBadge.tsx`
- Create: `src/app/dashboard/exchange-rates/_components/ValueCell.tsx`

- [ ] **Step 1: نوشتن SourceBadge**

فایل `src/app/dashboard/exchange-rates/_components/SourceBadge.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/SourceBadge.tsx
// 2026-06-20: بج منبع با رنگ متمایز (auto=emerald, manual=amber, disabled=muted)

interface SourceBadgeProps {
  provider: 'auto' | 'manual' | string;
  tgjuKey?: string | null;
}

export default function SourceBadge({ provider, tgjuKey }: SourceBadgeProps) {
  if (provider === 'auto') {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-semibold"
        style={{
          fontSize: 'var(--ds-text-xs)',
          padding: '0.25rem 0.625rem',
          borderRadius: 'var(--ds-radius-full)',
          background: 'color-mix(in oklch, var(--ds-accent-emerald) 14%, transparent)',
          color: 'var(--ds-accent-emerald)',
          border: '1px solid color-mix(in oklch, var(--ds-accent-emerald) 30%, transparent)',
        }}
        aria-label={`منبع خودکار از ${tgjuKey ?? 'TGJU'}`}
      >
        <span
          aria-hidden
          style={{
            width: '0.375rem',
            height: '0.375rem',
            borderRadius: 'var(--ds-radius-full)',
            background: 'var(--ds-accent-emerald)',
          }}
        />
        TGJU
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold"
      style={{
        fontSize: 'var(--ds-text-xs)',
        padding: '0.25rem 0.625rem',
        borderRadius: 'var(--ds-radius-full)',
        background: 'color-mix(in oklch, var(--ds-accent-amber) 14%, transparent)',
        color: 'var(--ds-accent-amber)',
        border: '1px solid color-mix(in oklch, var(--ds-accent-amber) 30%, transparent)',
      }}
      aria-label="منبع دستی"
    >
      <span
        aria-hidden
        style={{
          width: '0.375rem',
          height: '0.375rem',
          borderRadius: 'var(--ds-radius-full)',
          background: 'var(--ds-accent-amber)',
        }}
      />
      دستی
    </span>
  );
}
```

- [ ] **Step 2: نوشتن ValueCell**

فایل `src/app/dashboard/exchange-rates/_components/ValueCell.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/ValueCell.tsx
// 2026-06-20: نمایش مقدار DB + delta از TGJU در یک سلول

import { formatWithUnit } from '@/lib/market-rates/format';
import type { MarketRateUnit } from '@/lib/market-rates';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ValueCellProps {
  rawValue: number | null;
  unit: MarketRateUnit | string | null;
  decimals: number;
  tgjuDelta?: number | null;
}

export default function ValueCell({ rawValue, unit, decimals, tgjuDelta }: ValueCellProps) {
  if (rawValue === null || !unit) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-medium tabular-nums"
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
          opacity: 0.6,
        }}
        aria-label="مقدار موجود نیست"
      >
        <Minus aria-hidden style={{ width: '0.875rem', height: '0.875rem' }} />
        —
      </span>
    );
  }

  const formatted = formatWithUnit(rawValue, unit as MarketRateUnit, decimals);
  const hasDelta = typeof tgjuDelta === 'number' && Number.isFinite(tgjuDelta) && tgjuDelta !== 0;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="font-semibold tabular-nums"
        dir="ltr"
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-primary)',
        }}
      >
        {formatted}
      </span>
      {hasDelta && tgjuDelta !== undefined && tgjuDelta !== null && (
        <span
          className="inline-flex items-center gap-0.5 font-semibold tabular-nums"
          dir="ltr"
          style={{
            fontSize: 'var(--ds-text-xs)',
            color:
              tgjuDelta > 0
                ? 'var(--ds-accent-emerald)'
                : 'var(--ds-accent-rose)',
          }}
          aria-label={`تغییر ${tgjuDelta > 0 ? 'مثبت' : 'منفی'} ${Math.abs(tgjuDelta).toFixed(2)} درصد`}
        >
          {tgjuDelta > 0 ? (
            <TrendingUp aria-hidden style={{ width: '0.75rem', height: '0.75rem' }} />
          ) : (
            <TrendingDown aria-hidden style={{ width: '0.75rem', height: '0.75rem' }} />
          )}
          {tgjuDelta > 0 ? '+' : ''}
          {tgjuDelta.toFixed(2)}٪
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: EXIT=0

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/exchange-rates/_components/SourceBadge.tsx src/app/dashboard/exchange-rates/_components/ValueCell.tsx
git commit -m "feat(dashboard/exchange-rates): add SourceBadge and ValueCell components"
```

---

## Task 3: ExchangeRatesToolbar (Search + Filter chips)

**Files:**
- Create: `src/app/dashboard/exchange-rates/_components/ExchangeRatesToolbar.tsx`

- [ ] **Step 1: نوشتن ExchangeRatesToolbar**

فایل `src/app/dashboard/exchange-rates/_components/ExchangeRatesToolbar.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/ExchangeRatesToolbar.tsx
// 2026-06-20: نوار ابزار با جست‌وجو + SegmentedControl + CTA
'use client';

import { Search, Plus } from 'lucide-react';
import { useState } from 'react';
import { SegmentedControl } from '@/components/ds';

export type SourceFilter = 'all' | 'auto' | 'manual';
export type GroupFilter = 'all' | 'afghan' | 'iran-forex' | 'iran-coin' | 'iran-gold' | 'global' | 'minor';

interface ToolbarProps {
  query: string;
  onQueryChange: (q: string) => void;
  source: SourceFilter;
  onSourceChange: (s: SourceFilter) => void;
  group: GroupFilter;
  onGroupChange: (g: GroupFilter) => void;
  onAddClick: () => void;
}

const GROUP_LABELS: Record<GroupFilter, string> = {
  all: 'همه گروه‌ها',
  afghan: 'افغان',
  'iran-forex': 'فارکس ایران',
  'iran-coin': 'سکه',
  'iran-gold': 'طلا',
  global: 'جهانی',
  minor: 'سایر',
};

export default function ExchangeRatesToolbar({
  query,
  onQueryChange,
  source,
  onSourceChange,
  group,
  onGroupChange,
  onAddClick,
}: ToolbarProps) {
  const [localQuery, setLocalQuery] = useState(query);

  // debounce ساده (300ms)
  const handleQueryChange = (v: string) => {
    setLocalQuery(v);
    const id = setTimeout(() => onQueryChange(v), 300);
    return () => clearTimeout(id);
  };

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between backdrop-blur-sm"
      style={{
        padding: 'var(--ds-space-3) var(--ds-space-4)',
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-md)',
      }}
      role="search"
      aria-label="ابزار فیلتر نرخ‌ها"
    >
      <div className="flex flex-1 items-center gap-3 min-w-0">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search
            aria-hidden
            style={{
              position: 'absolute',
              insetInlineStart: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1rem',
              height: '1rem',
              color: 'var(--ds-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="جست‌وجوی نام یا نماد…"
            aria-label="جست‌وجوی نرخ"
            className="w-full outline-none transition-colors"
            style={{
              height: '2.25rem',
              paddingInlineStart: '2.25rem',
              paddingInlineEnd: '0.75rem',
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-primary)',
              background: 'var(--ds-canvas-subtle)',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--ds-radius-md)',
            }}
          />
        </div>

        {/* Source segmented */}
        <SegmentedControl
          value={source}
          onChange={(v) => onSourceChange(v as SourceFilter)}
          options={[
            { value: 'all', label: 'همه' },
            { value: 'auto', label: 'خودکار' },
            { value: 'manual', label: 'دستی' },
          ]}
          ariaLabel="فیلتر منبع"
        />

        {/* Group select */}
        <select
          value={group}
          onChange={(e) => onGroupChange(e.target.value as GroupFilter)}
          aria-label="فیلتر گروه"
          className="outline-none cursor-pointer"
          style={{
            height: '2.25rem',
            paddingInlineStart: '0.75rem',
            paddingInlineEnd: '2rem',
            fontSize: 'var(--ds-text-sm)',
            color: 'var(--ds-text-primary)',
            background: 'var(--ds-canvas-subtle)',
            border: '1px solid var(--ds-border-subtle)',
            borderRadius: 'var(--ds-radius-md)',
          }}
        >
          {Object.entries(GROUP_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={onAddClick}
        className="inline-flex items-center justify-center gap-1.5 font-semibold transition-all"
        style={{
          height: '2.25rem',
          padding: '0 var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-inverse)',
          background: 'var(--ds-brand-500)',
          borderRadius: 'var(--ds-radius-md)',
          boxShadow: 'var(--ds-shadow-sm)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--ds-brand-600)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--ds-brand-500)';
        }}
      >
        <Plus aria-hidden style={{ width: '1rem', height: '1rem' }} />
        افزودن نرخ جدید
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: EXIT=0

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/exchange-rates/_components/ExchangeRatesToolbar.tsx
git commit -m "feat(dashboard/exchange-rates): add toolbar with search and filters"
```

---

## Task 4: ExchangeRatesTable و ExchangeRateRow

**Files:**
- Create: `src/app/dashboard/exchange-rates/_components/ExchangeRatesTable.tsx`
- Create: `src/app/dashboard/exchange-rates/_components/ExchangeRateRow.tsx`

- [ ] **Step 1: نوشتن ExchangeRateRow**

فایل `src/app/dashboard/exchange-rates/_components/ExchangeRateRow.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/ExchangeRateRow.tsx
// 2026-06-20: یک ردیف جدول با hover-reveal actions (ویرایش/حذف)

'use client';

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import SourceBadge from './SourceBadge';
import ValueCell from './ValueCell';
import type { MarketRateUnit } from '@/lib/market-rates';

export interface RateRowData {
  id: string;
  symbol: string;
  displayNameFa: string;
  group: string | null;
  unit: string | null;
  decimals: number;
  singleRate: string | null;
  provider: string;
  active: boolean;
  priority: number;
  tgjuKey: string | null;
  updatedAt: Date;
}

interface RowProps {
  row: RateRowData;
  onEdit: (row: RateRowData) => void;
  onDelete: (row: RateRowData) => void;
}

export default function ExchangeRateRow({ row, onEdit, onDelete }: RowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const rawValue =
    row.singleRate && row.divisor !== undefined ? Number.parseFloat(row.singleRate) : null;
  // توجه: divisor در data اضافه شده ولی در RateRowData نیست. در Task 5 اصلاح می‌شود.

  return (
    <tr
      className="group transition-colors"
      style={{ borderTop: '1px solid var(--ds-border-subtle)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        setMenuOpen(false);
      }}
    >
      {/* Priority */}
      <td
        className="font-semibold tabular-nums"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
          textAlign: 'start',
        }}
      >
        {row.priority.toLocaleString('fa-IR')}
      </td>

      {/* Display Name */}
      <td
        className="font-semibold"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-primary)',
        }}
      >
        {row.displayNameFa}
      </td>

      {/* Symbol (monospace) */}
      <td
        className="font-mono"
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-secondary)',
          direction: 'ltr',
          textAlign: 'start',
        }}
      >
        {row.symbol}
      </td>

      {/* Group */}
      <td
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-muted)',
        }}
      >
        {row.group ?? '—'}
      </td>

      {/* Value */}
      <td
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          textAlign: 'start',
        }}
      >
        <ValueCell
          rawValue={rawValue}
          unit={(row.unit as MarketRateUnit) ?? null}
          decimals={row.decimals ?? 0}
        />
      </td>

      {/* Source */}
      <td style={{ padding: 'var(--ds-space-3) var(--ds-space-4)' }}>
        <SourceBadge provider={row.provider} tgjuKey={row.tgjuKey} />
      </td>

      {/* Active status */}
      <td style={{ padding: 'var(--ds-space-3) var(--ds-space-4)' }}>
        <span
          aria-label={row.active ? 'فعال' : 'غیرفعال'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: 'var(--ds-text-xs)',
            fontWeight: 600,
            color: row.active ? 'var(--ds-accent-emerald)' : 'var(--ds-text-muted)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: 'var(--ds-radius-full)',
              background: row.active ? 'var(--ds-accent-emerald)' : 'var(--ds-text-muted)',
            }}
          />
          {row.active ? 'فعال' : 'غیرفعال'}
        </span>
      </td>

      {/* Actions (hover-reveal) */}
      <td
        style={{
          padding: 'var(--ds-space-3) var(--ds-space-4)',
          textAlign: 'end',
        }}
      >
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="عملیات بیشتر"
            aria-expanded={menuOpen}
            className="inline-flex items-center justify-center transition-opacity"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--ds-radius-md)',
              background: 'transparent',
              color: 'var(--ds-text-muted)',
              opacity: menuOpen ? 1 : 0,
            }}
            onFocus={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <MoreHorizontal style={{ width: '1rem', height: '1rem' }} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute z-20 flex flex-col"
              style={{
                insetInlineEnd: 0,
                top: 'calc(100% + 0.25rem)',
                minWidth: '10rem',
                padding: '0.25rem',
                background: 'var(--ds-surface-elevated)',
                border: '1px solid var(--ds-border-default)',
                borderRadius: 'var(--ds-radius-md)',
                boxShadow: 'var(--ds-shadow-md)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(row);
                }}
                className="flex items-center gap-2 w-full text-start transition-colors"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-primary)',
                  borderRadius: 'var(--ds-radius-sm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--ds-canvas-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Pencil style={{ width: '0.875rem', height: '0.875rem' }} />
                ویرایش
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(row);
                }}
                className="flex items-center gap-2 w-full text-start transition-colors"
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-accent-rose)',
                  borderRadius: 'var(--ds-radius-sm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'color-mix(in oklch, var(--ds-accent-rose) 10%, transparent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                حذف
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: نوشتن ExchangeRatesTable**

فایل `src/app/dashboard/exchange-rates/_components/ExchangeRatesTable.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/ExchangeRatesTable.tsx
// 2026-06-20: جدول با sort و filter client-side

'use client';

import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import ExchangeRateRow, { type RateRowData } from './ExchangeRateRow';
import type { SourceFilter, GroupFilter } from './ExchangeRatesToolbar';

interface TableProps {
  rows: RateRowData[];
  query: string;
  source: SourceFilter;
  group: GroupFilter;
  onEdit: (row: RateRowData) => void;
  onDelete: (row: RateRowData) => void;
}

type SortKey = 'priority' | 'displayNameFa' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortKey | null; label: string; sortable: boolean }> = [
  { key: 'priority', label: 'اولویت', sortable: true },
  { key: 'displayNameFa', label: 'نام', sortable: true },
  { key: null, label: 'نماد', sortable: false },
  { key: null, label: 'گروه', sortable: false },
  { key: null, label: 'مقدار', sortable: false },
  { key: null, label: 'منبع', sortable: false },
  { key: null, label: 'وضعیت', sortable: false },
  { key: null, label: '', sortable: false },
];

export default function ExchangeRatesTable({
  rows,
  query,
  source,
  group,
  onEdit,
  onDelete,
}: TableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (source !== 'all' && r.provider !== source) return false;
      if (group !== 'all' && r.group !== group) return false;
      if (!q) return true;
      return (
        r.displayNameFa.toLowerCase().includes(q) ||
        r.symbol.toLowerCase().includes(q)
      );
    });
  }, [rows, query, source, group]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'priority') cmp = a.priority - b.priority;
      else if (sortKey === 'displayNameFa')
        cmp = a.displayNameFa.localeCompare(b.displayNameFa, 'fa-IR');
      else if (sortKey === 'updatedAt')
        cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (sorted.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3"
        style={{
          padding: 'var(--ds-space-10) var(--ds-space-6)',
          background: 'var(--ds-surface)',
          border: '1px dashed var(--ds-border-default)',
          borderRadius: 'var(--ds-radius-lg)',
          color: 'var(--ds-text-muted)',
        }}
      >
        <span style={{ fontSize: 'var(--ds-text-2xl)' }}>🪙</span>
        <p
          className="font-semibold"
          style={{ fontSize: 'var(--ds-text-base)', color: 'var(--ds-text-primary)' }}
        >
          نرخی با این فیلترها پیدا نشد
        </p>
        <p style={{ fontSize: 'var(--ds-text-sm)' }}>
          فیلترها را تغییر دهید یا نرخ جدیدی اضافه کنید.
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto backdrop-blur-sm"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        boxShadow: 'var(--ds-shadow-sm)',
      }}
    >
      <table
        className="w-full"
        role="grid"
        aria-label="جدول نرخ‌های بازار"
        style={{ borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          <tr style={{ background: 'var(--ds-canvas-subtle)' }}>
            {COLUMNS.map((col, i) => (
              <th
                key={i}
                scope="col"
                className="font-semibold uppercase"
                aria-sort={
                  sortKey === col.key
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                style={{
                  padding: 'var(--ds-space-3) var(--ds-space-4)',
                  fontSize: 'var(--ds-text-xs)',
                  letterSpacing: '0.06em',
                  color: 'var(--ds-text-muted)',
                  textAlign: 'start',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key as SortKey)}
                    className="inline-flex items-center gap-1 transition-colors"
                    style={{
                      color: 'inherit',
                      font: 'inherit',
                      letterSpacing: 'inherit',
                      textTransform: 'inherit',
                    }}
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === 'asc' ? (
                        <ChevronUp style={{ width: '0.75rem', height: '0.75rem' }} />
                      ) : (
                        <ChevronDown style={{ width: '0.75rem', height: '0.75rem' }} />
                      )
                    ) : null}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <ExchangeRateRow key={row.id} row={row} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: EXIT=0

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/exchange-rates/_components/ExchangeRatesTable.tsx src/app/dashboard/exchange-rates/_components/ExchangeRateRow.tsx
git commit -m "feat(dashboard/exchange-rates): add sortable table with hover actions"
```

---

## Task 5: اصلاح RateRowData — اضافه کردن divisor

**Files:**
- Modify: `src/app/dashboard/exchange-rates/_components/ExchangeRateRow.tsx`

- [ ] **Step 1: اضافه کردن divisor به RateRowData interface**

در فایل `ExchangeRateRow.tsx`، interface `RateRowData` را به این صورت به‌روزرسانی کنید:

```ts
export interface RateRowData {
  id: string;
  symbol: string;
  displayNameFa: string;
  group: string | null;
  unit: string | null;
  divisor: number;
  decimals: number;
  singleRate: string | null;
  provider: string;
  active: boolean;
  priority: number;
  tgjuKey: string | null;
  updatedAt: Date;
}
```

و محاسبهٔ `rawValue` را به این تغییر دهید:

```ts
const rawValue =
  row.singleRate
    ? Number.parseFloat(row.singleRate) / (row.divisor || 1)
    : null;
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: EXIT=0

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/exchange-rates/_components/ExchangeRateRow.tsx
git commit -m "fix(dashboard/exchange-rates): include divisor in row value calc"
```

---

## Task 6: DiscoveryCommand (Cmd+K)

**Files:**
- Create: `src/app/dashboard/exchange-rates/_components/DiscoveryCommand.tsx`

- [ ] **Step 1: نوشتن DiscoveryCommand**

فایل `src/app/dashboard/exchange-rates/_components/DiscoveryCommand.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/DiscoveryCommand.tsx
// 2026-06-20: Command Palette (Cmd+K) — جایگزین DiscoveryDropdown

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (s: TgjuSymbol) => void;
}

export default function DiscoveryCommand({ open, onOpenChange, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState<TgjuSymbol[]>([]);
  const [loading, setLoading] = useState(false);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  // Fetch symbols when opened
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/market-rates/tgju-symbols')
      .then((r) => r.json())
      .then((j: { success?: boolean; data?: TgjuSymbol[] }) => {
        if (j.success && j.data) setSymbols(j.data);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSelect = useCallback(
    (s: TgjuSymbol) => {
      onSelect(s);
      onOpenChange(false);
      setQuery('');
    },
    [onSelect, onOpenChange],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="جست‌وجوی نرخ‌های TGJU"
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{
        paddingTop: 'min(20vh, 8rem)',
        background: 'color-mix(in oklch, var(--ds-canvas) 60%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px, 92vw)',
          background: 'var(--ds-surface-elevated)',
          border: '1px solid var(--ds-border-default)',
          borderRadius: 'var(--ds-radius-lg)',
          boxShadow: 'var(--ds-shadow-lg)',
          overflow: 'hidden',
        }}
      >
        <Command
          className="flex flex-col"
          label="جست‌وجوی نرخ"
          shouldFilter
        >
          <div
            className="flex items-center gap-2"
            style={{
              padding: 'var(--ds-space-3) var(--ds-space-4)',
              borderBottom: '1px solid var(--ds-border-subtle)',
            }}
          >
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="جست‌وجو در نرخ‌های TGJU…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 'var(--ds-text-base)',
                color: 'var(--ds-text-primary)',
              }}
            />
            <kbd
              aria-hidden
              style={{
                fontSize: 'var(--ds-text-xs)',
                padding: '0.125rem 0.375rem',
                color: 'var(--ds-text-muted)',
                background: 'var(--ds-canvas-subtle)',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: 'var(--ds-radius-sm)',
              }}
            >
              Esc
            </kbd>
          </div>

          <Command.List
            style={{
              maxHeight: 'min(60vh, 24rem)',
              overflowY: 'auto',
              padding: '0.25rem',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: 'var(--ds-space-6)',
                  textAlign: 'center',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-muted)',
                }}
              >
                در حال بارگذاری…
              </div>
            ) : (
              <>
                <Command.Empty
                  style={{
                    padding: 'var(--ds-space-6)',
                    textAlign: 'center',
                    fontSize: 'var(--ds-text-sm)',
                    color: 'var(--ds-text-muted)',
                  }}
                >
                  نتیجه‌ای یافت نشد
                </Command.Empty>
                <Command.Group heading="نرخ‌های موجود">
                  {symbols.map((s) => (
                    <Command.Item
                      key={s.tgjuKey}
                      value={`${s.tgjuKey} ${s.displayNameFa}`}
                      onSelect={() => handleSelect(s)}
                      className="flex items-center justify-between gap-3 cursor-pointer"
                      style={{
                        padding: 'var(--ds-space-3) var(--ds-space-4)',
                        borderRadius: 'var(--ds-radius-md)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--ds-text-sm)',
                          color: 'var(--ds-text-primary)',
                        }}
                      >
                        {s.displayNameFa || s.tgjuKey}
                      </span>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 'var(--ds-text-xs)',
                          color: 'var(--ds-text-muted)',
                        }}
                      >
                        {s.tgjuKey}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}
          </Command.List>

          <div
            className="flex items-center justify-between"
            style={{
              padding: 'var(--ds-space-2) var(--ds-space-4)',
              borderTop: '1px solid var(--ds-border-subtle)',
              fontSize: 'var(--ds-text-xs)',
              color: 'var(--ds-text-muted)',
            }}
          >
            <span>↑↓ انتخاب</span>
            <span>↵ تأیید</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: اطمینان از نصب cmdk**

Run: `grep '"cmdk"' package.json`
Expected: خط `"cmdk": "^x.y.z"` در dependencies

اگر نصب نیست:
```bash
npm install cmdk
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: EXIT=0

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/dashboard/exchange-rates/_components/DiscoveryCommand.tsx
git commit -m "feat(dashboard/exchange-rates): add Cmd+K discovery command palette"
```

---

## Task 7: RateEditorDrawer (3-step drawer)

**Files:**
- Create: `src/app/dashboard/exchange-rates/_components/RateEditorDrawer.tsx`

- [ ] **Step 1: نوشتن RateEditorDrawer**

فایل `src/app/dashboard/exchange-rates/_components/RateEditorDrawer.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/RateEditorDrawer.tsx
// 2026-06-20: Drawer 3 مرحله‌ای — Discovery → Configure → Review

'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import DiscoveryCommand from './DiscoveryCommand';
import { createMarketRate, updateMarketRate } from '@/actions/market-rates';
import type { TgjuSymbol } from '@/lib/market-rates/discovery';
import type { RateRowData } from './ExchangeRateRow';

type Step = 'discover' | 'configure' | 'review';
type Mode = 'create' | 'edit';

interface Props {
  open: boolean;
  mode: Mode;
  initialRow?: RateRowData | null;
  onClose: () => void;
  onSaved: () => void;
}

const GROUPS = ['afghan', 'iran-forex', 'iran-coin', 'iran-gold', 'global', 'minor'] as const;
const UNITS = ['toman', 'usd', 'eur', 'afn'] as const;

interface FormState {
  symbol: string;
  displayNameFa: string;
  group: (typeof GROUPS)[number];
  unit: (typeof UNITS)[number];
  divisor: number;
  decimals: number;
  priority: number;
  provider: 'auto' | 'manual';
  tgjuKey: string;
  singleRate: string;
  active: boolean;
}

const EMPTY: FormState = {
  symbol: '',
  displayNameFa: '',
  group: 'iran-forex',
  unit: 'toman',
  divisor: 10,
  decimals: 0,
  priority: 50,
  provider: 'auto',
  tgjuKey: '',
  singleRate: '',
  active: true,
};

export default function RateEditorDrawer({ open, mode, initialRow, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>(mode === 'edit' ? 'configure' : 'discover');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from initialRow when in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialRow) {
      setForm({
        symbol: initialRow.symbol,
        displayNameFa: initialRow.displayNameFa,
        group: (initialRow.group as FormState['group']) || 'iran-forex',
        unit: (initialRow.unit as FormState['unit']) || 'toman',
        divisor: initialRow.divisor || 10,
        decimals: initialRow.decimals || 0,
        priority: initialRow.priority,
        provider: initialRow.provider === 'manual' ? 'manual' : 'auto',
        tgjuKey: initialRow.tgjuKey || '',
        singleRate: initialRow.singleRate || '',
        active: initialRow.active,
      });
      setStep('configure');
    } else if (mode === 'create') {
      setForm(EMPTY);
      setStep('discover');
    }
  }, [mode, initialRow, open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !discoveryOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, discoveryOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleDiscoverySelect = (s: TgjuSymbol) => {
    setForm((f) => ({
      ...f,
      symbol: `CUSTOM_${s.tgjuKey.toUpperCase()}`,
      displayNameFa: s.displayNameFa || s.tgjuKey,
      tgjuKey: s.tgjuKey,
      provider: 'auto',
      divisor: 10,
      unit: 'toman',
    }));
    setStep('configure');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const result =
      mode === 'create'
        ? await createMarketRate({
            symbol: form.symbol,
            displayNameFa: form.displayNameFa,
            group: form.group,
            unit: form.unit,
            divisor: form.divisor,
            decimals: form.decimals,
            priority: form.priority,
            provider: form.provider,
            tgjuKey: form.tgjuKey || undefined,
            singleRate: form.provider === 'manual' ? form.singleRate : undefined,
          })
        : initialRow
          ? await updateMarketRate(initialRow.id, {
              displayNameFa: form.displayNameFa,
              group: form.group,
              unit: form.unit,
              divisor: form.divisor,
              decimals: form.decimals,
              priority: form.priority,
              provider: form.provider,
              tgjuKey: form.tgjuKey || null,
              singleRate: form.provider === 'manual' ? form.singleRate : null,
              active: form.active,
            })
          : { success: false as const, error: { code: 'NO_ROW', message: 'ردیفی برای ویرایش انتخاب نشده' } };

    setSubmitting(false);

    if (result.success) {
      onSaved();
      onClose();
    } else {
      setError(result.error.message);
    }
  };

  if (!open) return null;
  if (typeof window === 'undefined') return null;

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        className="fixed inset-0 z-40"
        style={{
          background: 'color-mix(in oklch, var(--ds-canvas) 50%, transparent)',
          backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed inset-y-0 z-50 flex flex-col overflow-hidden"
        style={{
          insetInlineEnd: 0,
          width: 'min(480px, 100vw)',
          background: 'var(--ds-surface-elevated)',
          borderInlineStart: '1px solid var(--ds-border-default)',
          boxShadow: 'var(--ds-shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: 'var(--ds-space-4) var(--ds-space-5)',
            borderBottom: '1px solid var(--ds-border-subtle)',
          }}
        >
          <h2
            id="drawer-title"
            className="font-bold"
            style={{
              fontSize: 'var(--ds-text-lg)',
              color: 'var(--ds-text-primary)',
            }}
          >
            {mode === 'create' ? 'افزودن نرخ جدید' : 'ویرایش نرخ'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="inline-flex items-center justify-center"
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--ds-radius-md)',
              background: 'transparent',
              color: 'var(--ds-text-muted)',
            }}
          >
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>

        {/* Step indicator */}
        <ol
          className="flex items-center gap-2"
          style={{
            padding: 'var(--ds-space-3) var(--ds-space-5)',
            borderBottom: '1px solid var(--ds-border-subtle)',
            background: 'var(--ds-canvas-subtle)',
          }}
        >
          {(['discover', 'configure', 'review'] as Step[]).map((s, i) => (
            <li
              key={s}
              className="flex items-center gap-2"
              style={{
                fontSize: 'var(--ds-text-xs)',
                color:
                  s === step ? 'var(--ds-brand-500)' : 'var(--ds-text-muted)',
                fontWeight: s === step ? 600 : 400,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '1.25rem',
                  height: '1.25rem',
                  borderRadius: 'var(--ds-radius-full)',
                  background:
                    s === step
                      ? 'var(--ds-brand-500)'
                      : 'var(--ds-canvas-subtle)',
                  color: s === step ? 'var(--ds-text-inverse)' : 'var(--ds-text-muted)',
                  border: '1px solid var(--ds-border-default)',
                }}
              >
                {i + 1}
              </span>
              {s === 'discover' ? 'انتخاب' : s === 'configure' ? 'تنظیمات' : 'بررسی'}
            </li>
          ))}
        </ol>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: 'var(--ds-space-5)' }}
        >
          {step === 'discover' && mode === 'create' && (
            <div className="flex flex-col gap-4">
              <p
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-secondary)',
                  lineHeight: 'var(--ds-leading-relaxed)',
                }}
              >
                از لیست نرخ‌های TGJU یکی انتخاب کنید یا با دکمهٔ زیر جست‌وجو کنید.
              </p>
              <button
                type="button"
                onClick={() => setDiscoveryOpen(true)}
                className="inline-flex items-center justify-center gap-2 font-semibold"
                style={{
                  height: '2.75rem',
                  padding: '0 var(--ds-space-5)',
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-inverse)',
                  background: 'var(--ds-brand-500)',
                  borderRadius: 'var(--ds-radius-md)',
                  alignSelf: 'start',
                }}
              >
                جست‌وجو در TGJU
              </button>
              <button
                type="button"
                onClick={() => setStep('configure')}
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-secondary)',
                  background: 'transparent',
                  textDecoration: 'underline',
                }}
              >
                یا بدون انتخاب، دستی ادامه بده
              </button>
            </div>
          )}

          {step === 'configure' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="نماد (Symbol)" required>
                <input
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                  required
                  className="ds-input"
                  style={inputStyle}
                />
              </Field>
              <Field label="نام فارسی" required>
                <input
                  value={form.displayNameFa}
                  onChange={(e) => setForm({ ...form, displayNameFa: e.target.value })}
                  required
                  className="ds-input"
                  style={inputStyle}
                />
              </Field>
              <Field label="گروه">
                <select
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value as FormState['group'] })}
                  style={inputStyle}
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="واحد">
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value as FormState['unit'] })}
                  style={inputStyle}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </Field>
              <Field label="Divisor">
                <input
                  type="number"
                  value={form.divisor}
                  onChange={(e) => setForm({ ...form, divisor: Number(e.target.value) })}
                  style={inputStyle}
                />
              </Field>
              <Field label="اولویت">
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                  style={inputStyle}
                />
              </Field>
              <Field label="منبع">
                <select
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value as 'auto' | 'manual' })}
                  style={inputStyle}
                >
                  <option value="auto">خودکار (TGJU)</option>
                  <option value="manual">دستی</option>
                </select>
              </Field>
              <Field label="TGJU Key">
                <input
                  value={form.tgjuKey}
                  onChange={(e) => setForm({ ...form, tgjuKey: e.target.value })}
                  placeholder="price_dollar_rl"
                  className="font-mono"
                  style={inputStyle}
                />
              </Field>
              {form.provider === 'manual' && (
                <Field label={`مقدار دستی (${form.unit})`} className="col-span-2">
                  <input
                    type="number"
                    step="any"
                    value={form.singleRate}
                    onChange={(e) => setForm({ ...form, singleRate: e.target.value })}
                    required
                    style={inputStyle}
                  />
                </Field>
              )}
              {mode === 'edit' && (
                <Field label="فعال" className="col-span-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    />
                    <span style={{ fontSize: 'var(--ds-text-sm)' }}>
                      این نرخ در تیکر نمایش داده شود
                    </span>
                  </label>
                </Field>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col gap-3">
              <p
                style={{
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--ds-text-secondary)',
                  lineHeight: 'var(--ds-leading-relaxed)',
                }}
              >
                قبل از ذخیره، تنظیمات را بررسی کنید.
              </p>
              <dl
                className="grid grid-cols-2 gap-3"
                style={{
                  padding: 'var(--ds-space-4)',
                  background: 'var(--ds-canvas-subtle)',
                  borderRadius: 'var(--ds-radius-md)',
                  border: '1px solid var(--ds-border-subtle)',
                }}
              >
                <SummaryRow label="نماد" value={form.symbol} mono />
                <SummaryRow label="نام فارسی" value={form.displayNameFa} />
                <SummaryRow label="گروه" value={form.group} />
                <SummaryRow label="واحد" value={form.unit} />
                <SummaryRow label="اولویت" value={form.priority.toString()} />
                <SummaryRow label="منبع" value={form.provider === 'auto' ? 'TGJU' : 'دستی'} />
                {form.tgjuKey && <SummaryRow label="TGJU Key" value={form.tgjuKey} mono />}
              </dl>
              {error && (
                <p
                  role="alert"
                  style={{
                    fontSize: 'var(--ds-text-sm)',
                    color: 'var(--ds-accent-rose)',
                    padding: 'var(--ds-space-3)',
                    background: 'color-mix(in oklch, var(--ds-accent-rose) 10%, transparent)',
                    borderRadius: 'var(--ds-radius-md)',
                  }}
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: 'var(--ds-space-4) var(--ds-space-5)',
            borderTop: '1px solid var(--ds-border-subtle)',
            background: 'var(--ds-canvas-subtle)',
          }}
        >
          {step !== 'discover' ? (
            <button
              type="button"
              onClick={() =>
                setStep((s) => (s === 'review' ? 'configure' : 'discover'))
              }
              disabled={submitting}
              className="inline-flex items-center gap-1.5"
              style={{
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-secondary)',
                background: 'transparent',
              }}
            >
              <ArrowRight style={{ width: '1rem', height: '1rem' }} />
              قبلی
            </button>
          ) : (
            <span />
          )}

          {step !== 'review' ? (
            <button
              type="button"
              onClick={() => {
                if (step === 'discover') setStep('configure');
                else if (
                  step === 'configure' &&
                  form.symbol &&
                  form.displayNameFa
                )
                  setStep('review');
              }}
              disabled={step === 'configure' && (!form.symbol || !form.displayNameFa)}
              className="inline-flex items-center gap-1.5 font-semibold"
              style={{
                height: '2.25rem',
                padding: '0 var(--ds-space-4)',
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-inverse)',
                background: 'var(--ds-brand-500)',
                borderRadius: 'var(--ds-radius-md)',
                opacity: step === 'configure' && (!form.symbol || !form.displayNameFa) ? 0.5 : 1,
              }}
            >
              بعدی
              <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 font-semibold"
              style={{
                height: '2.25rem',
                padding: '0 var(--ds-space-4)',
                fontSize: 'var(--ds-text-sm)',
                color: 'var(--ds-text-inverse)',
                background: 'var(--ds-brand-500)',
                borderRadius: 'var(--ds-radius-md)',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              <Check style={{ width: '1rem', height: '1rem' }} />
              {submitting ? 'در حال ذخیره…' : mode === 'create' ? 'ایجاد' : 'ذخیره'}
            </button>
          )}
        </div>
      </aside>

      <DiscoveryCommand
        open={discoveryOpen}
        onOpenChange={setDiscoveryOpen}
        onSelect={handleDiscoverySelect}
      />
    </>
  );

  return createPortal(drawer, document.body);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '2.25rem',
  padding: '0 0.75rem',
  fontSize: 'var(--ds-text-sm)',
  color: 'var(--ds-text-primary)',
  background: 'var(--ds-canvas-subtle)',
  border: '1px solid var(--ds-border-subtle)',
  borderRadius: 'var(--ds-radius-md)',
  outline: 'none',
};

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label
        style={{
          fontSize: 'var(--ds-text-xs)',
          fontWeight: 600,
          color: 'var(--ds-text-secondary)',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--ds-accent-rose)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt
        style={{
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-muted)',
          fontWeight: 600,
        }}
      >
        {label}
      </dt>
      <dd
        className={mono ? 'font-mono' : ''}
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-primary)',
          direction: mono ? 'ltr' : 'inherit',
          textAlign: mono ? 'start' : 'end',
        }}
      >
        {value}
      </dd>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: EXIT=0

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/exchange-rates/_components/RateEditorDrawer.tsx
git commit -m "feat(dashboard/exchange-rates): add 3-step editor drawer"
```

---

## Task 8: اتصال همه چیز در page.tsx

**Files:**
- Modify: `src/app/dashboard/exchange-rates/page.tsx`

- [ ] **Step 1: بازنویسی کامل page.tsx**

```tsx
// src/app/dashboard/exchange-rates/page.tsx
// 2026-06-20: بازطراحی کامل — Server fetch + Client interaction

import { getExchangeRateList } from '@/actions/market-rates';
import ExchangeRatesHeader from './_components/ExchangeRatesHeader';
import ExchangeRatesWorkspace from './_components/ExchangeRatesWorkspace';

export const revalidate = 30;

export default async function ExchangeRatesPage() {
  const rows = await getExchangeRateList();

  const total = rows.length;
  const auto = rows.filter((r) => r.provider === 'auto').length;
  const manual = rows.filter((r) => r.provider === 'manual').length;
  const lastSyncAt = rows.reduce<Date | null>(
    (max, r) => (max === null || r.updatedAt > max ? r.updatedAt : max),
    null,
  );

  const tableRows = rows.map((r) => ({
    id: r.id,
    symbol: r.symbol ?? r.currency,
    displayNameFa: r.displayNameFa ?? r.name,
    group: r.group ?? null,
    unit: r.unit ?? null,
    divisor: r.divisor ?? 1,
    decimals: r.decimals ?? 0,
    singleRate: r.singleRate ?? null,
    provider: r.provider,
    active: r.active,
    priority: r.priority ?? 99,
    tgjuKey: r.tgjuKey ?? null,
    updatedAt: r.updatedAt,
  }));

  return (
    <main
      className="mx-auto flex flex-col"
      style={{
        maxWidth: '1200px',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        gap: 'var(--ds-space-8)',
      }}
    >
      <ExchangeRatesHeader total={total} auto={auto} manual={manual} lastSyncAt={lastSyncAt} />
      <ExchangeRatesWorkspace initialRows={tableRows} />
    </main>
  );
}
```

- [ ] **Step 2: نوشتن ExchangeRatesWorkspace (Client Component)**

فایل `src/app/dashboard/exchange-rates/_components/ExchangeRatesWorkspace.tsx`:

```tsx
// src/app/dashboard/exchange-rates/_components/ExchangeRatesWorkspace.tsx
// 2026-06-20: Client wrapper — Toolbar + Table + Drawer + URL state

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ExchangeRatesToolbar, {
  type SourceFilter,
  type GroupFilter,
} from './ExchangeRatesToolbar';
import ExchangeRatesTable from './ExchangeRatesTable';
import RateEditorDrawer from './RateEditorDrawer';
import type { RateRowData } from './ExchangeRateRow';

interface Props {
  initialRows: RateRowData[];
}

export default function ExchangeRatesWorkspace({ initialRows }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<RateRowData | null>(null);

  const handleAdd = useCallback(() => {
    setEditRow(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((row: RateRowData) => {
    setEditRow(row);
    setDrawerOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row: RateRowData) => {
      if (!confirm(`نرخ «${row.displayNameFa}» حذف شود؟`)) return;
      const { deleteMarketRate } = await import('@/actions/market-rates');
      const result = await deleteMarketRate(row.id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error.message);
      }
    },
    [router],
  );

  const handleSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <ExchangeRatesToolbar
        query={query}
        onQueryChange={setQuery}
        source={source}
        onSourceChange={setSource}
        group={group}
        onGroupChange={setGroup}
        onAddClick={handleAdd}
      />

      <ExchangeRatesTable
        rows={initialRows}
        query={query}
        source={source}
        group={group}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <RateEditorDrawer
        open={drawerOpen}
        mode={editRow ? 'edit' : 'create'}
        initialRow={editRow}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: EXIT=0

- [ ] **Step 4: Lint**

Run: `npm run lint -- src/app/dashboard/exchange-rates/`
Expected: no errors

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build موفقیت‌آمیز، صفحه exchange-rates در لیست

- [ ] **Step 6: Smoke بصری**

در dev server، باز کردن `http://localhost:3000/dashboard/exchange-rates`:
- StatCards با اعداد فارسی
- Toolbar با search و filter chips
- جدول با sortable headers
- Click روی `افزودن نرخ جدید` → Drawer از راست باز شود
- Cmd+K یا / → Command palette باز شود

- [ ] **Step 7: Commit نهایی**

```bash
git add src/app/dashboard/exchange-rates/
git commit -m "feat(dashboard/exchange-rates): wire up workspace with drawer and toolbar"
```

---

## Task 9: Loading skeleton بازطراحی

**Files:**
- Modify: `src/app/dashboard/exchange-rates/loading.tsx`
- Modify: `src/components/Skeletons/index.tsx` (اگر `ExchangeRatesSkeleton` در اینجاست)

- [ ] **Step 1: خواندن Skeleton فعلی**

Read: `src/components/Skeletons/index.tsx`

اگر `ExchangeRatesSkeleton` در آنجا تعریف شده، در همین فایل بازنویسی کن. در غیر این صورت، یکی در `loading.tsx` بساز.

- [ ] **Step 2: نوشتن skeleton با DS tokens**

```tsx
// src/app/dashboard/exchange-rates/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function ExchangeRatesLoading() {
  return (
    <main
      className="mx-auto flex flex-col"
      style={{
        maxWidth: '1200px',
        padding: 'var(--ds-space-6) var(--ds-space-5)',
        gap: 'var(--ds-space-8)',
      }}
      aria-busy="true"
      aria-label="در حال بارگذاری نرخ‌ها"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-12" />
      <Skeleton className="h-96" />
    </main>
  );
}
```

- [ ] **Step 3: Typecheck و Commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/exchange-rates/loading.tsx
git commit -m "feat(dashboard/exchange-rates): add DS-aligned loading skeleton"
```

---

## Task 10: حذف فایل قدیمی DiscoveryDropdown

**Files:**
- Delete: `src/app/dashboard/exchange-rates/components/DiscoveryDropdown.tsx`
- Delete: empty `components/` folder

- [ ] **Step 1: بررسی استفاده**

Run: `grep -r "DiscoveryDropdown" src/`
Expected: فقط در `RateForm.tsx` (که در Task 7 کنار گذاشته شد) — اما چون `RateForm` خودش حذف شده، نباید استفاده‌ای باشد.

اگر استفاده‌ای بود: آن فایل را هم پاک کن.

- [ ] **Step 2: حذف فایل**

```bash
git rm src/app/dashboard/exchange-rates/components/DiscoveryDropdown.tsx
rmdir src/app/dashboard/exchange-rates/components 2>/dev/null || true
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: EXIT=0

Run: `npm run build`
Expected: موفق

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(dashboard/exchange-rates): remove obsolete DiscoveryDropdown"
```

---

## Self-Review Checklist

پس از اتمام همهٔ Taskها:

- [ ] همهٔ acceptance criteria از spec برآورده شده
- [ ] هیچ magic number یا hardcoded color در JSX نیست (همه از `tokens.css`)
- [ ] RTL همه‌جا رعایت شده (`insetInlineStart/End` نه `left/right`)
- [ ] Keyboard navigation کار می‌کند (Tab, Enter, Esc, Cmd+K)
- [ ] `prefers-reduced-motion` رعایت شده (انیمیشن‌های drawer optional هستند)
- [ ] Mobile (< 640px): جدول به لیست کارت تبدیل می‌شود (اختیاری — اگر زمان نشد، TODO بگذارید)
- [ ] Build بدون خطا: `npm run build` ✓
- [ ] Lint بدون error: `npm run lint` ✓
- [ ] Typecheck: `npx tsc --noEmit` ✓
- [ ] Smoke بصری در مرورگر ✓
