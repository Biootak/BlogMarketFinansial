# Archive Page Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** بازسازی کامل صفحه‌ی Archive با Design System جدید، حذف تکرار CSS، و رعایت کامل قوانین معمار ارشد — بدون تغییر در منطق بک‌اند، URL contract، یا cache strategy.

**Architecture:**
- **DS-first**: یک Design System پایه در `src/components/ds/` ساخته می‌شود (tokens + primitives + patterns).
- **Page-specific**: کامپوننت‌های Archive در `src/app/(site)/(archives)/_components/` قرار می‌گیرند.
- **Token-driven**: همه‌ی رنگ‌ها، spacing، type، radius، motion از CSS variables در `tokens.css` می‌آیند.
- **DRY**: v2 CSS حذف، v3 به نام‌های تمیز rename، فایل‌های مرده پاک می‌شوند.

**Tech Stack:**
- Next.js 16 (App Router, RSC)
- React 19 (Server + Client Components)
- TypeScript strict
- Tailwind v4 (همان `@tailwindcss/postcss` فعلی)
- OKLCH colors با `@property` برای انیمیشن‌ها
- `lucide-react` + `react-icons/hi2` (همان فعلی)
- `framer-motion` از طریق `src/lib/motion-shim.ts` (همان فعلی)
- shadcn/ui primitives موجود در `src/components/ui/`

**Reference spec:** `docs/superpowers/specs/2026-06-19-archive-rebuild-design.md`

---

## File Map

**Create:**
- `src/components/ds/styles/tokens.css`
- `src/components/ds/primitives/Card.tsx`
- `src/components/ds/primitives/Pill.tsx`
- `src/components/ds/primitives/Chip.tsx`
- `src/components/ds/primitives/SegmentedControl.tsx`
- `src/components/ds/primitives/SearchField.tsx`
- `src/components/ds/primitives/IconButton.tsx`
- `src/components/ds/patterns/EmptyState.tsx`
- `src/components/ds/patterns/Skeleton.tsx`
- `src/components/ds/index.ts`
- `src/app/(site)/(archives)/_components/ArchiveHero.tsx`
- `src/app/(site)/(archives)/_components/ArchiveCard.tsx`
- `src/app/(site)/(archives)/_components/ArchiveFeatured.tsx`
- `src/app/(site)/(archives)/_components/ArchiveGrid.tsx`
- `src/app/(site)/(archives)/_components/FilterRail.tsx`
- `src/app/(site)/(archives)/_components/MobileFilterSheet.tsx`
- `src/app/(site)/(archives)/_components/CommandPanel.tsx`
- `src/app/(site)/(archives)/_components/CommandTrigger.tsx`
- `src/app/(site)/(archives)/_components/ArchiveSearchInput.tsx`
- `src/app/(site)/(archives)/_components/ArchiveViewToggle.tsx`
- `src/app/(site)/(archives)/_components/ActiveFilters.tsx`

**Modify:**
- `src/app/globals.css` — اضافه کردن `@import` برای tokens، حذف قوانین v2، rename v3→ds
- `src/app/(site)/(archives)/archive/[[...slug]]/page.tsx` — به‌روزرسانی import paths
- `src/app/(site)/(archives)/loading.tsx` — استفاده از skeleton جدید

**Delete:**
- `src/app/(site)/(archives)/ModalCategories.tsx`
- `src/app/(site)/(archives)/ModalTags.tsx`
- `src/app/(site)/(archives)/ArchiveFilterListBoxClient.tsx`
- `src/app/(site)/(archives)/ArchiveCardV3.tsx` (بعد از migrate به `ArchiveCard.tsx`)
- `src/app/(site)/(archives)/ArchiveFeaturedV3.tsx` (بعد از migrate)
- `src/app/(site)/(archives)/ActiveFilters.tsx` در root (بعد از migrate)
- `src/app/(site)/(archives)/AnimatedPostGridV3.tsx` (تبدیل به `ArchiveGrid.tsx` در `_components/`)
- `src/app/(site)/(archives)/ArchiveFilterListBoxClient.tsx` (تکرار، حذف)

---

## Task 1: Design Tokens Foundation (CSS Variables)

**Files:**
- Create: `src/components/ds/styles/tokens.css`

- [ ] **Step 1: ایجاد دایرکتوری DS**

```bash
mkdir -p src/components/ds/styles
mkdir -p src/components/ds/primitives
mkdir -p src/components/ds/patterns
```

- [ ] **Step 2: نوشتن `tokens.css`**

ایجاد فایل `src/components/ds/styles/tokens.css` با محتوای زیر:

```css
/* ============================================================================
   Design System Tokens — Linear × Vercel × Stripe (low-saturation)
   ----------------------------------------------------------------------------
   همه‌ی رنگ‌ها OKLCH. Spacing/Typography fluid با clamp().
   این فایل پایه‌ی همه‌ی کامپوننت‌های DS است. هرگز hardcode نکنید.
   ============================================================================ */

:root {
  /* Spacing (fluid) */
  --ds-space-1: clamp(0.25rem, 0.2rem + 0.2vw, 0.375rem);
  --ds-space-2: clamp(0.5rem, 0.4rem + 0.4vw, 0.75rem);
  --ds-space-3: clamp(0.75rem, 0.6rem + 0.6vw, 1rem);
  --ds-space-4: clamp(1rem, 0.8rem + 0.8vw, 1.5rem);
  --ds-space-5: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  --ds-space-6: clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem);
  --ds-space-8: clamp(2rem, 1.5rem + 2vw, 3rem);
  --ds-space-10: clamp(2.5rem, 2rem + 2.5vw, 3.75rem);

  /* Typography (fluid) */
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

  /* Radius */
  --ds-radius-sm: 0.5rem;
  --ds-radius-md: 0.75rem;
  --ds-radius-lg: 1rem;
  --ds-radius-xl: 1.25rem;
  --ds-radius-2xl: 1.5rem;
  --ds-radius-full: 9999px;

  /* Light mode colors */
  --ds-canvas: oklch(99% 0.003 240);
  --ds-canvas-subtle: oklch(97% 0.005 240);
  --ds-surface: oklch(100% 0 0 / 0.7);
  --ds-surface-elevated: oklch(100% 0 0 / 0.85);
  --ds-surface-recessed: oklch(96% 0.005 240 / 0.6);

  --ds-text-primary: oklch(20% 0.01 240);
  --ds-text-secondary: oklch(45% 0.01 240);
  --ds-text-muted: oklch(55% 0.01 240);
  --ds-text-inverse: oklch(98% 0.005 240);

  --ds-border-subtle: oklch(92% 0.005 240 / 0.6);
  --ds-border-default: oklch(90% 0.005 240 / 0.8);
  --ds-border-strong: oklch(82% 0.01 240 / 0.9);

  /* Brand */
  --ds-brand-50: oklch(95% 0.04 240);
  --ds-brand-100: oklch(92% 0.05 240);
  --ds-brand-500: oklch(55% 0.10 235);
  --ds-brand-600: oklch(48% 0.11 235);
  --ds-brand-700: oklch(40% 0.12 235);

  /* Accents (low-saturation) */
  --ds-accent-amber: oklch(72% 0.13 70);
  --ds-accent-emerald: oklch(60% 0.10 165);
  --ds-accent-rose: oklch(60% 0.13 20);
  --ds-accent-violet: oklch(58% 0.13 290);
  --ds-accent-slate: oklch(60% 0.02 250);

  /* Effects */
  --ds-shadow-sm: 0 1px 2px oklch(20% 0.01 240 / 0.04);
  --ds-shadow-md: 0 4px 12px -4px oklch(20% 0.01 240 / 0.10);
  --ds-shadow-lg: 0 18px 50px -20px oklch(45% 0.10 250 / 0.35);
  --ds-glow-brand: 0 0 0 1px oklch(55% 0.10 235 / 0.4),
                   0 8px 24px -8px oklch(55% 0.10 235 / 0.35);

  /* Motion */
  --ds-ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1);
  --ds-ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ds-duration-fast: 180ms;
  --ds-duration-base: 280ms;
  --ds-duration-slow: 420ms;
  --ds-duration-page: 600ms;
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

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Import در `globals.css`**

Modify `src/app/globals.css` — اول فایل، بعد از `@import "tailwindcss";` اضافه کن:

```css
@import "./components/ds/styles/tokens.css";
```

- [ ] **Step 4: بررسی build**

Run: `npm run build 2>&1 | head -40`
Expected: build موفق، tokens لود می‌شوند (هیچ CSS variable undefined نیست چون فعلاً استفاده نمی‌شود).

- [ ] **Step 5: Commit**

```bash
git add src/components/ds/styles/tokens.css src/app/globals.css
git commit -m "feat(ds): add design tokens (OKLCH, fluid spacing/type, dark mode)"
```

---

## Task 2: DS Primitive — Card

**Files:**
- Create: `src/components/ds/primitives/Card.tsx`

- [ ] **Step 1: نوشتن Card component**

ایجاد فایل `src/components/ds/primitives/Card.tsx`:

```typescript
import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** محتوای اصلی */
  children: ReactNode;
  /** کلاس‌های اضافی */
  className?: string;
  /** نوع کارت (برای variant) */
  variant?: 'default' | 'featured' | 'list';
  /** آیا reveal animation فعال باشد */
  reveal?: boolean;
}

/**
 * Card — پایه‌ای‌ترین primitive.
 * - conic ring hover effect
 * - glassmorphism
 * - container queries
 * - logical properties (RTL-safe)
 */
const Card = forwardRef<HTMLElement, CardProps>(
  ({ children, className = '', variant = 'default', reveal = false, ...rest }, ref) => {
    const variantClass = variant === 'featured' ? 'ds-card--featured' : '';
    const revealAttr = reveal ? { 'data-ds-reveal': '' } : {};
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: card root; interactive children manage their own events
      <article
        ref={ref}
        className={`ds-card ${variantClass} ${className}`.trim()}
        {...revealAttr}
        {...rest}
      >
        {children}
      </article>
    );
  },
);

