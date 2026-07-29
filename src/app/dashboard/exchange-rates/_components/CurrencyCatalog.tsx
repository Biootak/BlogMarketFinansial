// src/app/dashboard/exchange-rates/_components/CurrencyCatalog.tsx
// 2026-07-29: Currency Catalog — searchable, group-filtered grid of all
// currencies from the registry. Shows which are present in DB and which
// are missing. One-click add (pre-fills editor drawer) or edit.

'use client';

import {
  HiCheckCircle,
  HiOutlineArrowDownTray,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';
import type { MarketRateGroup } from '@/lib/market-rates';
import { SYMBOL_REGISTRY } from '@/lib/market-rates/registry';
import { useMemo, useState } from 'react';
import type { RateRowData } from './ExchangeRateRow';

/* ──────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────── */

interface Props {
  /** Existing rows from DB; used to mark which registry entries are present. */
  existingRows: RateRowData[];
  /** Open the editor drawer pre-filled with a new currency from the registry. */
  onAdd: (entry: CatalogEntry) => void;
  /** Open the editor drawer to edit an existing rate. */
  onEdit: (row: RateRowData) => void;
  /** Maximum number of cards shown before "show more" button. Defaults to 24. */
  initialLimit?: number;
}

export interface CatalogEntry {
  symbol: string;
  displayNameFa: string;
  group: MarketRateGroup;
  unit: string;
  divisor: number;
  decimals: number;
  priority: number;
  tgjuKey: string | null;
}

/* ──────────────────────────────────────────────────────────────────────
   Group labels — Persian display names for the group filter chips
   ────────────────────────────────────────────────────────────────────── */

const GROUP_LABELS: Record<MarketRateGroup | 'all', string> = {
  all: 'همه',
  afghan: 'افغان',
  'iran-forex': 'فارکس ایران',
  'iran-coin': 'سکه',
  'iran-gold': 'طلا',
  global: 'جهانی',
  minor: 'سایر',
};

const GROUP_ACCENT: Record<MarketRateGroup, { tint: string; ink: string; border: string }> = {
  afghan: {
    tint: 'color-mix(in oklch, var(--ds-brand-500) 14%, transparent)',
    ink: 'var(--ds-brand-500)',
    border: 'color-mix(in oklch, var(--ds-brand-500) 28%, transparent)',
  },
  'iran-forex': {
    tint: 'color-mix(in oklch, var(--ds-accent-emerald) 14%, transparent)',
    ink: 'var(--ds-accent-emerald)',
    border: 'color-mix(in oklch, var(--ds-accent-emerald) 28%, transparent)',
  },
  'iran-coin': {
    tint: 'color-mix(in oklch, var(--ds-accent-amber) 14%, transparent)',
    ink: 'var(--ds-accent-amber)',
    border: 'color-mix(in oklch, var(--ds-accent-amber) 28%, transparent)',
  },
  'iran-gold': {
    tint: 'color-mix(in oklch, var(--ds-accent-amber) 18%, transparent)',
    ink: 'color-mix(in oklch, var(--ds-accent-amber) 90%, black)',
    border: 'color-mix(in oklch, var(--ds-accent-amber) 32%, transparent)',
  },
  global: {
    tint: 'color-mix(in oklch, var(--ds-accent-violet) 14%, transparent)',
    ink: 'var(--ds-accent-violet)',
    border: 'color-mix(in oklch, var(--ds-accent-violet) 28%, transparent)',
  },
  minor: {
    tint: 'color-mix(in oklch, var(--ds-text-muted) 14%, transparent)',
    ink: 'var(--ds-text-secondary)',
    border: 'color-mix(in oklch, var(--ds-text-muted) 28%, transparent)',
  },
};

/* ──────────────────────────────────────────────────────────────────────
   Source-key formatter — convert raw upstream keys (price_dollar_rl,
   sekee, geram18…) to a human-readable label. Falls back to title-case.
   ────────────────────────────────────────────────────────────────────── */

const KEY_SEGMENT_MAP: Record<string, string> = {
  // currencies
  dollar: 'دلار',
  afn: 'افغانی',
  eur: 'یورو',
  gbp: 'پوند',
  aed: 'درهم',
  try: 'لیر',
  chf: 'فرانک',
  cad: 'دلار کانادا',
  aud: 'دلار استرالیا',
  cny: 'یوان',
  jpy: 'ین',
  rub: 'روبل',
  inr: 'روپیه',
  pkr: 'روپیه پاکستان',
  sar: 'ریال عربستان',
  qar: 'ریال قطر',
  omr: 'ریال عمان',
  kwd: 'دینار کویت',
  bhd: 'دینار بحرین',
  iqd: 'دینار عراق',
  azn: 'منات',
  tjs: 'سامانی',
  gel: 'لاری',
  sgd: 'دلار سنگاپور',
  krw: 'وون',
  sek: 'کرون سوئد',
  nok: 'کرون نروژ',
  dkk: 'کرون دانمارک',
  nzd: 'دلار نیوزیلند',
  hkd: 'دلار هنگ‌کنگ',
  myr: 'رینگیت',
  thb: 'بات',
  // units
  rl: 'ریال',
  // coins / bullion
  sekee: 'سکه طرح جدید',
  sekeb: 'سکه طرح قدیم',
  nim: 'نیم سکه',
  rob: 'ربع سکه',
  gerami: 'سکه گرمی',
  geram18: 'طلای ۱۸ عیار (گرم)',
  mesghal: 'مثقال طلا',
  ons: 'انس طلا',
};

const GOLD_KEYS = new Set(['geram18', 'mesghal', 'ons']);
const COIN_KEYS = new Set(['sekee', 'sekeb', 'nim', 'rob', 'gerami']);

function formatSourceKey(key: string): string {
  const lower = key.toLowerCase();
  // Direct mapping wins.
  if (KEY_SEGMENT_MAP[lower]) return KEY_SEGMENT_MAP[lower];

  // price_X_Y → "X (Y)"
  if (lower.startsWith('price_')) {
    const rest = lower.slice('price_'.length);
    const parts = rest.split('_').filter(Boolean);
    const mapped = parts.map((p) => KEY_SEGMENT_MAP[p] ?? prettifyToken(p));
    if (parts.length === 2) return `${mapped[0]} (${mapped[1]})`;
    return mapped.join(' · ');
  }

  // Single tokens — gold / coin hint via suffix.
  if (GOLD_KEYS.has(lower)) return KEY_SEGMENT_MAP[lower] ?? prettifyToken(lower);
  if (COIN_KEYS.has(lower)) return KEY_SEGMENT_MAP[lower] ?? prettifyToken(lower);

  return prettifyToken(lower);
}

function prettifyToken(t: string): string {
  // camelCase → split before capitals; underscore → space.
  const spaced = t
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (!spaced) return t;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/* ──────────────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────────────── */

type FilterValue = MarketRateGroup | 'all';

export default function CurrencyCatalog({
  existingRows,
  onAdd,
  onEdit,
  initialLimit = 24,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [expanded, setExpanded] = useState(false);

  // Index existing rows by symbol for O(1) lookup.
  const existingBySymbol = useMemo(() => {
    const m = new Map<string, RateRowData>();
    for (const r of existingRows) {
      if (r.symbol) m.set(r.symbol, r);
    }
    return m;
  }, [existingRows]);

  // Compute counts per group for the filter chips.
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SYMBOL_REGISTRY.length };
    for (const entry of SYMBOL_REGISTRY) {
      counts[entry.group] = (counts[entry.group] ?? 0) + 1;
    }
    return counts;
  }, []);

  // Filter + search the catalog.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SYMBOL_REGISTRY.filter((entry) => {
      if (filter !== 'all' && entry.group !== filter) return false;
      if (!q) return true;
      return (
        entry.displayNameFa.toLowerCase().includes(q) ||
        entry.symbol.toLowerCase().includes(q) ||
        (entry.tgjuKey ?? '').toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const totalAdded = SYMBOL_REGISTRY.filter((e) => existingBySymbol.has(e.symbol)).length;
  const totalMissing = SYMBOL_REGISTRY.length - totalAdded;
  const showLimit = expanded ? filtered.length : Math.min(initialLimit, filtered.length);

  return (
    <section
      aria-labelledby="currency-catalog-title"
      className="flex flex-col backdrop-blur-sm"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-lg)',
        boxShadow: 'var(--ds-shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        className="flex flex-col"
        style={{
          padding: 'var(--ds-space-5) var(--ds-space-5) var(--ds-space-4)',
          gap: 'var(--ds-space-3)',
          borderBottom: '1px solid var(--ds-border-subtle)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center" style={{ gap: '0.75rem' }}>
            <div
              aria-hidden
              className="inline-flex items-center justify-center"
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: 'var(--ds-radius-md)',
                background: GROUP_ACCENT.afghan.tint,
                color: GROUP_ACCENT.afghan.ink,
              }}
            >
              <HiOutlineSquares2X2 style={{ width: '1.125rem', height: '1.125rem' }} />
            </div>
            <div className="flex flex-col">
              <h2
                id="currency-catalog-title"
                className="font-bold"
                style={{
                  fontSize: 'var(--ds-text-lg)',
                  color: 'var(--ds-text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                کاتالوگ ارزها
              </h2>
              <p
                style={{
                  fontSize: 'var(--ds-text-xs)',
                  color: 'var(--ds-text-muted)',
                  margin: 0,
                }}
              >
                {totalAdded.toLocaleString('fa-IR')} افزوده‌شده ·{' '}
                {totalMissing.toLocaleString('fa-IR')} قابل افزودن از{' '}
                {SYMBOL_REGISTRY.length.toLocaleString('fa-IR')}
              </p>
            </div>
          </div>

          {/* Coverage meter */}
          <div
            className="flex items-center"
            style={{ gap: '0.5rem' }}
            aria-label="پوشش کاتالوگ"
          >
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round((totalAdded / SYMBOL_REGISTRY.length) * 100)}
              style={{
                width: '6rem',
                height: '0.4rem',
                background: 'var(--ds-canvas-subtle)',
                borderRadius: 'var(--ds-radius-full)',
                overflow: 'hidden',
                border: '1px solid var(--ds-border-subtle)',
              }}
            >
              <div
                style={{
                  width: `${(totalAdded / SYMBOL_REGISTRY.length) * 100}%`,
                  height: '100%',
                  background:
                    'linear-gradient(90deg, var(--ds-brand-500), var(--ds-accent-emerald))',
                  transition: 'width 240ms var(--ds-ease-out-expo)',
                }}
              />
            </div>
            <span
              className="font-semibold tabular-nums"
              style={{
                fontSize: 'var(--ds-text-xs)',
                color: 'var(--ds-text-secondary)',
                minWidth: '2.5rem',
                textAlign: 'end',
              }}
            >
              {Math.round((totalAdded / SYMBOL_REGISTRY.length) * 100)}٪
            </span>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center" style={{ gap: '0.5rem' }}>
          <div
            className="relative flex-1"
            style={{ minWidth: '14rem', maxWidth: '20rem' }}
          >
            <HiOutlineMagnifyingGlass
              aria-hidden
              style={{
                position: 'absolute',
                insetInlineStart: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '0.95rem',
                height: '0.95rem',
                color: 'var(--ds-text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در کاتالوگ (نام، نماد، کلید)…"
              aria-label="جستجوی کاتالوگ"
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

          <div
            className="flex flex-wrap items-center"
            style={{ gap: '0.375rem' }}
            role="tablist"
            aria-label="فیلتر گروه"
          >
            {(Object.keys(GROUP_LABELS) as FilterValue[]).map((g) => {
              const active = g === filter;
              return (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(g)}
                  className="inline-flex items-center font-semibold transition-colors"
                  style={{
                    height: '2rem',
                    paddingInline: '0.75rem',
                    fontSize: 'var(--ds-text-xs)',
                    borderRadius: 'var(--ds-radius-md)',
                    color: active ? 'var(--ds-text-inverse)' : 'var(--ds-text-secondary)',
                    background: active ? 'var(--ds-brand-500)' : 'var(--ds-canvas-subtle)',
                    border: `1px solid ${active ? 'var(--ds-brand-500)' : 'var(--ds-border-subtle)'}`,
                    gap: '0.4rem',
                    cursor: 'pointer',
                  }}
                >
                  {GROUP_LABELS[g]}
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 500,
                      opacity: 0.7,
                    }}
                  >
                    {(groupCounts[g] ?? 0).toLocaleString('fa-IR')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Body */}
      <div
        className="grid"
        style={{
          padding: 'var(--ds-space-4)',
          gap: 'var(--ds-space-3)',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 18rem), 1fr))',
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          filtered.slice(0, showLimit).map((entry) => {
            const existing = existingBySymbol.get(entry.symbol);
            return (
              <CatalogCard
                key={entry.symbol}
                symbol={entry.symbol}
                displayNameFa={entry.displayNameFa}
                group={entry.group}
                unit={entry.unit}
                tgjuKey={entry.tgjuKey}
                priority={entry.priority}
                existing={existing ?? null}
                onAdd={() =>
                  onAdd({
                    symbol: entry.symbol,
                    displayNameFa: entry.displayNameFa,
                    group: entry.group,
                    unit: entry.unit,
                    divisor: entry.divisor,
                    decimals: entry.decimals,
                    priority: entry.priority,
                    tgjuKey: entry.tgjuKey ?? null,
                  })
                }
                onEdit={() => existing && onEdit(existing)}
              />
            );
          })
        )}
      </div>

      {/* Footer — show more / less */}
      {filtered.length > initialLimit && (
        <footer
          className="flex items-center justify-center"
          style={{
            padding: 'var(--ds-space-3) var(--ds-space-4)',
            borderTop: '1px solid var(--ds-border-subtle)',
            background: 'var(--ds-canvas-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center font-semibold transition-colors"
            style={{
              fontSize: 'var(--ds-text-xs)',
              color: 'var(--ds-brand-500)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              gap: '0.35rem',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--ds-radius-sm)',
            }}
          >
            {expanded ? (
              <>جمع · {filtered.length - initialLimit} مورد بیشتر</>
            ) : (
              <>
                <HiOutlineSparkles style={{ width: '0.85rem', height: '0.85rem' }} />
                نمایش {filtered.length - initialLimit} مورد بیشتر
              </>
            )}
          </button>
        </footer>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Catalog card
   ────────────────────────────────────────────────────────────────────── */

interface CatalogCardProps {
  symbol: string;
  displayNameFa: string;
  group: MarketRateGroup;
  unit: string;
  tgjuKey: string | undefined;
  priority: number;
  existing: RateRowData | null;
  onAdd: () => void;
  onEdit: () => void;
}

function CatalogCard({
  symbol,
  displayNameFa,
  group,
  unit,
  tgjuKey,
  priority,
  existing,
  onAdd,
  onEdit,
}: CatalogCardProps) {
  const accent = GROUP_ACCENT[group];
  const isActive = existing?.active ?? false;
  const isAdded = existing !== null;

  return (
    <article
      className="group relative flex flex-col transition-shadow"
      style={{
        background: 'var(--ds-surface)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--ds-radius-md)',
        padding: 'var(--ds-space-3) var(--ds-space-4)',
        gap: 'var(--ds-space-2)',
        boxShadow: 'var(--ds-shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top edge accent */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: accent.ink,
          opacity: 0.4,
        }}
      />

      <div className="flex items-start justify-between" style={{ gap: '0.5rem' }}>
        <div className="flex flex-col" style={{ gap: '0.1rem' }}>
          <span
            className="font-mono"
            dir="ltr"
            style={{
              fontSize: 'var(--ds-text-base)',
              fontWeight: 700,
              color: 'var(--ds-text-primary)',
              lineHeight: 1.2,
              textAlign: 'start',
            }}
          >
            {symbol}
          </span>
          <span
            style={{
              fontSize: 'var(--ds-text-sm)',
              color: 'var(--ds-text-secondary)',
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            {displayNameFa}
          </span>
        </div>
        <span
          className="inline-flex items-center font-semibold uppercase"
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.06em',
            color: accent.ink,
            background: accent.tint,
            border: `1px solid ${accent.border}`,
            borderRadius: 'var(--ds-radius-full)',
            padding: '0.15rem 0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          {GROUP_LABELS[group]}
        </span>
      </div>

      <div
        className="flex flex-wrap items-center"
        style={{ gap: '0.5rem', fontSize: 'var(--ds-text-xs)', color: 'var(--ds-text-muted)' }}
      >
        <span className="inline-flex items-center" style={{ gap: '0.3rem' }}>
          <span aria-hidden>◈</span>
          اولویت: <span className="font-mono tabular-nums">{priority.toLocaleString('fa-IR')}</span>
        </span>
        <span aria-hidden style={{ color: 'var(--ds-border-default)' }}>
          ·
        </span>
        <span className="inline-flex items-center" style={{ gap: '0.3rem' }}>
          واحد:
          <span className="font-mono" dir="ltr">
            {unit}
          </span>
        </span>
        {tgjuKey && (
          <>
            <span aria-hidden style={{ color: 'var(--ds-border-default)' }}>
              ·
            </span>
            <span
              className="inline-flex items-center font-semibold truncate"
              dir="rtl"
              title={`کلید: ${tgjuKey}`}
              style={{
                maxWidth: '12rem',
                color: 'var(--ds-text-secondary)',
                background: 'var(--ds-canvas-subtle)',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: 'var(--ds-radius-sm)',
                padding: '0.1rem 0.45rem',
                fontSize: '0.65rem',
              }}
            >
              <span aria-hidden style={{ marginInlineEnd: '0.25rem' }}>↳</span>
              <span className="truncate">{formatSourceKey(tgjuKey)}</span>
            </span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 'auto' }}>
        {isAdded ? (
          <span
            className="inline-flex items-center font-semibold"
            style={{
              fontSize: '0.7rem',
              gap: '0.3rem',
              color: isActive ? 'var(--ds-accent-emerald)' : 'var(--ds-text-muted)',
            }}
          >
            <HiCheckCircle style={{ width: '0.85rem', height: '0.85rem' }} />
            {isActive ? 'فعال' : 'غیرفعال'}
          </span>
        ) : (
          <span
            className="inline-flex items-center font-semibold"
            style={{
              fontSize: '0.7rem',
              gap: '0.3rem',
              color: 'var(--ds-text-muted)',
            }}
          >
            <HiOutlineArrowDownTray
              style={{ width: '0.85rem', height: '0.85rem', transform: 'rotate(180deg)' }}
            />
            قابل افزودن
          </span>
        )}

        <button
          type="button"
          onClick={isAdded ? onEdit : onAdd}
          aria-label={isAdded ? `ویرایش ${displayNameFa}` : `افزودن ${displayNameFa}`}
          className="inline-flex items-center font-semibold transition-all"
          style={{
            height: '1.85rem',
            paddingInline: '0.7rem',
            fontSize: 'var(--ds-text-xs)',
            color: isAdded ? 'var(--ds-text-secondary)' : 'var(--ds-text-inverse)',
            background: isAdded ? 'var(--ds-canvas-subtle)' : 'var(--ds-brand-500)',
            border: `1px solid ${isAdded ? 'var(--ds-border-default)' : 'var(--ds-brand-500)'}`,
            borderRadius: 'var(--ds-radius-sm)',
            gap: '0.3rem',
            cursor: 'pointer',
          }}
        >
          {isAdded ? (
            'ویرایش'
          ) : (
            <>
              <HiOutlinePlus style={{ width: '0.85rem', height: '0.85rem' }} />
              افزودن
            </>
          )}
        </button>
      </div>
    </article>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Empty state
   ────────────────────────────────────────────────────────────────────── */

function EmptyState({ query }: { query: string }) {
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center"
      style={{
        padding: 'var(--ds-space-8) var(--ds-space-6)',
        gap: 'var(--ds-space-2)',
        background: 'var(--ds-canvas-subtle)',
        border: '1px dashed var(--ds-border-default)',
        borderRadius: 'var(--ds-radius-md)',
      }}
    >
      <div
        aria-hidden
        style={{
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: 'var(--ds-radius-full)',
          background: 'color-mix(in oklch, var(--ds-brand-500) 12%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ds-brand-500)',
        }}
      >
        <HiOutlineMagnifyingGlass style={{ width: '1.1rem', height: '1.1rem' }} />
      </div>
      <p
        className="font-semibold"
        style={{
          fontSize: 'var(--ds-text-sm)',
          color: 'var(--ds-text-primary)',
          margin: 0,
        }}
      >
        نتیجه‌ای برای «{query}» پیدا نشد
      </p>
      <p
        style={{
          fontSize: 'var(--ds-text-xs)',
          color: 'var(--ds-text-muted)',
          margin: 0,
        }}
      >
        کلمهٔ دیگری امتحان کنید یا فیلتر گروه را عوض کنید.
      </p>
    </div>
  );
}
