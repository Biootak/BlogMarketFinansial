'use client';

/**
 * CurrencySelect — shared premium currency dropdown, used site-wide.
 *
 * Features:
 *  - Instant search (filters by code + name)
 *  - Optional grouped items (pass groups prop)
 *  - Three size variants: compact (HeroConverter chip), default, wide
 *  - Spring micro-interactions (press scale, chevron spring rotate)
 *  - RTL-first (logical props, dir="ltr" on code spans)
 *  - Full keyboard navigation (arrow keys, Enter, Escape)
 *  - ARIA listbox pattern (a11y)
 *  - Light / dark token-only
 *
 * Usage:
 *  // Flat list
 *  <CurrencySelect
 *    items={pairs.map(p => ({ value: p.id, code: p.code, label: p.name }))}
 *    value={fromId}
 *    onChange={setFromId}
 *    ariaLabel="ارز مبدا"
 *    size="compact"
 *  />
 *
 *  // Grouped list
 *  <CurrencySelect
 *    groups={[
 *      { label: 'ارزهای منطقه‌ای', items: [...] },
 *      { label: 'بین‌المللی', items: [...] },
 *    ]}
 *    value={currency}
 *    onChange={setCurrency}
 *  />
 */

import { Check, ChevronDown, Search } from 'lucide-react';
import {
  type CSSProperties,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import s from './CurrencySelect.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CurrencyItem {
  /** Unique identifier (used as value) */
  value: string;
  /** Short code displayed in trigger and badge — e.g. "USD" */
  code: string;
  /** Full human-readable name — e.g. "دلار آمریکا" */
  label: string;
}

export interface CurrencyGroup {
  label: string;
  items: CurrencyItem[];
}

export type CurrencySelectSize = 'compact' | 'default' | 'wide';

export interface CurrencySelectProps {
  /** Currently selected value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Flat list of items — use this OR groups */
  items?: CurrencyItem[];
  /** Grouped list — use this OR items */
  groups?: CurrencyGroup[];
  /** Trigger size variant */
  size?: CurrencySelectSize;
  /**
   * رنگ‌بندی پنل dropdown:
   *  - "light" (پیش‌فرض): روی پس‌زمینه‌ی روشن
   *  - "dark": روی پس‌زمینه‌ی تیره (مثل /exchanges)
   */
  tone?: 'light' | 'dark';
  /** aria-label for the trigger button */
  ariaLabel?: string;
  /** Placeholder shown in search input */
  searchPlaceholder?: string;
  /** Disable the trigger */
  disabled?: boolean;
  /** کلاس اضافی روی کانتینر wrap — برای استایل سفارشی از بیرون */
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeGroups(items?: CurrencyItem[], groups?: CurrencyGroup[]): CurrencyGroup[] {
  if (groups && groups.length > 0) return groups;
  if (items && items.length > 0) return [{ label: '', items }];
  return [];
}

function filterGroups(groups: CurrencyGroup[], query: string): CurrencyGroup[] {
  if (!query.trim()) return groups;
  const q = query.toLowerCase();
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (it) => it.code.toLowerCase().includes(q) || it.label.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.items.length > 0);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CurrencySelect({
  value,
  onChange,
  items,
  groups,
  size = 'default',
  tone = 'light',
  ariaLabel,
  searchPlaceholder = 'جستجوی ارز...',
  disabled = false,
  className,
}: CurrencySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerId = useId();
  const listId = useId();

  const allGroups = useMemo(() => normalizeGroups(items, groups), [items, groups]);

  const filteredGroups = useMemo(() => filterGroups(allGroups, query), [allGroups, query]);

  const allItems = useMemo(() => allGroups.flatMap((g) => g.items), [allGroups]);

  const selected = useMemo(() => allItems.find((it) => it.value === value), [allItems, value]);

  // ── Close on outside click or scroll ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Close on scroll so the fixed panel doesn't drift from the trigger
    const handleScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [open]);