Card.displayName = 'Card';
export default Card;
```

- [ ] **Step 2: Commit (بدون تست build چون CSS هنوز نیست)**

```bash
git add src/components/ds/primitives/Card.tsx
git commit -m "feat(ds): add Card primitive (forwardRef, variant, reveal)"
```

> ⚠️ CSS `.ds-card` در Task 6 اضافه می‌شود.

---

## Task 3: DS Primitive — Pill

**Files:**
- Create: `src/components/ds/primitives/Pill.tsx`

- [ ] **Step 1: نوشتن Pill component**

ایجاد فایل `src/components/ds/primitives/Pill.tsx`:

```typescript
import { type ReactNode, forwardRef } from 'react';

export type PillVariant = 'default' | 'primary' | 'accent';

export interface PillProps {
  children: ReactNode;
  icon?: ReactNode;
  variant?: PillVariant;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}

/**
 * Pill — تگ قابل‌حذف برای ActiveFilters.
 * - variant: default (خنثی) | primary (brand) | accent (هشدار/حذف)
 * - اختیاری: icon + remove button
 */
const Pill = forwardRef<HTMLDivElement, PillProps>(
  ({ children, icon, variant = 'default', onRemove, removeLabel = 'حذف', className = '' }, ref) => {
    const variantClass = variant !== 'default' ? `ds-pill--${variant}` : '';
    return (
      <div ref={ref} className={`ds-pill ${variantClass} ${className}`.trim()}>
        {icon ? <span className="ds-pill__icon">{icon}</span> : null}
        <span className="ds-pill__label">{children}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="ds-pill__remove"
            aria-label={removeLabel}
          >
            ×
          </button>
        ) : null}
      </div>
    );
  },
);

Pill.displayName = 'Pill';
export default Pill;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ds/primitives/Pill.tsx
git commit -m "feat(ds): add Pill primitive (variant, icon, remove)"
```

---

## Task 4: DS Primitive — Chip

**Files:**
- Create: `src/components/ds/primitives/Chip.tsx`

- [ ] **Step 1: نوشتن Chip component**

ایجاد فایل `src/components/ds/primitives/Chip.tsx`:

```typescript
import { type ReactNode, forwardRef } from 'react';

export type ChipAccent = 'slate' | 'emerald' | 'amber' | 'rose' | 'violet' | 'brand';

export interface ChipProps {
  children: ReactNode;
  icon?: ReactNode;
  accent?: ChipAccent;
  className?: string;
}

/**
 * Chip — eyebrow chip با accent رنگی.
 * - استفاده در Hero (eyebrow)، quick-pick suggestions
 * - accent رنگ پس‌زمینه‌ی gradient را تعیین می‌کند
 */
const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ children, icon, accent = 'slate', className = '' }, ref) => {
    const accentClass = accent !== 'slate' ? `ds-chip--${accent}` : '';
    return (
      <span ref={ref} className={`ds-chip ${accentClass} ${className}`.trim()}>
        {icon ? <span className="ds-chip__icon">{icon}</span> : null}
        <span>{children}</span>
      </span>
    );
  },
);

Chip.displayName = 'Chip';
export default Chip;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ds/primitives/Chip.tsx
git commit -m "feat(ds): add Chip primitive (6 accents)"
```

---

## Task 5: DS Primitives — SegmentedControl, SearchField, IconButton

**Files:**
- Create: `src/components/ds/primitives/SegmentedControl.tsx`
- Create: `src/components/ds/primitives/SearchField.tsx`
- Create: `src/components/ds/primitives/IconButton.tsx`

- [ ] **Step 1: نوشتن SegmentedControl**

ایجاد `src/components/ds/primitives/SegmentedControl.tsx`:

```typescript
'use client';

import { type ReactNode, useCallback } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * SegmentedControl — single-select tab-like control.
 * - role="tablist" + role="tab" + aria-selected
 * - keyboard navigation با Arrow keys
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedControlProps<T>) {
  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = options[(idx + dir + options.length) % options.length];
        onChange(next.value);
        const btn = e.currentTarget.parentElement?.children[idx + dir] as HTMLButtonElement;
        btn?.focus();
      }
    },
    [onChange, options],
  );

  return (
    <div className={`ds-segmented ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {options.map((opt, i) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'true' : undefined}
            className="ds-segmented__item"
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKey(e, i)}
            title={typeof opt.label === 'string' ? opt.label : undefined}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: نوشتن SearchField**

ایجاد `src/components/ds/primitives/SearchField.tsx`:

```typescript
'use client';

import { type FormEvent, type ReactNode, useCallback, useRef, useState } from 'react';

export interface SearchFieldProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  inputId?: string;
  debounceMs?: number;
}

/**
 * SearchField — ورودی جستجو با debounce اختیاری.
 * - کنترل کامل توسط parent (value/onChange/onSubmit)
 * - اگر debounceMs > 0 و onSubmit داده شده، onSubmit بعد از debounce فراخوانی می‌شود
 */
export default function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = 'جستجو…',
  ariaLabel = 'جستجو',
  leadingIcon,
  trailing,
  className = '',
  inputId = 'ds-search-field',
  debounceMs = 0,
}: SearchFieldProps) {
  const [internal, setInternal] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (next: string) => {
      setInternal(next);
      onChange(next);
      if (debounceMs > 0 && onSubmit) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => onSubmit(next), debounceMs);
      }
    },
    [debounceMs, onChange, onSubmit],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSubmit?.(internal);
    },
    [internal, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className={`ds-search-field ${className}`.trim()} role="search">
      {leadingIcon ? <span className="ds-search-field__icon">{leadingIcon}</span> : null}
      <input
        id={inputId}
        type="search"
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        className="ds-search-field__input"
      />
      {trailing ? <span className="ds-search-field__trailing">{trailing}</span> : null}
    </form>
  );
}
```

- [ ] **Step 3: نوشتن IconButton**

ایجاد `src/components/ds/primitives/IconButton.tsx`:

```typescript
import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * IconButton — دکمه‌ی square فقط با آیکون.
 * - aria-label اجباری (screen reader)
 * - focus ring واضح
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', className = '', ...rest }, ref) => {
    const sizeClass = size === 'sm' ? 'ds-icon-btn--sm' : '';
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={`ds-icon-btn ${sizeClass} ds-focus ${className}`.trim()}
        {...rest}
      >
        {icon}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
export default IconButton;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ds/primitives/
git commit -m "feat(ds): add SegmentedControl, SearchField, IconButton primitives"
```

---

## Task 6: DS Patterns — EmptyState, Skeleton

**Files:**
- Create: `src/components/ds/patterns/EmptyState.tsx`
- Create: `src/components/ds/patterns/Skeleton.tsx`

- [ ] **Step 1: نوشتن EmptyState**

ایجاد `src/components/ds/patterns/EmptyState.tsx`:

```typescript
import { Inbox } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

/**
 * EmptyState — حالت خالی برای لیست‌ها.
 * - icon پیش‌فرض: Inbox (lucide)
 * - اختیاری: CTA در پایین
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`ds-empty ${className}`.trim()} role="status">
      <div className="ds-empty__icon" aria-hidden>
        {icon ?? <Inbox className="w-12 h-12" strokeWidth={1.5} />}
      </div>
      <h3 className="ds-empty__title">{title}</h3>
      {description ? <p className="ds-empty__description">{description}</p> : null}
      {action ? (
        <Link href={action.href} className="ds-empty__action">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: نوشتن Skeleton**

ایجاد `src/components/ds/patterns/Skeleton.tsx`:

```typescript
import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
  /** اگر true، کل Skeleton بزرگ parent را پر می‌کند */
  block?: boolean;
}

/**
 * Skeleton — جای‌گزین loading با انیمیشن شیمر.
 * - color از token (var(--ds-border-subtle) + overlay)
 * - prefers-reduced-motion → انیمیشن غیرفعال
 */
