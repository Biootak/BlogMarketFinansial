// src/app/dashboard/exchange-rates/_components/CurrencyCatalog.tsx
// 2026-08-11 premium update: CSS module, lucide-react, elevation tiers,
// hover micro-interaction, mobile readability.

'use client';

import type { MarketRateGroup } from '@/lib/market-rates';
import { SYMBOL_REGISTRY } from '@/lib/market-rates/registry';
import { CheckCircle, Download, Plus, Search, Sparkles, SquareStack } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { RateRowData } from './ExchangeRateRow';
import s from './CurrencyCatalog.module.css';

/* ──────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────── */

interface Props {
  existingRows: RateRowData[];
  onAdd: (entry: CatalogEntry) => void;
  onEdit: (row: RateRowData) => void;
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
   Group labels
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

/* ──────────────────────────────────────────────────────────────────────
   Source-key formatter
   ────────────────────────────────────────────────────────────────────── */

const KEY_SEGMENT_MAP: Record<string, string> = {
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
  rl: 'ریال',
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
  if (KEY_SEGMENT_MAP[lower]) return KEY_SEGMENT_MAP[lower];

  if (lower.startsWith('price_')) {
    const rest = lower.slice('price_'.length);
    const parts = rest.split('_').filter(Boolean);
    const mapped = parts.map((p) => KEY_SEGMENT_MAP[p] ?? prettifyToken(p));
    if (parts.length === 2) return `${mapped[0]} (${mapped[1]})`;
    return mapped.join(' · ');
  }

  if (GOLD_KEYS.has(lower)) return KEY_SEGMENT_MAP[lower] ?? prettifyToken(lower);
  if (COIN_KEYS.has(lower)) return KEY_SEGMENT_MAP[lower] ?? prettifyToken(lower);

  return prettifyToken(lower);
}

function prettifyToken(t: string): string {
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

export default function CurrencyCatalog({ existingRows, onAdd, onEdit, initialLimit = 24 }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [expanded, setExpanded] = useState(false);

  const existingBySymbol = useMemo(() => {
    const m = new Map<string, RateRowData>();
    for (const r of existingRows) {
      if (r.symbol) m.set(r.symbol, r);
    }
    return m;
  }, [existingRows]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SYMBOL_REGISTRY.length };
    for (const entry of SYMBOL_REGISTRY) {
      counts[entry.group] = (counts[entry.group] ?? 0) + 1;
    }
    return counts;
  }, []);

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
  const coveragePercent = Math.round((totalAdded / SYMBOL_REGISTRY.length) * 100);

  return (
    <section className={s.root} aria-labelledby="currency-catalog-title">
      <header className={s.header}>
        <div className={s.headerTop}>
          <div className={s.headerLeft}>
            <div className={s.headerIcon} aria-hidden>
              <SquareStack size={18} />
            </div>
            <div className="flex flex-col">
              <h2 id="currency-catalog-title" className={s.headerTitle}>
                کاتالوگ ارزها
              </h2>
              <p className={s.headerSubtitle}>
                {totalAdded.toLocaleString('fa-IR')} افزوده‌شده ·{' '}
                {totalMissing.toLocaleString('fa-IR')} قابل افزودن از{' '}
                {SYMBOL_REGISTRY.length.toLocaleString('fa-IR')}
              </p>
            </div>
          </div>

          <div className={s.coverageMeter} aria-label="پوشش کاتالوگ">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={coveragePercent}
              className={s.progressBar}
            >
              <div className={s.progressFill} style={{ width: `${coveragePercent}%` }} />
            </div>
            <span className={s.progressLabel}>{coveragePercent}٪</span>
          </div>
        </div>

        <div className={s.filterRow}>
          <div className={s.searchWrap}>
            <Search className={s.searchIcon} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در کاتالوگ (نام، نماد، کلید)…"
              aria-label="جستجوی کاتالوگ"
              className={s.searchInput}
            />
          </div>

          <div className={s.filterChips} role="tablist" aria-label="فیلتر گروه">
            {(Object.keys(GROUP_LABELS) as FilterValue[]).map((g) => {
              const active = g === filter;
              return (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(g)}
                  className={`${s.filterChip} ${active ? s.filterChipActive : s.filterChipInactive}`}
                >
                  {GROUP_LABELS[g]}
                  <span className={s.filterChipCount}>
                    {(groupCounts[g] ?? 0).toLocaleString('fa-IR')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className={s.body}>
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

      {filtered.length > initialLimit && (
        <footer className={s.footer}>
          <button type="button" onClick={() => setExpanded((v) => !v)} className={s.expandBtn}>
            {expanded ? (
              <>جمع · {filtered.length - initialLimit} مورد بیشتر</>
            ) : (
              <>
                <Sparkles size={12} />
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
  const isActive = existing?.active ?? false;
  const isAdded = existing !== null;

  return (
    <article className={s.card}>
      <span className={`${s.cardAccent} ${s[`cardAccent_${group}`]}`} aria-hidden />

      <div className={s.cardTop}>
        <div className="flex flex-col" style={{ gap: '0.1rem' }}>
          <span className={s.cardSymbol} dir="ltr">
            {symbol}
          </span>
          <span className={s.cardName}>{displayNameFa}</span>
        </div>
        <span className={`${s.cardGroup} ${s[`cardGroup_${group}`]}`}>{GROUP_LABELS[group]}</span>
      </div>

      <div className={s.cardMeta}>
        <span className={s.cardMetaItem}>
          اولویت: <span className="font-mono tabular-nums">{priority.toLocaleString('fa-IR')}</span>
        </span>
        <span aria-hidden style={{ color: 'var(--ds-border-default)' }}>
          ·
        </span>
        <span className={s.cardMetaItem}>
          واحد:{' '}
          <span className="font-mono" dir="ltr">
            {unit}
          </span>
        </span>
        {tgjuKey && (
          <>
            <span aria-hidden style={{ color: 'var(--ds-border-default)' }}>
              ·
            </span>
            <span className={s.cardMetaKey} dir="rtl" title={`کلید: ${tgjuKey}`}>
              <span aria-hidden style={{ marginInlineEnd: '0.25rem' }}>
                ↳
              </span>
              <span className="truncate">{formatSourceKey(tgjuKey)}</span>
            </span>
          </>
        )}
      </div>

      <div className={s.cardFooter}>
        {isAdded ? (
          <span
            className={`${s.cardStatus} ${isActive ? s.cardStatusActive : s.cardStatusInactive}`}
          >
            <CheckCircle size={12} />
            {isActive ? 'فعال' : 'غیرفعال'}
          </span>
        ) : (
          <span className={`${s.cardStatus} ${s.cardStatusMissing}`}>
            <Download size={12} style={{ transform: 'rotate(180deg)' }} />
            قابل افزودن
          </span>
        )}

        <button
          type="button"
          onClick={isAdded ? onEdit : onAdd}
          aria-label={isAdded ? `ویرایش ${displayNameFa}` : `افزودن ${displayNameFa}`}
          className={`${s.cardAction} ${isAdded ? s.cardActionEdit : s.cardActionAdd}`}
        >
          {isAdded ? (
            'ویرایش'
          ) : (
            <>
              <Plus size={12} />
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
    <div className={s.emptyState}>
      <div className={s.emptyIcon} aria-hidden>
        <Search size={18} />
      </div>
      <p className={s.emptyTitle}>نتیجه‌ای برای «{query}» پیدا نشد</p>
      <p className={s.emptyDesc}>کلمهٔ دیگری امتحان کنید یا فیلتر گروه را عوض کنید.</p>
    </div>
  );
}
