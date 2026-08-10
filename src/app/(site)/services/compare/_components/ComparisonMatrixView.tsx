'use client';

/**
 * ComparisonMatrixView — «Trading Terminal» Redesign
 *
 *  Pattern: Bloomberg Terminal × Stripe Dashboard (2026)
 *  - Bento-grid of exchange cards (not a flat table)
 *  - Coverage ring per exchange (SVG circular gauge)
 *  - Service dot grid inside each card
 *  - Expandable detail panel (inline, not modal)
 *  - Mobile-first: cards stack, detail panel goes full-width
 */

import type { ComparisonMatrix } from '@/actions/exchange-services';
import { SERVICE_GROUPS, type ExchangeServiceKey, getServiceMeta } from '@/lib/exchange-services';
import { ArrowDown, ArrowUp, ChevronDown, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import s from './ComparisonMatrixView.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

type Props = {
  matrix: ComparisonMatrix;
  initialExchange?: string;
  initialGroup?: string;
};

/* ── SVG Gradient (rendered once) ─────────────────────────────────── */

const RingGradient = () => (
  <svg className={s.ringGradient} width="0" height="0">
    <defs>
      <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--ds-brand-400)" />
        <stop offset="100%" stopColor="var(--ds-accent-emerald)" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── Coverage Ring ────────────────────────────────────────────────── */

function CoverageRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={s.coverageRing} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle className={s.track} cx={size / 2} cy={size / 2} r={r} />
        <circle
          className={s.fill}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={s.coverageRingText}>{_faNum.format(percent)}٪</span>
    </div>
  );
}

/* ── Exchange Card ────────────────────────────────────────────────── */