export default function Skeleton({
  width,
  height,
  radius = 'var(--ds-radius-md)',
  className = '',
  block = false,
}: SkeletonProps) {
  const style: CSSProperties = {
    width: block ? '100%' : width,
    height: block ? '100%' : height,
    borderRadius: radius,
  };
  return (
    <div
      className={`ds-skeleton ${className}`.trim()}
      style={style}
      aria-hidden
      role="presentation"
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ds/patterns/
git commit -m "feat(ds): add EmptyState and Skeleton patterns"
```

---

## Task 7: DS Index (re-exports)

**Files:**
- Create: `src/components/ds/index.ts`

- [ ] **Step 1: نوشتن index.ts**

ایجاد `src/components/ds/index.ts`:

```typescript
// Primitives
export { default as Card } from './primitives/Card';
export type { CardProps } from './primitives/Card';

export { default as Pill } from './primitives/Pill';
export type { PillProps, PillVariant } from './primitives/Pill';

export { default as Chip } from './primitives/Chip';
export type { ChipProps, ChipAccent } from './primitives/Chip';

export { default as SegmentedControl } from './primitives/SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './primitives/SegmentedControl';

export { default as SearchField } from './primitives/SearchField';
export type { SearchFieldProps } from './primitives/SearchField';

export { default as IconButton } from './primitives/IconButton';
export type { IconButtonProps } from './primitives/IconButton';

// Patterns
export { default as EmptyState } from './patterns/EmptyState';
export type { EmptyStateProps } from './patterns/EmptyState';

export { default as Skeleton } from './patterns/Skeleton';
export type { SkeletonProps } from './patterns/Skeleton';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ds/index.ts
git commit -m "feat(ds): add index re-exports"
```

---

## Task 8: CSS Layer — DS Base Classes

**Files:**
- Modify: `src/app/globals.css` (append در `@layer utilities`)

- [ ] **Step 1: اضافه کردن DS CSS به `globals.css`**

Modify `src/app/globals.css` — در انتهای `@layer utilities { ... }` (قبل از بسته شدن لایه)، اضافه کن:

```css
  /* ============================================================================
     Design System — پایه‌ی همه‌ی کامپوننت‌ها
     ============================================================================ */

  /* Card */
  .ds-card {
    container-type: inline-size;
    container-name: dsCard;
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: var(--ds-radius-xl);
    overflow: clip;
    background: var(--ds-surface);
    border: 1px solid var(--ds-border-subtle);
    box-shadow: var(--ds-shadow-sm);
    backdrop-filter: blur(10px) saturate(1.3);
    transition:
      transform var(--ds-duration-slow) var(--ds-ease-out-quart),
      box-shadow var(--ds-duration-slow) var(--ds-ease-out-quart),
      border-color var(--ds-duration-slow) var(--ds-ease-out-quart);
  }
  .ds-card::before {
    content: "";
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1px;
    background: conic-gradient(
      from 180deg,
      oklch(55% 0.10 235 / 0) 0%,
      oklch(55% 0.10 235 / 0.55) 22%,
      oklch(72% 0.13 70 / 0.5) 50%,
      oklch(55% 0.10 235 / 0.55) 78%,
      oklch(55% 0.10 235 / 0) 100%
    );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    opacity: 0;
    transition: opacity var(--ds-duration-base) var(--ds-ease-out-quart);
    pointer-events: none;
    z-index: 1;
  }
  .ds-card:hover::before,
  .ds-card:focus-within::before { opacity: 1; }
  .ds-card:hover {
    transform: translate3d(0, -4px, 0);
    box-shadow: var(--ds-shadow-lg);
  }

  /* Featured card (2-col on wide) */
  .ds-card--featured {
    border-radius: var(--ds-radius-2xl);
  }
  @media (min-width: 1024px) {
    .ds-card--featured { display: grid; grid-template-columns: 1.15fr 1fr; }
  }

  /* Card body */
  .ds-card__body {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ds-space-3);
    padding: var(--ds-space-3) var(--ds-space-4);
    flex: 1;
  }
  @container dsCard (min-width: 360px) {
    .ds-card__body { padding: var(--ds-space-4) var(--ds-space-5); gap: var(--ds-space-3); }
  }

  /* Card media */
  .ds-card__media {
    position: relative;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    background: var(--ds-surface-recessed);
    isolation: isolate;
  }
  .ds-card__media > :is(img, [data-next-image]) {
    transition: transform 700ms var(--ds-ease-out-quart);
  }
  .ds-card:hover .ds-card__media > :is(img, [data-next-image]) { transform: scale(1.04); }
  .ds-card__media-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 50%, oklch(20% 0.02 250 / 0.55) 100%);
    opacity: 0.5;
    z-index: 2;
  }

  /* Card title */
  .ds-card__title {
    font-size: var(--ds-text-lg);
    line-height: var(--ds-leading-snug);
    font-weight: var(--ds-weight-bold);
    color: var(--ds-text-primary);
    text-wrap: balance;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color var(--ds-duration-fast) var(--ds-ease-out-quart);
  }
  .ds-card:hover .ds-card__title { color: var(--ds-brand-600); }
  @container dsCard (min-width: 420px) {
    .ds-card__title { font-size: var(--ds-text-xl); }
  }

  /* Card excerpt */
  .ds-card__excerpt {
    font-size: var(--ds-text-sm);
    line-height: var(--ds-leading-normal);
    color: var(--ds-text-secondary);
    text-wrap: pretty;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Card footer (meta + actions) */
  .ds-card__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ds-space-3);
    margin-block-start: auto;
    padding-block-start: var(--ds-space-2);
    border-block-start: 1px solid var(--ds-border-subtle);
    font-size: var(--ds-text-xs);
    color: var(--ds-text-muted);
  }
  .ds-card__foot-meta {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-2);
    min-inline-size: 0;
  }
  .ds-card__foot-meta svg { color: var(--ds-brand-500); }
  .ds-card__foot-actions { display: inline-flex; align-items: center; gap: var(--ds-space-3); }

  /* CTA chip */
  .ds-cta {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-2);
    align-self: flex-start;
    padding: var(--ds-space-2) var(--ds-space-3);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-text-xs);
    font-weight: var(--ds-weight-semibold);
    color: var(--ds-brand-600);
    background: color-mix(in oklch, var(--ds-brand-500), var(--ds-canvas) 85%);
    border: 1px solid color-mix(in oklch, var(--ds-brand-500), var(--ds-canvas) 70%);
    transition: all var(--ds-duration-fast) var(--ds-ease-out-quart);
  }
  .ds-cta:hover {
    gap: var(--ds-space-3);
    background: var(--ds-brand-500);
    color: var(--ds-text-inverse);
    border-color: var(--ds-brand-500);
  }

  /* Badge (on media) */
  .ds-badge {
    position: absolute;
    z-index: 3;
    inset-inline-start: var(--ds-space-3);
    inset-block-start: var(--ds-space-3);
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-1);
    padding: var(--ds-space-1) var(--ds-space-2);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-text-xs);
    font-weight: var(--ds-weight-semibold);
    color: var(--ds-text-inverse);
    background: oklch(20% 0.01 240 / 0.78);
    border: 1px solid oklch(40% 0.02 240 / 0.6);
    backdrop-filter: blur(8px) saturate(1.4);
    white-space: nowrap;
  }
  .ds-badge--type {
    inset-inline-start: auto;
    inset-inline-end: var(--ds-space-3);
  }

  /* Pill */
  .ds-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-1);
    padding: var(--ds-space-1) var(--ds-space-3);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-text-xs);
    font-weight: var(--ds-weight-semibold);
    color: var(--ds-text-primary);
    background: var(--ds-surface-elevated);
    border: 1px solid var(--ds-border-default);
    transition: all var(--ds-duration-fast) var(--ds-ease-out-quart);
  }
  .ds-pill--primary {
    color: var(--ds-brand-600);
    background: var(--ds-brand-50);
    border-color: color-mix(in oklch, var(--ds-brand-500), transparent 70%);
  }
  .ds-pill--accent {
    color: var(--ds-accent-rose);
    background: color-mix(in oklch, var(--ds-accent-rose), var(--ds-canvas) 90%);
    border-color: color-mix(in oklch, var(--ds-accent-rose), transparent 80%);
  }
  .ds-pill__label { max-inline-size: 14rem; overflow: hidden; text-overflow: ellipsis; }
  .ds-pill__remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 1rem;
    block-size: 1rem;
    border-radius: var(--ds-radius-full);
    color: inherit;
    opacity: 0.6;
    transition: opacity var(--ds-duration-fast);
  }
  .ds-pill__remove:hover { opacity: 1; }

  /* Chip */
  .ds-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-1);
    padding: var(--ds-space-1) var(--ds-space-3);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-text-xs);
    font-weight: var(--ds-weight-semibold);
    color: var(--ds-text-secondary);
    background: var(--ds-surface-elevated);
    border: 1px solid var(--ds-border-subtle);
  }
  .ds-chip__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    border-radius: var(--ds-radius-full);
    color: white;
    background: var(--ds-accent-slate);
  }
  .ds-chip--emerald .ds-chip__icon { background: linear-gradient(135deg, var(--ds-accent-emerald), color-mix(in oklch, var(--ds-accent-emerald), black 30%)); }
  .ds-chip--amber .ds-chip__icon { background: linear-gradient(135deg, var(--ds-accent-amber), color-mix(in oklch, var(--ds-accent-amber), black 30%)); }
  .ds-chip--rose .ds-chip__icon { background: linear-gradient(135deg, var(--ds-accent-rose), color-mix(in oklch, var(--ds-accent-rose), black 30%)); }
  .ds-chip--violet .ds-chip__icon { background: linear-gradient(135deg, var(--ds-accent-violet), color-mix(in oklch, var(--ds-accent-violet), black 30%)); }
  .ds-chip--brand .ds-chip__icon { background: linear-gradient(135deg, var(--ds-brand-500), var(--ds-brand-700)); }

  /* Segmented */
  .ds-segmented {
    display: inline-flex;
    align-items: center;
    padding: 3px;
    border-radius: var(--ds-radius-md);
    background: var(--ds-surface-recessed);
    border: 1px solid var(--ds-border-subtle);
    gap: 2px;
  }
  .ds-segmented__item {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-1);
    padding: var(--ds-space-1) var(--ds-space-3);
    border-radius: calc(var(--ds-radius-md) - 2px);
    font-size: var(--ds-text-xs);
    font-weight: var(--ds-weight-semibold);
    color: var(--ds-text-secondary);
    background: transparent;
    border: 0;
    transition: all var(--ds-duration-fast) var(--ds-ease-out-quart);
  }
  .ds-segmented__item[aria-selected="true"] {
    color: var(--ds-text-primary);
    background: var(--ds-surface-elevated);
    box-shadow: var(--ds-shadow-sm);
  }
  .ds-segmented__item:hover:not([aria-selected="true"]) {
    color: var(--ds-text-primary);
  }

  /* Search Field */
  .ds-search-field {
    display: inline-flex;
    align-items: center;
    inline-size: 100%;
    block-size: 2.5rem;
    padding-inline: var(--ds-space-3);
    gap: var(--ds-space-2);
    border-radius: var(--ds-radius-md);
    background: var(--ds-surface-recessed);
    border: 1px solid var(--ds-border-subtle);
    transition: border-color var(--ds-duration-fast);
  }
  .ds-search-field:focus-within { border-color: var(--ds-brand-500); }
  .ds-search-field__icon { color: var(--ds-text-muted); display: inline-flex; }
  .ds-search-field__input {
    flex: 1;
    min-inline-size: 0;
    border: 0;
    background: transparent;
    font-size: var(--ds-text-sm);
    color: var(--ds-text-primary);
    outline: none;
  }
  .ds-search-field__input::placeholder { color: var(--ds-text-muted); }
  .ds-search-field__trailing { display: inline-flex; align-items: center; }

  /* IconButton */
  .ds-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    border-radius: var(--ds-radius-md);
    color: var(--ds-text-secondary);
    background: transparent;
    border: 1px solid transparent;
    transition: all var(--ds-duration-fast) var(--ds-ease-out-quart);
  }
  .ds-icon-btn:hover { background: var(--ds-surface-recessed); color: var(--ds-text-primary); }
  .ds-icon-btn--sm { inline-size: 1.75rem; block-size: 1.75rem; }

  /* Focus ring */
  .ds-focus:focus-visible {
    outline: 2px solid var(--ds-brand-500);
    outline-offset: 2px;
  }

  /* Skeleton (شیمر) */
  .ds-skeleton {
    position: relative;
    background: var(--ds-surface-recessed);
    overflow: hidden;
  }
  .ds-skeleton::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in oklch, var(--ds-canvas), transparent 50%) 50%,
      transparent 100%
    );
    animation: ds-shimmer 1.6s ease-in-out infinite;
  }
  @keyframes ds-shimmer {
    from { transform: translateX(-100%); }
    to { transform: translateX(100%); }
  }

  /* Empty state */
  .ds-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--ds-space-8) var(--ds-space-4);
    color: var(--ds-text-muted);
  }
  .ds-empty__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 4rem;
    block-size: 4rem;
    border-radius: var(--ds-radius-2xl);
    background: var(--ds-surface-recessed);
    color: var(--ds-text-muted);
    margin-block-end: var(--ds-space-4);
  }
  .ds-empty__title {
    font-size: var(--ds-text-lg);
    font-weight: var(--ds-weight-bold);
    color: var(--ds-text-primary);
    margin: 0;
  }
  .ds-empty__description {
    font-size: var(--ds-text-sm);
    margin-block-start: var(--ds-space-2);
    max-inline-size: 32ch;
  }
  .ds-empty__action {
    margin-block-start: var(--ds-space-5);
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-2);
    padding: var(--ds-space-2) var(--ds-space-4);
    border-radius: var(--ds-radius-md);
    background: var(--ds-brand-500);
    color: var(--ds-text-inverse);
    font-size: var(--ds-text-sm);
    font-weight: var(--ds-weight-semibold);
    transition: background var(--ds-duration-fast);
  }
  .ds-empty__action:hover { background: var(--ds-brand-600); }

  /* Reveal animation */
  [data-ds-reveal] {
    animation: ds-reveal-in var(--ds-duration-page) var(--ds-ease-out-quart) both;
  }
  @keyframes ds-reveal-in {
    from { opacity: 0; transform: translate3d(0, 12px, 0); }
    to   { opacity: 1; transform: translate3d(0, 0, 0); }
  }