  // ── Focus search when opened + reset query when closed ──
  // ── Position panel with fixed coords to escape any stacking context ──
  useEffect(() => {
    if (!open) {
      setQuery('');
      setPanelStyle({});
      return;
    }
    const t = setTimeout(() => {
      searchRef.current?.focus();
      if (!triggerRef.current) return;
      const trigRect = triggerRef.current.getBoundingClientRect();
      const PANEL_W = Math.min(352, window.innerWidth - 16);
      const PANEL_H = 336; // max-block-size approximate
      const pad = 8;

      // Default: open below trigger, aligned to inline-end (RTL: right edge)
      let top = trigRect.bottom + 6;
      // In RTL the panel's right edge aligns with the trigger's right edge
      let left = trigRect.right - PANEL_W;

      // Flip up if not enough space below
      if (top + PANEL_H > window.innerHeight - pad) {
        top = trigRect.top - PANEL_H - 6;
      }
      // Clamp horizontally
      if (left < pad) left = pad;
      if (left + PANEL_W > window.innerWidth - pad) left = window.innerWidth - pad - PANEL_W;

      setPanelStyle({
        position: 'fixed',
        top,
        left,
        width: PANEL_W,
        // override inset-inline-start so the CSS default doesn't fight
        insetInlineStart: 'unset',
        insetInlineEnd: 'unset',
        insetBlockStart: 'unset',
        insetBlockEnd: 'unset',
      });
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  // ── Pick an item ────────────────────────────────────────
  const pick = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange],
  );

  // ── Keyboard navigation (useCallback — stable refs across renders) ──
  const handleTriggerKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
        e.preventDefault();
        setOpen(true);
      }
    },
    [open],
  );

  const handleListKeyDown = useCallback((e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const opts = Array.from(e.currentTarget.querySelectorAll<HTMLLIElement>('[role="option"]'));
      const focus = document.activeElement as HTMLElement;
      const idx = opts.indexOf(focus as HTMLLIElement);
      const next =
        e.key === 'ArrowDown' ? Math.min(idx + 1, opts.length - 1) : Math.max(idx - 1, 0);
      opts[next]?.focus();
    }
  }, []);

  const handleSearchKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const panel = wrapRef.current?.querySelector<HTMLElement>('[role="option"]');
      panel?.focus();
    }
  }, []);

  const totalVisible = filteredGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div ref={wrapRef} className={`${s.wrap}${className ? ` ${className}` : ''}`} dir="rtl">
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel ?? `ارز انتخابی: ${selected?.label ?? ''}`}
        data-open={open ? 'true' : undefined}
        data-size={size}
        className={s.trigger}
        onClick={() => !disabled && setOpen((p) => !p)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
      >
        <span className={s.code} dir="ltr">
          {selected?.code ?? '•••'}
        </span>
        {size === 'wide' && selected && <span className={s.name}>{selected.label}</span>}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`${s.chevron} ${open ? s.chevronOpen : ''}`}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          ref={panelRef}
          className={`${s.panel} ${tone === 'dark' ? s.panelDark : ''}`}
          data-tone={tone}
          aria-label="انتخاب ارز"
          style={panelStyle}
        >
          {/* Search */}
          <div className={s.search}>
            <Search size={15} aria-hidden className={s.searchIcon} />
            <input
              ref={searchRef}
              type="search"
              aria-label="جستجوی ارز"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={s.searchInput}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* List — ARIA listbox pattern (WAI-ARIA 1.2) */}
          <ul
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel ?? 'انتخاب ارز'}
            aria-activedescendant={value ? `csel-opt-${value}` : undefined}
            className={s.list}
            onKeyDown={handleListKeyDown}
          >
            {totalVisible === 0 && (
              <li className={s.empty} role="presentation">
                ارزی یافت نشد
              </li>
            )}

            {filteredGroups.map((group) => (
              <li key={group.label} role="presentation">
                {group.label && (
                  <div className={s.groupLabel} aria-hidden="true">
                    {group.label}
                  </div>
                )}
                <ul
                  role="group"
                  aria-label={group.label || undefined}
                  style={{ listStyle: 'none', padding: 0, margin: 0 }}
                >
                  {group.items.map((item) => {
                    const isSelected = item.value === value;
                    return (
                      <li
                        key={item.value}
                        id={`csel-opt-${item.value}`}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        className={`${s.option} ${isSelected ? s.optionSelected : ''}`}
                        onClick={() => pick(item.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            pick(item.value);
                          }
                        }}
                      >
                        <span className={s.optBadge} dir="ltr">
                          {item.code}
                        </span>
                        <span className={s.optLabel}>{item.label}</span>
                        {isSelected && (
                          <Check size={13} aria-hidden="true" className={s.optCheck} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