function ExchangeCard({
  ex,
  services,
  isExpanded,
  onToggle,
}: {
  ex: MatrixExchange;
  services: Array<{ key: string; name: string }>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const coveragePct = services.length > 0 ? Math.round((ex.serviceCount / services.length) * 100) : 0;

  return (
    <article
      className={`${s.exchangeCard} ${isExpanded ? s.expanded : ''}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {/* Header */}
      <div className={s.cardHeader}>
        <span className={s.exchangeLogo} aria-hidden>
          {ex.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ex.logoUrl} alt="" loading="lazy" />
          ) : (
            <span>{(ex.exchangeName[0] ?? '?').toUpperCase()}</span>
          )}
        </span>
        <span className={s.exchangeInfo}>
          <span className={s.exchangeName}>{ex.exchangeName}</span>
          {ex.city && <span className={s.exchangeCity}>{ex.city}</span>}
        </span>
      </div>

      {/* Body — ring + dots */}
      <div className={s.cardBody}>
        <CoverageRing percent={coveragePct} />
        <div className={s.serviceDots}>
          {services.slice(0, 5).map((svc) => {
            const meta = getServiceMeta(svc.key);
            const Icon = meta?.icon;
            const has = ex.cells[svc.key as ExchangeServiceKey];
            return (
              <div key={svc.key} className={s.serviceDotRow}>
                <span className={s.serviceDotLabel}>
                  {Icon && <Icon size={10} strokeWidth={2} aria-hidden className={s.iconInline} />}
                  {svc.name}
                </span>
                <span className={s.serviceDotTrack}>
                  <span className={`${s.serviceDot} ${has ? s.active : ''}`} />
                </span>
              </div>
            );
          })}
          {services.length > 5 && (
            <span className={s.moreServices}>
              +{_faNum.format(services.length - 5)} سرویس دیگر
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={s.cardFooter}>
        <span className={s.serviceCount}>
          {_faNum.format(ex.serviceCount)} از {_faNum.format(services.length)} سرویس
        </span>
        <span className={s.expandHint}>
          <ChevronDown size={12} strokeWidth={2} aria-hidden />
          {isExpanded ? 'بستن' : 'جزئیات'}
        </span>
      </div>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <div className={s.detailPanel}>
          <h3 className={s.detailTitle}>
            <Filter size={14} strokeWidth={1.8} aria-hidden />
            وضعیت تمام خدمات
          </h3>
          <div className={s.detailGrid}>
            {services.map((svc) => {
              const meta = getServiceMeta(svc.key);
              const Icon = meta?.icon;
              const has = ex.cells[svc.key as ExchangeServiceKey];
              const lead = ex.leadTimes[svc.key as ExchangeServiceKey];
              return (
                <div key={svc.key} className={`${s.detailItem} ${has ? s.hasService : ''}`}>
                  <span className={s.detailIcon}>
                    {Icon ? <Icon size={16} strokeWidth={1.8} aria-hidden /> : '—'}
                  </span>
                  <span className={s.detailInfo}>
                    <span className={s.detailServiceName}>{svc.name}</span>
                    {has && lead != null && (
                      <span className={s.detailLeadTime}>پاسخ‌گویی: {formatLeadTime(lead)}</span>
                    )}
                  </span>
                  <span className={s.detailStatus} aria-label={has ? 'دارد' : 'ندارد'}>
                    {has ? '✓' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={s.detailCtaWrap}>
            <Link
              href={`/exchanges/${ex.exchangeSlug}#services`}
              className={s.detailCtaBtn}
              onClick={(e) => e.stopPropagation()}
            >
              مشاهده پروفایل صرافی
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}

/* ── Main View ────────────────────────────────────────────────────── */

export default function ComparisonMatrixView({ matrix, initialExchange, initialGroup }: Props) {
  const router = useRouter();

  const [activeGroup, setActiveGroup] = useState<string>(initialGroup ?? 'all');
  const [search, setSearch] = useState<string>('');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── URL sync ─────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeGroup !== 'all') params.set('group', activeGroup);
    if (initialExchange) params.set('exchange', initialExchange);
    const qs = params.toString();
    const url = qs ? `/services/compare?${qs}` : '/services/compare';
    if (
      typeof window !== 'undefined' &&
      window.location.pathname + window.location.search !== url
    ) {
      router.replace(url, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup]);

  // ── filter services by group ─────────────────────────────────
  const visibleServices = useMemo(() => {
    if (activeGroup === 'all') return matrix.services;
    return matrix.services.filter((svc) => svc.group === activeGroup);
  }, [matrix.services, activeGroup]);

  const visibleServiceKeys = useMemo(
    () => new Set(visibleServices.map((s) => s.key)),
    [visibleServices],
  );

  // ── filter + sort exchanges ──────────────────────────────────
  const visibleExchanges = useMemo(() => {
    const filtered = search.trim()
      ? matrix.exchanges.filter(
          (e) =>
            e.exchangeName.toLowerCase().includes(search.toLowerCase()) ||
            e.city?.toLowerCase().includes(search.toLowerCase()),
        )
      : matrix.exchanges;
    return [...filtered].sort((a, b) =>
      sortDir === 'desc' ? b.serviceCount - a.serviceCount : a.serviceCount - b.serviceCount,
    );
  }, [matrix.exchanges, search, sortDir]);

  // ── counters ─────────────────────────────────────────────────
  const totalCells = visibleExchanges.length * visibleServices.length;
  const filledCells = visibleExchanges.reduce((sum, ex) => {
    return sum + Array.from(visibleServiceKeys).filter((k) => ex.cells[k]).length;
  }, 0);
  const fillRate = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  // ── empty state ──────────────────────────────────────────────
  if (matrix.exchanges.length === 0) {
    return (
      <main className={s.emptyPage} dir="rtl">
        <RingGradient />
        <div className={s.empty}>
          <span className={s.emptyIcon}>
            <Filter size={24} strokeWidth={1.5} aria-hidden />
          </span>
          <h1 className={s.emptyTitle}>هنوز صرافی خدماتی ثبت نکرده</h1>
          <p className={s.emptyText}>
            به محض اینکه صرافی‌ها سرویس‌های خود را در داشبورد فعال کنند، اینجا نمایش داده می‌شود.
          </p>
          <Link href="/services" className={s.emptyBtn}>
            خدمات صرافی‌ها
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={s.root} dir="rtl">
      <RingGradient />

      {/* ── Hero ──────────────────────────────────────────── */}
      <header className={s.hero}>
        <div className={s.heroInner}>
          <span className={s.eyebrow}>
            <Filter size={12} strokeWidth={1.9} aria-hidden />
            <span>مقایسه خدمات</span>
          </span>
          <h1 className={s.title}>
            کدام صرافی چه خدماتی{' '}
            <span className={s.titleAccent}>آنلاین</span> ارائه می‌دهد؟
          </h1>
          <p className={s.sub}>
            یک نگاه، تمام تفاوت‌ها — برای انتخاب سریع‌تر. روی هر کارت کلیک کنید تا جزئیات کامل
            را ببینید.
          </p>

          <div className={s.liveBar} role="list">
            <div className={s.liveStat} role="listitem">
              <span className={s.liveStatValue}>{_faNum.format(visibleExchanges.length)}</span>
              <span className={s.liveStatLabel}>صرافی فعال</span>
            </div>
            <span className={s.liveDivider} aria-hidden />
            <div className={s.liveStat} role="listitem">
              <span className={s.liveStatValue}>{_faNum.format(visibleServices.length)}</span>
              <span className={s.liveStatLabel}>خدمت</span>
            </div>
            <span className={s.liveDivider} aria-hidden />
            <div className={s.coverageBar} role="listitem">
              <div className={s.coverageBarTrack}>
                <div className={s.coverageBarFill} style={{ width: `${fillRate}%` }} />
              </div>
              <span className={s.coverageBarText}>
                {_faNum.format(fillRate)}٪ پوشش
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className={s.toolbar} role="toolbar" aria-label="ابزار فیلتر">
        <div className={s.toolbarInner}>
          <label className={s.searchField}>
            <Search size={16} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              className={s.searchInput}
              placeholder="جستجوی نام صرافی یا شهر..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="جستجو"
            />
          </label>

          <div className={s.chips} role="tablist" aria-label="گروه خدمات">
            <GroupChip active={activeGroup === 'all'} onClick={() => setActiveGroup('all')}>
              همه
            </GroupChip>
            {Object.entries(SERVICE_GROUPS).map(([key, meta]) => (
              <GroupChip key={key} active={activeGroup === key} onClick={() => setActiveGroup(key)}>
                {meta.label}
              </GroupChip>
            ))}
          </div>

          <button
            type="button"
            className={s.sortBtn}
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            aria-label="تغییر ترتیب"
          >
            {sortDir === 'desc' ? (
              <ArrowDown size={14} strokeWidth={2} aria-hidden />
            ) : (
              <ArrowUp size={14} strokeWidth={2} aria-hidden />
            )}
            <span>{sortDir === 'desc' ? 'بیشترین خدمات' : 'کمترین خدمات'}</span>
          </button>
        </div>
      </div>

      {/* ── Bento Grid ────────────────────────────────────── */}
      <div className={s.gridSection}>
        <div className={s.bentoGrid}>
          {visibleExchanges.map((ex) => (
            <ExchangeCard
              key={ex.exchangeId}
              ex={ex}
              services={visibleServices}
              isExpanded={expandedId === ex.exchangeId}
              onToggle={() => setExpandedId((prev) => (prev === ex.exchangeId ? null : ex.exchangeId))}
            />
          ))}
        </div>

        {visibleExchanges.length === 0 && search.trim() && (
          <div className={s.emptyPage}>
            <span className={s.emptyIcon}>
              <Search size={24} strokeWidth={1.5} aria-hidden />
            </span>
            <h2 className={s.emptyTitle}>نتیجه‌ای یافت نشد</h2>
            <p className={s.emptyText}>
              صرافی‌ای با نام «{search}» پیدا نشد. جستجوی دیگری امتحان کنید.
            </p>
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────── */}
      <div className={s.legend} role="note">
        <span>
          روی هر کارت کلیک کنید تا جزئیات کامل خدمات آن صرافی را ببینید. رنگ سبز یعنی صرافی آن
          خدمت را ارائه می‌دهد.
        </span>
      </div>
    </main>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatLeadTime(min: number): string {
  if (min < 60) return `${_faNum.format(min)} دقیقه`;
  if (min < 60 * 24) {
    const hours = Math.floor(min / 60);
    return `${_faNum.format(hours)} ساعت`;
  }
  const days = Math.floor(min / (60 * 24));
  return `${_faNum.format(days)} روز`;
}

/* ── Sub-components ───────────────────────────────────────────────── */

function GroupChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${s.chip} ${active ? s.chipActive : ''}`}
    >
      {children}
    </button>
  );
}

/* ── Type helper for ExchangeCard ───────────────────────────────── */

type MatrixExchange = ComparisonMatrix['exchanges'][number];