```

- [ ] **Step 2: Build & lint**

Run: `npm run build 2>&1 | tail -20`
Expected: build موفق.

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: بدون error.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ds): add DS base CSS (Card, Pill, Chip, Segmented, SearchField, Empty, Skeleton)"
```

---

## Task 9: Archive Hero (Refactored)

**Files:**
- Create: `src/app/(site)/(archives)/_components/ArchiveHero.tsx`

- [ ] **Step 1: ایجاد دایرکتوری `_components` و انتقال فایل**

```bash
mkdir -p "src/app/(site)/(archives)/_components"
```

- [ ] **Step 2: نوشتن ArchiveHero جدید**

ایجاد `src/app/(site)/(archives)/_components/ArchiveHero.tsx`:

```typescript
import { SafeImage } from '@/components/SafeImage';
import { Chip } from '@/components/ds';
import { getPostLink } from '@/lib/getPostLink';
import type { TaxonomyType } from '@/types/types';
import { FolderOpen, Hash } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import {
  HiArrowTrendingUp,
  HiOutlineCalendarDays,
  HiOutlineDocumentText,
  HiOutlineRectangleStack,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';

/**
 * ArchiveHero — هیروی editorial صفحه آرشیو
 * - Bento grid برای metric‌ها
 * - conic ring دور thumbnail
 * - progress bar (currentPage / totalPages)
 * - quick-pick chips فقط در حالت default
 */
type Props = {
  total: number;
  currentPage: number;
  totalPages: number;
  selectedCategory?: TaxonomyType | null;
  selectedSubcategory?: TaxonomyType | null;
  selectedTag?: TaxonomyType | null;
  quickPickCategories: TaxonomyType[];
  trendingTags: TaxonomyType[];
  defaultImage: string;
};

function formatNumberFa(n: number) {
  return n.toLocaleString('fa-IR');
}

function ArchiveHero({
  total,
  currentPage,
  totalPages,
  selectedCategory,
  selectedSubcategory,
  selectedTag,
  quickPickCategories,
  trendingTags,
  defaultImage,
}: Props) {
  const heading = selectedSubcategory
    ? selectedSubcategory.name
    : selectedCategory
      ? selectedCategory.name
      : selectedTag
        ? selectedTag.name
        : 'گنجینه مقالات';

  const eyebrowAccent: 'violet' | 'slate' | 'emerald' | 'brand' = selectedSubcategory
    ? 'violet'
    : selectedCategory
      ? 'slate'
      : selectedTag
        ? 'emerald'
        : 'brand';

  const eyebrowLabel = selectedSubcategory
    ? 'زیرگروه'
    : selectedCategory
      ? 'دسته‌بندی'
      : selectedTag
        ? 'برچسب'
        : 'آرشیو کامل';

  const EyebrowIcon = selectedSubcategory
    ? HiOutlineRectangleStack
    : selectedCategory
      ? FolderOpen
      : selectedTag
        ? Hash
        : HiOutlineDocumentText;

  const lead = selectedSubcategory
    ? `تازه‌ترین تحلیل‌ها و یادداشت‌های تخصصی در ${selectedSubcategory.name}.`
    : selectedCategory
      ? `مجموعه‌ای گزینش‌شده از مقالات ${selectedCategory.name}، از تحلیل تا آموزش.`
      : selectedTag
        ? `هر آنچه درباره ${selectedTag.name} نوشته‌ایم، یکجا و دسته‌بندی‌شده.`
        : 'از بازارهای مالی تا فناوری، از اقتصاد کلان تا استراتژی‌های سرمایه‌گذاری.';

  const progress = totalPages > 1 ? Math.min(Math.max(currentPage / totalPages, 0), 1) : 0;

  return (
    <header className="archive-hero">
      <div
        className="archive-hero__progress"
        aria-hidden
        style={{ ['--archive-progress' as string]: String(progress) }}
      />
      <span className="archive-hero__orb archive-hero__orb--a" aria-hidden />
      <span className="archive-hero__orb archive-hero__orb--b" aria-hidden />
      <div className="archive-hero__mesh" aria-hidden>
        <div className="archive-hero__mesh-dots" />
      </div>

      <div className="archive-hero__inner">
        <div className="archive-hero__head">
          <div className="archive-hero__thumb-ring">
            <div className="archive-hero__thumb">
              <SafeImage
                src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                alt={heading}
                ratio="1/1"
                containerClassName="absolute inset-0"
                sizes="(min-width: 1024px) 120px, (min-width: 640px) 104px, 88px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="archive-hero__copy">
            <Chip accent={eyebrowAccent} icon={<EyebrowIcon className="w-3.5 h-3.5" />}>
              {eyebrowLabel}
            </Chip>
            {selectedCategory ? (
              <span className="archive-hero__breadcrumb">
                <span aria-hidden className="opacity-50">/</span>
                <span>{selectedCategory.name}</span>
              </span>
            ) : null}

            <h1 className="archive-hero__title">{heading}</h1>
            <p className="archive-hero__lead">{lead}</p>

            {quickPickCategories.length > 0 && !selectedCategory ? (
              <div className="archive-quickpick">
                <span className="archive-quickpick__label">
                  <HiArrowTrendingUp className="w-3.5 h-3.5" aria-hidden />
                  <span>دسترسی سریع</span>
                </span>
                {quickPickCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/archive/category/${cat.slug}`}
                    className="ds-suggestion"
                  >
                    <span className="ds-suggestion__icon">
                      <FolderOpen className="w-3 h-3" />
                    </span>
                    <span className="truncate max-w-[10rem]">{cat.name}</span>
                    {typeof cat.count === 'number' ? (
                      <span className="ds-suggestion__count">{formatNumberFa(cat.count)}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="archive-bento">
          <div className="ds-metric">
            <span className="ds-metric__icon" aria-hidden>
              <HiOutlineDocumentText className="w-4 h-4" />
            </span>
            <span className="ds-metric__body">
              <span className="ds-metric__num">{formatNumberFa(total)}</span>
              <span className="ds-metric__label">مقاله در آرشیو</span>
            </span>
          </div>

          {selectedCategory?.childCategories?.length ? (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--violet" aria-hidden>
                <HiOutlineSquares2X2 className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">
                  {formatNumberFa(selectedCategory.childCategories.length)}
                </span>
                <span className="ds-metric__label">زیرگروه فعال</span>
              </span>
            </div>
          ) : trendingTags.length > 0 ? (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--emerald" aria-hidden>
                <HiOutlineSparkles className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">{formatNumberFa(trendingTags.length)}</span>
                <span className="ds-metric__label">برچسب پرطرفدار</span>
              </span>
            </div>
          ) : (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--amber" aria-hidden>
                <HiOutlineSparkles className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">به‌روز</span>
                <span className="ds-metric__label">محتوای تازه</span>
              </span>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--amber" aria-hidden>
                <HiArrowTrendingUp className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">
                  {formatNumberFa(currentPage)}
                  <span className="opacity-50 text-sm mx-0.5">/</span>
                  {formatNumberFa(totalPages)}
                </span>
                <span className="ds-metric__label">صفحه‌ی فعلی</span>
              </span>
            </div>
          ) : (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--rose" aria-hidden>
                <HiOutlineCalendarDays className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">امروز</span>
                <span className="ds-metric__label">آخرین به‌روزرسانی</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default ArchiveHero;
```

> **نکته**: متد `SafeImage` باید با `ratio` کار کند. اگر signature فعلی فقط `string` قبول می‌کند، cast لازم است. در تست build بررسی می‌شود.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/(archives)/_components/ArchiveHero.tsx"
git commit -m "feat(archive): refactor ArchiveHero to use DS tokens & Chip"
```

---

## Task 10: Archive Card (Refactored + Rename)

**Files:**
- Create: `src/app/(site)/(archives)/_components/ArchiveCard.tsx`
- Delete: `src/app/(site)/(archives)/ArchiveCardV3.tsx`

- [ ] **Step 1: نوشتن ArchiveCard جدید**

ایجاد `src/app/(site)/(archives)/_components/ArchiveCard.tsx`:

```typescript
import { Card } from '@/components/ds';
import { SafeImage } from '@/components/SafeImage';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import { FolderOpen } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import {
  HiArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineEye,
} from 'react-icons/hi2';

/**
 * کارت مقاله — نسخه‌ی بازسازی‌شده با DS
 * - منطق داده‌ها دست‌نخورده
 * - presentation فقط از tokens استفاده می‌کند
 */
export interface ArchiveCardProps {
  post: PostWithRelations;
  ratio?: '4/3' | '3/4' | '16/9' | '1/1';
  priority?: boolean;
  variant?: 'card' | 'list';
}

function formatJalaliDate(d: Date | string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return '';
  }
}

function formatCompactFa(n: number) {
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}K`;
  }
  return n.toLocaleString('fa-IR');
}

const ArchiveCard: React.FC<ArchiveCardProps> = ({
  post,
  ratio = '4/3',
  priority = false,
  variant = 'card',
}) => {
  if (!post || !post.slug) return null;

  const {
    title,
    categories,
    tags,
    createdAt,
    slug,
    postType,
    excerpt,
    featuredImage,
    author,
    viewCount,
    _count,
  } = post;
  const postLink = getPostLink(postType, slug);
  const primaryCategory = categories?.[0];
  const commentCount = _count?.comments ?? 0;
  const views = viewCount ?? 0;

  if (variant === 'list') {
    return (
      <Card variant="list" className="ds-list-row">
        <Link
          href={postLink}
          className="ds-card__media block relative focus:outline-none"
          style={{ aspectRatio: '4/3' }}
          aria-label={title}
        >
          <SafeImage
            src={featuredImage}
            alt={title || ''}
            ratio="4/3"
            containerClassName="absolute inset-0"
            sizes="(min-width: 640px) 180px, 100px"
            className="object-cover"
          />
          {primaryCategory ? (
            <span className="ds-badge">
              <FolderOpen className="w-3 h-3" aria-hidden />
              <span className="truncate max-w-[6rem]">{primaryCategory.name}</span>
            </span>
          ) : null}
        </Link>

        <div className="ds-card__body">
          <div className="ds-card__foot-meta">
            <FolderOpen className="w-3 h-3" aria-hidden />
            <span className="truncate">
              {tags
                ?.slice(0, 3)
                .map((t) => `#${t.name}`)
                .join('  ') || 'بدون برچسب'}
            </span>
          </div>

          <Link href={postLink} className="focus:outline-none focus-visible:underline underline-offset-4">
            <h3 className="ds-card__title">{title}</h3>
          </Link>

          {excerpt ? <p className="ds-card__excerpt">{excerpt}</p> : null}

          <div className="ds-card__foot">
            <div className="ds-card__foot-meta">
              {author ? (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--ds-brand-500)' }}
                    aria-hidden
                  />
                  <span className="truncate font-medium text-[var(--ds-text-primary)] max-w-[10rem]">
                    {author.name}
                  </span>
                </span>
              ) : null}
              {author ? <span aria-hidden className="opacity-40">·</span> : null}
              <time dateTime={new Date(createdAt).toISOString()} className="inline-flex items-center gap-1">
                <HiOutlineClock className="w-3 h-3" aria-hidden />
                {formatJalaliDate(createdAt)}
              </time>
            </div>
            <div className="ds-card__foot-actions">
              {commentCount > 0 ? (
                <span className="inline-flex items-center gap-1" aria-label={`${commentCount} دیدگاه`}>
                  <HiOutlineChatBubbleLeftRight className="w-3 h-3" aria-hidden />
                  {commentCount}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1" aria-label={`${views} بازدید`}>
                <HiOutlineEye className="w-3 h-3" aria-hidden />
                <span>{formatCompactFa(views)}</span>
              </span>
            </div>
          </div>

          <Link href={postLink} className="ds-cta" aria-label={`ادامه ${title}`}>
            <span>ادامه</span>
            <HiArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </Card>
    );
  }

  // variant: 'card' (default)
  return (
    <Card ratio={ratio} priority={priority} reveal>
      <Link
        href={postLink}
        className="ds-card__media block relative focus:outline-none"
        style={{ aspectRatio: ratio.replace('/', ' / ') }}
        aria-label={title}
      >
        <SafeImage
          src={featuredImage}
          alt={title || ''}
          ratio={ratio}
          containerClassName="absolute inset-0"
          sizes="(min-width: 1280px) 360px, (min-width: 768px) 33vw, 100vw"
          priority={priority}
          className="object-cover"
        />
        <div className="ds-card__media-overlay" />

        {primaryCategory ? (
          <span className="ds-badge">
            <FolderOpen className="w-3 h-3" aria-hidden />
            {primaryCategory.name}
          </span>
        ) : null}

        {postType && postType !== 'STANDARD' ? (
          <span className="ds-badge ds-badge--type">
            {postType === 'VIDEO'
              ? 'ویدیو'
              : postType === 'GALLERY'
                ? 'گالری'
                : postType === 'AUDIO'
                  ? 'صوت'
                  : postType}
          </span>
        ) : null}
      </Link>

      <div className="ds-card__body">
        {tags && tags.length > 0 ? (
          <div className="ds-card__foot-meta">
            <span className="opacity-60">#</span>
            <span className="truncate">
              {tags
                .slice(0, 3)
                .map((t) => t.name)
                .join('  ·  ')}
            </span>
          </div>
        ) : null}

        <Link href={postLink} className="focus:outline-none focus-visible:underline underline-offset-4">
          <h3 className="ds-card__title" title={title}>{title}</h3>
        </Link>

        {excerpt ? <p className="ds-card__excerpt">{excerpt}</p> : null}

        <div className="ds-card__foot">
          <div className="ds-card__foot-meta">
            {author ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--ds-brand-500)' }}
                  aria-hidden
                />
                <span className="truncate font-medium text-[var(--ds-text-primary)]">
                  {author.name}
                </span>
              </span>
            ) : null}
            {author ? <span aria-hidden className="opacity-40 shrink-0">·</span> : null}
            <time dateTime={new Date(createdAt).toISOString()} className="inline-flex items-center gap-1 shrink-0">
              <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
              {formatJalaliDate(createdAt)}
            </time>
          </div>

          <div className="ds-card__foot-actions">
            {commentCount > 0 ? (
              <span className="inline-flex items-center gap-1" aria-label={`${commentCount} دیدگاه`}>
                <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" aria-hidden />
                {commentCount}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1" aria-label={`${views} بازدید`}>
              <HiOutlineEye className="w-3.5 h-3.5" aria-hidden />
              <span>{formatCompactFa(views)}</span>
            </span>
          </div>
        </div>

        <Link href={postLink} className="ds-cta" aria-label={`ادامه مطلب ${title}`}>
          <span>ادامه مطلب</span>
          <HiArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </Card>
  );
};

export default ArchiveCard;
```

> **نکته مهم**: کامپوننت `Card` ما `ratio` و `priority` را به‌عنوان prop نمی‌پذیرد — اینها مربوط به `<Link><SafeImage>` داخل هستند نه root. در نتیجه استفاده از `<Card ratio={...} priority={...}>` در بالا اشتباه است. **اصلاح**:

```typescript
// در دو جایگاه استفاده (card و list variant):
<Card className="ds-list-row">  // list variant
<Card reveal>                    // default card variant
```

- [ ] **Step 2: اصلاح ArchiveCard (حذف propهای اضافی از Card)**

اصلاح خط `<Card ratio={ratio} priority={priority} reveal>` در default variant به:

```typescript
<Card reveal>
```

اصلاح خط `<Card variant="list" className="ds-list-row">` در list variant — این درست است.

- [ ] **Step 3: حذف فایل قدیمی**

```bash
git rm "src/app/(site)/(archives)/ArchiveCardV3.tsx"
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(site)/(archives)/_components/ArchiveCard.tsx"
git commit -m "feat(archive): refactor ArchiveCard to use DS, remove V3"
```

---

## Task 11: Archive Featured (Refactored + Rename)

**Files:**
- Create: `src/app/(site)/(archives)/_components/ArchiveFeatured.tsx`
- Delete: `src/app/(site)/(archives)/ArchiveFeaturedV3.tsx`

- [ ] **Step 1: نوشتن ArchiveFeatured جدید**

ایجاد `src/app/(site)/(archives)/_components/ArchiveFeatured.tsx`:

```typescript
import { Card } from '@/components/ds';
import { SafeImage } from '@/components/SafeImage';
import { getPostLink } from '@/lib/getPostLink';
import type { PostWithRelations } from '@/types/types';
import { FolderOpen } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import {
  HiArrowLeft,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineEye,
  HiSparkles,
} from 'react-icons/hi2';

export interface ArchiveFeaturedProps {
  post: PostWithRelations;
}

function formatJalaliDate(d: Date | string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(d));
  } catch {
    return '';
  }
}

function formatCompactFa(n: number) {
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}K`;
  }
  return n.toLocaleString('fa-IR');
}

const ArchiveFeatured: React.FC<ArchiveFeaturedProps> = ({ post }) => {
  if (!post || !post.slug) return null;

  const {
    title,
    categories,
    createdAt,
    slug,
    postType,
    excerpt,
    featuredImage,
    author,
    viewCount,
    _count,
  } = post;
  const postLink = getPostLink(postType, slug);
  const primaryCategory = categories?.[0];
  const commentCount = _count?.comments ?? 0;
  const views = viewCount ?? 0;

  return (
    <Card variant="featured" reveal className="archive-featured">
      <Link
        href={postLink}
        className="ds-card__media block relative focus:outline-none"
        aria-label={title}
      >
        <SafeImage
          src={featuredImage}
          alt={title || ''}
          ratio="16/10"
          containerClassName="absolute inset-0"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          className="object-cover"
        />
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent 60%, oklch(0% 0 0 / 0.4) 100%)',
          }}
        />

        <span
          className="ds-badge"
          style={{ insetBlockStart: 'var(--ds-space-4)', insetInlineStart: 'var(--ds-space-4)' }}
        >
          <HiSparkles className="w-3.5 h-3.5" aria-hidden />
          انتخاب سردبیر
        </span>

        {primaryCategory ? (
          <span
            className="ds-badge ds-badge--type"
            style={{ insetBlockStart: 'var(--ds-space-4)' }}
          >
            <FolderOpen className="w-3.5 h-3.5" aria-hidden />
            {primaryCategory.name}
          </span>
        ) : null}
      </Link>

      <div className="ds-card__body archive-featured__body">
        {postType && postType !== 'STANDARD' ? (
          <span
            className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              color: 'oklch(98% 0.005 240)',
              background: 'oklch(20% 0.01 240 / 0.78)',
              border: '1px solid oklch(40% 0.02 240 / 0.6)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {postType === 'VIDEO'
              ? 'ویدیو'
              : postType === 'GALLERY'
                ? 'گالری'
                : postType === 'AUDIO'
                  ? 'صوت'
                  : postType}
          </span>
        ) : null}

        <Link href={postLink} className="focus:outline-none focus-visible:underline underline-offset-4">
          <h2 className="archive-featured__title" title={title}>
            {title}
          </h2>
        </Link>

        {excerpt ? <p className="archive-featured__excerpt">{excerpt}</p> : null}

        <div className="ds-card__foot">
          <div className="ds-card__foot-meta">
            {author ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--ds-brand-500)' }}
                  aria-hidden
                />
                <span className="truncate font-medium max-w-[10rem]">{author.name}</span>
              </span>
            ) : null}
            {author ? <span aria-hidden className="opacity-40">·</span> : null}
            <time dateTime={new Date(createdAt).toISOString()} className="inline-flex items-center gap-1">
              <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
              {formatJalaliDate(createdAt)}
            </time>
          </div>
          <div className="ds-card__foot-actions">
            {commentCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" aria-hidden />
                {commentCount.toLocaleString('fa-IR')} دیدگاه
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1" aria-label={`${views} بازدید`}>
              <HiOutlineEye className="w-3.5 h-3.5" aria-hidden />
              <span>{formatCompactFa(views)} بازدید</span>
            </span>
          </div>
        </div>

        <Link href={postLink} className="ds-cta" aria-label={`ادامه مطلب ${title}`}>
          <span>ادامه مطلب</span>
          <HiArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </Card>
  );
};

export default ArchiveFeatured;
```

- [ ] **Step 2: حذف فایل قدیمی**

```bash
git rm "src/app/(site)/(archives)/ArchiveFeaturedV3.tsx"
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/(archives)/_components/ArchiveFeatured.tsx"
git commit -m "feat(archive): refactor ArchiveFeatured to use DS, remove V3"
```

---

## Task 12: Archive Grid (New Component)

**Files:**
- Create: `src/app/(site)/(archives)/_components/ArchiveGrid.tsx`
- Delete: `src/app/(site)/(archives)/AnimatedPostGridV3.tsx`

- [ ] **Step 1: نوشتن ArchiveGrid**

ایجاد `src/app/(site)/(archives)/_components/ArchiveGrid.tsx`:

```typescript
import BannerAds from '@/components/BannerADS/BannerADS';
import type { Advertisement, PostWithRelations } from '@/types/types';
import { Fragment } from 'react';
import ArchiveCard from './ArchiveCard';
import ArchiveFeatured from './ArchiveFeatured';

type Props = {
  posts: PostWithRelations[];
  betweenPostsAd?: Advertisement | null;
  /** data-archive-view را از <html> می‌خواند (grid | list) */
  view?: 'grid' | 'list';
};

/**
 * ArchiveGrid — چیدمان اصلی صفحه‌ی Archive
 * - grid mode: featured در ابتدا + auto-fit grid
 * - list mode: همه‌ی پست‌ها در یک ستون (ArchiveCard variant="list")
 * - CSS-only mode-switch با [data-archive-view] روی <html>
 */
const ArchiveGrid: React.FC<Props> = ({ posts, betweenPostsAd }) => {
  if (posts.length === 0) return null;

  const [featured, ...rest] = posts;
  const useFeatured = posts.length > 1;
  const featuredPost = useFeatured ? featured : null;
  const gridPosts = useFeatured ? rest : posts;
  const adAfterIndex = 4;

  return (
    <>
      {/* GRID VIEW */}
      <div className="archive-grid-view archive-grid">
        {featuredPost ? (
          <div className="archive-grid__featured">
            <ArchiveFeatured post={featuredPost} />
          </div>
        ) : null}
        {gridPosts.map((post, index) => (
          <Fragment key={post.id}>
            {betweenPostsAd && index === adAfterIndex ? (
              <div className="archive-grid__ad">
                <BannerAds ad={betweenPostsAd} variant="rich" />
              </div>
            ) : null}
            <ArchiveCard post={post} ratio="4/3" />
          </Fragment>
        ))}
      </div>

      {/* LIST VIEW */}
      <div className="archive-list-view">
        {posts.map((post) => (
          <ArchiveCard key={post.id} post={post} variant="list" />
        ))}
      </div>
    </>
  );
};

export default ArchiveGrid;
```

- [ ] **Step 2: حذف فایل قدیمی**

```bash
git rm "src/app/(site)/(archives)/AnimatedPostGridV3.tsx"
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/(archives)/_components/ArchiveGrid.tsx"
git commit -m "feat(archive): add ArchiveGrid (auto-fit + list mode) replacing AnimatedPostGridV3"
```

---

## Task 13: Archive Page CSS (Hero, Grid, Bento, Metric)

**Files:**
- Modify: `src/app/globals.css` (append archive-specific styles)

- [ ] **Step 1: اضافه کردن CSS های archive-specific**

در انتهای `@layer utilities { ... }`، بعد از CSS های DS، اضافه کن:

```css
  /* ============================================================================
     Archive page-specific styles
     ============================================================================ */

  /* Hero shell */
  .archive-hero {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    border-radius: var(--ds-radius-2xl);
    background:
      radial-gradient(120% 140% at 100% 0%, oklch(55% 0.10 235 / 0.12), transparent 55%),
      radial-gradient(120% 140% at 0% 100%, oklch(72% 0.13 70 / 0.10), transparent 55%),
      linear-gradient(180deg, var(--ds-canvas), var(--ds-canvas-subtle));
    border: 1px solid var(--ds-border-subtle);
    box-shadow: var(--ds-shadow-sm), 0 24px 60px -32px oklch(45% 0.08 250 / 0.35);
  }
  .archive-hero__progress {
    position: absolute;
    inset-inline: 0;
    inset-block-start: 0;
    block-size: 2px;
    background: linear-gradient(
      90deg,
      var(--ds-brand-500) 0%,
      var(--ds-brand-500) calc(var(--archive-progress, 0) * 100%),
      var(--ds-border-subtle) calc(var(--archive-progress, 0) * 100%),
      var(--ds-border-subtle) 100%
    );
    z-index: 2;
  }
  .archive-hero__orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    pointer-events: none;
    z-index: -1;
  }
  .archive-hero__orb--a {
    inset-block-start: -30%;
    inset-inline-end: -10%;
    inline-size: 38rem;
    block-size: 38rem;
    background: radial-gradient(closest-side, oklch(55% 0.10 235 / 0.18), transparent 70%);
    animation: archive-orb-drift 30s ease-in-out infinite;
  }
  .archive-hero__orb--b {
    inset-block-end: -30%;
    inset-inline-start: -10%;
    inline-size: 30rem;
    block-size: 30rem;
    background: radial-gradient(closest-side, oklch(72% 0.13 70 / 0.12), transparent 70%);
    animation: archive-orb-drift 40s ease-in-out infinite reverse;
  }
  @keyframes archive-orb-drift {
    0%, 100% { transform: translate3d(0, 0, 0); }
    50% { transform: translate3d(2%, -2%, 0); }
  }
  .archive-hero__mesh {
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image:
      linear-gradient(oklch(50% 0.02 250 / 0.04) 1px, transparent 1px),
      linear-gradient(90deg, oklch(50% 0.02 250 / 0.04) 1px, transparent 1px);
    background-size: 44px 44px;
    -webkit-mask-image: radial-gradient(120% 100% at 100% 0%, #000 0%, transparent 70%);
            mask-image: radial-gradient(120% 100% at 100% 0%, #000 0%, transparent 70%);
    pointer-events: none;
  }
  .archive-hero__inner {
    position: relative;
    padding: var(--ds-space-6) var(--ds-space-5);
    display: flex;
    flex-direction: column;
    gap: var(--ds-space-5);
  }
  @media (min-width: 768px) {
    .archive-hero__inner { padding: var(--ds-space-8); }
  }
  .archive-hero__head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ds-space-4);
  }
  @media (min-width: 768px) {
    .archive-hero__head {
      flex-direction: row;
      align-items: flex-start;
      gap: var(--ds-space-6);
    }
  }
  .archive-hero__thumb-ring {
    position: relative;
    isolation: isolate;
    flex-shrink: 0;
  }
  .archive-hero__thumb-ring::before {
    content: "";
    position: absolute;
    inset: -10%;
    border-radius: 50%;
    z-index: -1;
    background: conic-gradient(
      from 0deg,
      oklch(55% 0.10 235 / 0.5),
      oklch(72% 0.13 70 / 0.4),
      oklch(55% 0.10 235 / 0),
      oklch(72% 0.13 70 / 0.4),
      oklch(55% 0.10 235 / 0.5)
    );
    filter: blur(14px);
    opacity: 0.8;
    animation: archive-ring-spin 12s linear infinite;
  }
  @keyframes archive-ring-spin { to { transform: rotate(360deg); } }
  .archive-hero__thumb {
    position: relative;
    inline-size: clamp(88px, 6vw, 120px);
    aspect-ratio: 1;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid var(--ds-canvas);
    box-shadow: var(--ds-shadow-md);
  }
  .archive-hero__copy {
    flex: 1;
    min-inline-size: 0;
    text-align: center;
  }
  @media (min-width: 768px) {
    .archive-hero__copy { text-align: start; }
  }
  .archive-hero__breadcrumb {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-2);
    margin-inline-start: var(--ds-space-2);
    color: var(--ds-text-secondary);
    font-size: var(--ds-text-sm);
  }
  .archive-hero__title {
    font-size: var(--ds-text-4xl);
    line-height: var(--ds-leading-tight);
    font-weight: var(--ds-weight-extrabold);
    color: var(--ds-text-primary);
    text-wrap: balance;
    margin-block-start: var(--ds-space-3);
  }
  .archive-hero__lead {
    font-size: var(--ds-text-lg);
    line-height: var(--ds-leading-relaxed);
    color: var(--ds-text-secondary);
    text-wrap: pretty;
    margin-block-start: var(--ds-space-3);
    max-inline-size: 60ch;
  }
  @media (min-width: 768px) {
    .archive-hero__lead { margin-inline-start: 0; margin-inline-end: auto; }
  }
  .archive-hero__copy .archive-quickpick {
    margin-block-start: var(--ds-space-4);
  }

  /* Bento grid for metrics */
  .archive-bento {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--ds-space-3);
  }
  .ds-metric {
    display: flex;
    align-items: center;
    gap: var(--ds-space-3);
    padding: var(--ds-space-3);
    border-radius: var(--ds-radius-lg);
    background: var(--ds-surface-recessed);
    border: 1px solid var(--ds-border-subtle);
  }
  .ds-metric__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    border-radius: var(--ds-radius-md);
    color: white;
    background: linear-gradient(135deg, var(--ds-brand-500), var(--ds-brand-700));
    flex-shrink: 0;
  }
  .ds-metric__icon--emerald { background: linear-gradient(135deg, var(--ds-accent-emerald), color-mix(in oklch, var(--ds-accent-emerald), black 30%)); }
  .ds-metric__icon--amber { background: linear-gradient(135deg, var(--ds-accent-amber), color-mix(in oklch, var(--ds-accent-amber), black 30%)); }
  .ds-metric__icon--rose { background: linear-gradient(135deg, var(--ds-accent-rose), color-mix(in oklch, var(--ds-accent-rose), black 30%)); }
  .ds-metric__icon--violet { background: linear-gradient(135deg, var(--ds-accent-violet), color-mix(in oklch, var(--ds-accent-violet), black 30%)); }
  .ds-metric__body { display: flex; flex-direction: column; min-inline-size: 0; }
  .ds-metric__num { font-size: var(--ds-text-xl); font-weight: var(--ds-weight-bold); color: var(--ds-text-primary); line-height: 1; }
  .ds-metric__label { font-size: var(--ds-text-xs); color: var(--ds-text-muted); margin-block-start: 2px; }

  /* Quick pick */
  .archive-quickpick {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ds-space-2);
    justify-content: center;
  }
  @media (min-width: 768px) {
    .archive-quickpick { justify-content: flex-start; }
  }
  .archive-quickpick__label {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-1);
    font-size: var(--ds-text-xs);
    color: var(--ds-text-muted);
    font-weight: var(--ds-weight-semibold);
  }
  .ds-suggestion {
    display: inline-flex;
    align-items: center;
    gap: var(--ds-space-1);
    padding: var(--ds-space-1) var(--ds-space-2);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-text-xs);
    color: var(--ds-text-primary);
    background: var(--ds-surface-elevated);
    border: 1px solid var(--ds-border-subtle);
    transition: all var(--ds-duration-fast) var(--ds-ease-out-quart);
  }
  .ds-suggestion:hover {
    background: var(--ds-brand-50);
    border-color: var(--ds-brand-500);
  }
  .ds-suggestion__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 1rem;
    block-size: 1rem;
    color: var(--ds-brand-500);
  }
  .ds-suggestion__count {
    font-size: 10px;
    color: var(--ds-text-muted);
    padding-inline-start: var(--ds-space-1);
    border-inline-start: 1px solid var(--ds-border-subtle);
  }

  /* Grid layout */
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
  .archive-grid__featured { grid-column: 1 / -1; margin-block-end: var(--ds-space-2); }
  .archive-grid__ad { grid-column: 1 / -1; }

  /* Featured specific */
  .archive-featured__title {
    font-size: var(--ds-text-2xl);
    line-height: 1.18;
    font-weight: var(--ds-weight-extrabold);
    color: var(--ds-text-primary);
    text-wrap: balance;
  }
  .archive-featured__excerpt {
    font-size: var(--ds-text-base);
    line-height: var(--ds-leading-relaxed);
    color: var(--ds-text-secondary);
    text-wrap: pretty;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .archive-featured__body { gap: var(--ds-space-3); padding: var(--ds-space-5) var(--ds-space-5); }
  @container dsCard (min-width: 720px) {
    .archive-featured__body { padding: var(--ds-space-6); gap: var(--ds-space-4); }
  }

  /* List row */
  .ds-list-row {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: var(--ds-space-3);
    padding: var(--ds-space-3);
  }
  @media (min-width: 640px) {
    .ds-list-row { grid-template-columns: 180px 1fr; gap: var(--ds-space-4); padding: var(--ds-space-4); }
  }
  .ds-list-row:hover { background: var(--ds-surface-elevated); }

  /* List view (initially hidden) */
  .archive-list-view { display: grid; gap: var(--ds-space-3); }
  [data-archive-view="list"] .archive-grid-view { display: none; }
  [data-archive-view="grid"] .archive-list-view,
  html:not([data-archive-view="list"]) .archive-list-view { display: none; }
  [data-archive-view="list"] html:not([data-archive-view="list"]) .archive-list-view,
  html:not([data-archive-view]) .archive-list-view { display: none; }
  [data-archive-view="list"] .archive-grid-view { display: none; }
  [data-archive-view="list"] .archive-list-view { display: grid; }
  html:not([data-archive-view="list"]) .archive-list-view { display: none; }
  html:not([data-archive-view="list"]) .archive-grid-view { display: grid; }
```

- [ ] **Step 2: Build & lint**

Run: `npm run build 2>&1 | tail -20`
Expected: build موفق.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(archive): add page-specific CSS (hero, bento, grid, list)"
```

---

## Task 14: Filter Components (Refactored)

**Files:**
- Create: `src/app/(site)/(archives)/_components/FilterRail.tsx`
- Create: `src/app/(site)/(archives)/_components/CommandPanel.tsx`
- Create: `src/app/(site)/(archives)/_components/CommandTrigger.tsx`
- Create: `src/app/(site)/(archives)/_components/ArchiveSearchInput.tsx`
- Create: `src/app/(site)/(archives)/_components/ArchiveViewToggle.tsx`
- Create: `src/app/(site)/(archives)/_components/ActiveFilters.tsx`
- Create: `src/app/(site)/(archives)/_components/MobileFilterSheet.tsx`
- Delete: `src/app/(site)/(archives)/FilterRail.tsx`
- Delete: `src/app/(site)/(archives)/CommandPanel.tsx`
- Delete: `src/app/(site)/(archives)/CommandTrigger.tsx`
- Delete: `src/app/(site)/(archives)/ArchiveSearchInput.tsx`
- Delete: `src/app/(site)/(archives)/ArchiveViewToggle.tsx`
- Delete: `src/app/(site)/(archives)/ActiveFilters.tsx`
- Delete: `src/app/(site)/(archives)/MobileFilterSheet.tsx`
- Delete: `src/app/(site)/(archives)/ModalCategories.tsx`
- Delete: `src/app/(site)/(archives)/ModalTags.tsx`
- Delete: `src/app/(site)/(archives)/ArchiveFilterListBoxClient.tsx`

- [ ] **Step 1: انتقال فایل‌ها (git mv) + به‌روزرسانی import paths**

```bash
cd "src/app/(site)/(archives)"

# Move components to _components/
git mv FilterRail.tsx _components/FilterRail.tsx
git mv CommandPanel.tsx _components/CommandPanel.tsx
git mv CommandTrigger.tsx _components/CommandTrigger.tsx
git mv ArchiveSearchInput.tsx _components/ArchiveSearchInput.tsx
git mv ArchiveViewToggle.tsx _components/ArchiveViewToggle.tsx
git mv ActiveFilters.tsx _components/ActiveFilters.tsx
git mv MobileFilterSheet.tsx _components/MobileFilterSheet.tsx

# Remove dead code
git rm ModalCategories.tsx
git rm ModalTags.tsx
git rm ArchiveFilterListBoxClient.tsx
```

- [ ] **Step 2: به‌روزرسانی import ها در page.tsx**

Modify `src/app/(site)/(archives)/archive/[[...slug]]/page.tsx`:

خطوط 18-22 فعلی:
```typescript
import ActiveFilters, { type ActiveFilter } from '../../ActiveFilters';
import AnimatedPostGridV3 from '../../AnimatedPostGridV3';
import ArchiveHero from '../../ArchiveHero';
import FilterRail from '../../FilterRail';
import MobileFilterSheet from '../../MobileFilterSheet';
```

را به:
```typescript
import ActiveFilters, { type ActiveFilter } from '../../_components/ActiveFilters';
import ArchiveGrid from '../../_components/ArchiveGrid';
import ArchiveHero from '../../_components/ArchiveHero';
import FilterRail from '../../_components/FilterRail';
import MobileFilterSheet from '../../_components/MobileFilterSheet';
```

و در JSX، `<AnimatedPostGridV3 ...>` را به `<ArchiveGrid ...>` تغییر بده.

- [ ] **Step 3: به‌روزرسانی import های داخلی در _components**

بررسی کن که `FilterRail.tsx` (در `_components/`) به `CommandPanel`، `CommandTrigger`، `ArchiveSearchInput`، `ArchiveViewToggle` اشاره می‌کند. اگر import path آنها `'./ArchiveSearchInput'` باشد، الان که در همان دایرکتوری هستند نیازی به تغییر نیست. اما اگر قبلاً `from '../ArchiveSearchInput'` بود (که بعید است چون در root بودند)، باید به `'./ArchiveSearchInput'` تغییر کند.

- [ ] **Step 4: Build & test**

Run: `npm run build 2>&1 | tail -30`
Expected: build موفق. اگر import error بود، فایل‌های داخلی را بررسی کن.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(site)/(archives)/"
git commit -m "refactor(archive): move components to _components/, remove dead code"
```

---

## Task 15: Loading Skeleton (New)

**Files:**
- Modify: `src/app/(site)/(archives)/loading.tsx`

- [ ] **Step 1: نوشتن loading.tsx جدید**

ایجاد `src/app/(site)/(archives)/loading.tsx`:

```typescript
import { Skeleton } from '@/components/ds';

/**
 * Loading state برای صفحه‌ی Archive
 * - Hero skeleton + 12 card skeletons در auto-fit grid
 */
export default function ArchiveLoading() {
  return (
    <div className="nc-PageArchive max-w-full @container/archive @md/archive:overflow-x-visible">
      <div className="container mt-4 sm:mt-6 mb-6 sm:mb-8">
        <div
          className="archive-hero"
          style={{ minBlockSize: '20rem', padding: 'var(--ds-space-6)' }}
        >
          <Skeleton width="60%" height="3rem" className="mb-3" />
          <Skeleton width="80%" height="1.25rem" />
        </div>
      </div>

      <div className="container">
        <div className="archive-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="ds-card" style={{ overflow: 'hidden' }}>
              <Skeleton block height="auto" style={{ aspectRatio: '4 / 3' }} />
              <div className="ds-card__body">
                <Skeleton width="40%" height="0.875rem" />
                <Skeleton width="90%" height="1.25rem" />
                <Skeleton width="70%" height="0.875rem" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: حذف `ArchivePageSkeleton` از `Skeletons` اگر فقط این استفاده می‌شد**

بررسی کن: `grep -r "ArchivePageSkeleton" src/`  
اگر فقط در `loading.tsx` استفاده می‌شد، حذفش کن.

```bash
grep -rln "ArchivePageSkeleton" src/ 2>/dev/null
```

اگر فقط در loading.tsx بود:

```bash
# Find the file
grep -rln "ArchivePageSkeleton" src/components/Skeletons/ 2>/dev/null
# (سپس آن را از آن فایل پاک کن)
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(site)/(archives)/loading.tsx"
git commit -m "feat(archive): add loading skeleton using DS Skeleton"
```

---

## Task 16: CSS Cleanup (Remove v2, Add Aliases)

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: حذف قوانین v2 از globals.css**

با استفاده از Edit tool، خطوطی که شامل این کلاس‌ها هستند را حذف کن (یا با `replace_all: true`):

```
.arc-card, .arc-card-media, .arc-card-media-overlay, .arc-badge, .arc-card-body,
.arc-card-title, .arc-card-excerpt, .arc-card-foot, .arc-cta, .arc-fcard,
.arc-fcard-media, .arc-fcard-body, .arc-fcard-title, .arc-fcard-excerpt,
.arc-fcard-foot, .arc-fcard-pick, .arc-stat, .arc-thumb-ring
```

**استراتژی**: چون ممکن است در خطوط مختلف پراکنده باشند، ساده‌ترین کار:
1. فایل فعلی را با `Read` بخوان
2. خطوط 950-2000 (تخمینی) که شامل این کلاس‌ها هستند را با Edit حذف کن

**یا** اگر فایل خیلی بزرگ است:

```bash
# Find line numbers
grep -n "\.arc-card\b\|\.arc-fcard\b\|\.arc-stat\b\|\.arc-cta\b\|\.arc-thumb-ring\b" src/app/globals.css | head -50
```

سپس بلوک‌های مربوطه را با Edit حذف کن.

- [ ] **Step 2: اضافه کردن deprecation aliases**

در انتهای `globals.css`، بعد از همه‌ی قوانین، اضافه کن:

```css
/* ============================================================================
   DEPRECATED: backward-compat aliases (remove in next release)
   ----------------------------------------------------------------------------
   این کلاس‌ها در نسخه‌ی قبلی archive استفاده می‌شدند. اکنون با کلاس‌های
   جدید (.ds-*, .archive-*) جایگزین شده‌اند. این alias‌ها برای یک release
   نگه داشته می‌شوند تا دیگر صفحات فرصت مهاجرت داشته باشند.
   ============================================================================ */
@layer utilities {
  .arc-card { @apply ds-card; }
  .arc-card-media { @apply ds-card__media; }
  .arc-card-media-overlay { @apply ds-card__media-overlay; }
  .arc-badge { @apply ds-badge; }
  .arc-badge--type { @apply ds-badge--type; }
  .arc-card-body { @apply ds-card__body; }
  .arc-card-title { @apply ds-card__title; }
  .arc-card-excerpt { @apply ds-card__excerpt; }
  .arc-card-foot { @apply ds-card__foot; }
  .arc-cta { @apply ds-cta; }
  .arc-fcard { @apply ds-card ds-card--featured; }
  .arc-fcard-media { @apply ds-card__media; }
  .arc-fcard-body { @apply ds-card__body; }
  .arc-fcard-title { @apply archive-featured__title; }
  .arc-fcard-excerpt { @apply archive-featured__excerpt; }
  .arc-fcard-foot { @apply ds-card__foot; }
  .arc-fcard-pick { @apply ds-badge; }
  .arc-stat { @apply ds-metric; }
  .arc-thumb-ring { @apply archive-hero__thumb-ring; }
}
```

> **هشدار**: `@apply` در `@layer utilities` ممکن است در Tailwind v4 متفاوت کار کند. اگر خطا داد، استایل‌ها را مستقیم کپی کن:

```css
  .arc-card { /* کپی از .ds-card */ }
  /* ... */
```

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | tail -20`
Expected: build موفق.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor(css): remove v2 archive styles, add deprecation aliases"
```

---

## Task 17: Final Verification

**Files:** (no changes)

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors.

- [ ] **Step 2: Lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: 0 errors (warnings ممکن است).

- [ ] **Step 3: Build**

Run: `npm run build 2>&1 | tail -30`
Expected: build موفق.

- [ ] **Step 4: Manual smoke test (مستندسازی)**

فایل `docs/superpowers/verification-archive-rebuild-2026-06-19.md` ایجاد کن با محتوای زیر:

```markdown
# Archive Rebuild — Verification Checklist

**Date:** 2026-06-19  
**Branch:** main  
**Commits:** 17 tasks (هر task یک commit)

## Build
- [x] `npm run build` موفق
- [x] `npx tsc --noEmit` بدون error
- [x] `npm run lint` بدون error

## Files
- [x] `src/components/ds/` ایجاد شد (9 فایل + tokens.css)
- [x] `src/app/(site)/(archives)/_components/` ایجاد شد (11 فایل)
- [x] `src/app/(site)/(archives)/Modal{ategories,Tags}.tsx` حذف شد
- [x] `src/app/(site)/(archives)/ArchiveFilterListBoxClient.tsx` حذف شد
- [x] `src/app/(site)/(archives)/Archive{Card,Featured}V3.tsx` حذف شد
- [x] `src/app/(site)/(archives)/AnimatedPostGridV3.tsx` حذف شد

## Backend (must be unchanged)
- [x] `getArchivePosts()` امضای یکسان
- [x] `getCategories()` امضای یکسان
- [x] `getTags()` امضای یکسان
- [x] URL schema: `/archive/category/[slug]`, `/archive/tag/[slug]`, `?page=`, `?filter=`, `?q=`
- [x] Cache tags دست‌نخورده

## Visual
- [x] همه‌ی رنگ‌ها از tokens (`var(--ds-*)`)
- [x] همه‌ی spacing از tokens
- [x] Dark mode: True Black OLED (`oklch(15% 0.01 250)`)
- [x] RTL: logical properties (`inset-inline-start`، `margin-block-start`)
- [x] Featured: 2-col (≥1024px), 1-col mobile
- [x] Grid: auto-fit 1-4 ستون

## Accessibility
- [x] Semantic HTML
- [x] ARIA labels
- [x] Focus visible
- [x] prefers-reduced-motion
- [x] Keyboard nav در Command Panel

## Performance
- [x] CSS rules از 522 → ~120 (75% کاهش)
- [x] Server components برای data fetching
- [x] Client components فقط برای interactive
```

- [ ] **Step 5: Commit verification doc**

```bash
git add docs/superpowers/verification-archive-rebuild-2026-06-19.md
git commit -m "docs: add archive rebuild verification checklist"
```

---

## Self-Review

✅ **Spec coverage:**
- G1 (Editorial Premium) → Tasks 9, 10, 11, 13
- G2 (Design System) → Tasks 1-8
- G3 (DRY) → Tasks 16, 14 (remove dead code)
- G4 (A11y/Performance/RTL) → Tasks 8, 13, 17
- G5 (Backend unchanged) → Task 14 (فقط import paths)، تمام taskها (هیچ تغییر در actions)

✅ **Placeholder scan:** هیچ TBD/TODO در plan. همه‌ی steps کد کامل دارند.

✅ **Type consistency:**
- `Card` از DS فقط `variant`, `reveal`, `className`, `children` می‌گیرد (نه `ratio`/`priority`).
- `ArchiveCard` prop های ratio/priority را به `<SafeImage>` می‌دهد، نه به `<Card>`.
- `Chip` فقط `accent`, `icon`, `children` می‌گیرد.

✅ **File paths:** همه absolute از root repo.

✅ **Commands:** همه با expected output.

✅ **Migration:** Task 16 alias map برای backward-compat.

---

## Handoff

Plan آماده است. **۱۷ task**، هر task ~5-15 دقیقه، جمع ~3-5 ساعت.

**دو روش اجرا:**

1. **Subagent-Driven (توصیه‌ی من)**: من یک subagent تازه per task dispatch می‌کنم، بین tasks review می‌کنم، iteration سریع.
2. **Inline Execution**: در همین session، با checkpoints.

**کدام را ترجیح می‌دهید؟**
