'use client';

/**
 * ServicesMarketplace — بازارچه مرکزی خدمات آنلاین صرافی‌ها.
 *
 * طراحی: Wise-style clarity + Linear-style ambient SVG + Revolut-style spring tokens
 * Motion: CSS-only (opacity + transform) — بدون Framer/GSAP/Lottie
 * Stagger: .stagger-children از globals.css
 * Scroll reveal: IntersectionObserver + class toggle
 * Ambient: SVG grid نقطه‌ای در hero (Linear pattern)
 */

import { type MarketplaceRow, logServiceClick } from '@/actions/exchange-services';
import Empty from '@/components/Empty';
import { Button } from '@/components/ui/button';
import { type ExchangeServiceMeta, SERVICE_GROUPS, getServiceMeta } from '@/lib/exchange-services';
import { Banknote, ChevronLeft, Filter, Plus, Search, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './ServicesMarketplace.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

// ── accent token map (از lib/exchange-services.ts) ──────────────────────────
const ACCENT_MAP: Record<string, string> = {
  emerald: 'var(--nova-emerald)',
  amber: 'var(--nova-amber)',
  sky: 'var(--nova-cyan)',
  violet: 'var(--nova-violet)',
  rose: 'var(--nova-rose)',
  teal: 'var(--nova-cyan)',
  orange: 'var(--nova-amber)',
  indigo: 'var(--nova-violet)',
  lime: 'var(--nova-emerald)',
  slate: 'var(--ds-text-muted)',
};

// ── Props ────────────────────────────────────────────────────────────────────
type Props = {
  data: MarketplaceRow[];
  initialService?: string;
  initialExchange?: string;
  initialGroup?: string;
};

// ── ServiceIcon ──────────────────────────────────────────────────────────────
function ServiceIcon({
  meta,
  size = 20,
}: {
  meta: ExchangeServiceMeta | undefined;
  size?: number;
}) {
  const Icon = meta?.icon ?? Banknote;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}

// ── Ambient SVG Grid (Linear-style) ─────────────────────────────────────────
// ۱۵ نقطه در ۳×۵ grid — هر کدام pulse مستقل با delay متفاوت
function AmbientGrid() {
  const COLS = 5;
  const ROWS = 3;
  const DELAY_STEP = 160; // ms بین هر نقطه
  return (
    <svg className={s.ambientGrid} viewBox="0 0 200 120" fill="none" aria-hidden focusable="false">
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => {
          const index = row * COLS + col;
          const cx = 20 + col * 40;
          const cy = 20 + row * 40;
          return (
            <circle
              key={`${row}-${col}`}
              cx={cx}
              cy={cy}
              r="2"
              className={s.ambientDot}
              style={{ animationDelay: `${index * DELAY_STEP}ms` }}
            />
          );
        }),
      )}
    </svg>
  );
}

// ── ScrollReveal hook ────────────────────────────────────────────────────────
function useScrollReveal(ref: React.RefObject<Element | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(s.revealed);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

// ── RevealSection wrapper ────────────────────────────────────────────────────
function RevealSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useScrollReveal(ref as React.RefObject<Element>);
  return (
    <div ref={ref} className={`${s.revealSection} ${className ?? ''}`}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ServicesMarketplace({
  data,
  initialService,
  initialExchange,
  initialGroup,
}: Props) {
  const router = useRouter();

  const [activeGroup, setActiveGroup] = useState<string>(initialGroup ?? 'all');
  const [activeService, setActiveService] = useState<string>(initialService ?? 'all');
  const [exchangeQuery, setExchangeQuery] = useState<string>(initialExchange ?? '');
  const [searchInput, setSearchInput] = useState<string>(initialExchange ?? '');

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeGroup !== 'all') params.set('group', activeGroup);
    if (activeService !== 'all') params.set('service', activeService);
    if (exchangeQuery) params.set('exchange', exchangeQuery);
    const qs = params.toString();
    const url = qs ? `/services?${qs}` : '/services';
    if (
      typeof window !== 'undefined' &&
      window.location.pathname + window.location.search !== url
    ) {
      router.replace(url, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, activeService, exchangeQuery]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setExchangeQuery(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // filter
  const filtered = useMemo(() => {
    return data
      .map((row) => {
        if (activeGroup !== 'all' && row.serviceGroup !== activeGroup) return null;
        if (activeService !== 'all' && row.serviceKey !== activeService) return null;
        const filteredExchanges = exchangeQuery
          ? row.exchanges.filter(
              (e) =>
                e.name.toLowerCase().includes(exchangeQuery.toLowerCase()) ||
                e.city?.toLowerCase().includes(exchangeQuery.toLowerCase()),
            )
          : row.exchanges;
        if (filteredExchanges.length === 0) return null;
        return { ...row, exchanges: filteredExchanges, count: filteredExchanges.length };
      })
      .filter((r): r is MarketplaceRow => r !== null);
  }, [data, activeGroup, activeService, exchangeQuery]);

  // counters
  const totalExchanges = useMemo(() => {
    const set = new Set<string>();
    for (const row of data) for (const e of row.exchanges) set.add(e.id);
    return set.size;
  }, [data]);
  const totalServices = data.length;
  const totalMatches = filtered.reduce((sum, r) => sum + r.count, 0);

  const resetFilters = useCallback(() => {
    setActiveGroup('all');
    setActiveService('all');
    setSearchInput('');
    setExchangeQuery('');
  }, []);

  const trackExchangeClick = (serviceKey: string, exchangeId: string) => {
    void logServiceClick({
      serviceKey,
      exchangeId,
      source: 'marketplace',
      referer: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  };

  const availableServices = useMemo(() => {
    if (activeGroup === 'all') return data;
    return data.filter((r) => r.serviceGroup === activeGroup);
  }, [data, activeGroup]);

  const hasFilter = activeGroup !== 'all' || activeService !== 'all' || exchangeQuery.length > 0;

  return (
    <main className={s.root} dir="rtl">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className={s.hero}>
        <AmbientGrid />
        <div className={s.heroInner}>
          {/* eyebrow pill */}
          <div className={s.eyebrowWrap}>
            <span className={s.eyebrow}>
              <Zap size={11} strokeWidth={2.2} aria-hidden />
              <span>بازارچه خدمات</span>
            </span>
          </div>

          {/* headline */}
          <h1 className={s.title}>
            هر خدمت مالی که نیاز دارید —
            <br />
            <span className={s.titleAccent}>یک صفحه، همه صرافی‌ها</span>
          </h1>

          <p className={s.sub}>
            خرید ارز، حواله، پرداخت آنلاین و ده‌ها سرویس دیگر. صرافی مناسب را پیدا کنید و درخواست ثبت
            کنید.
          </p>

          {/* counters strip */}
          <div className={s.counters} role="list">
            <CounterItem value={totalExchanges} label="صرافی فعال" />
            <span className={s.counterDivider} aria-hidden />
            <CounterItem value={totalServices} label="نوع سرویس" />
            <span className={s.counterDivider} aria-hidden />
            <CounterItem value={totalMatches} label="سرویس–صرافی" highlight />
          </div>

          {/* CTA row */}
          <div className={s.ctaRow}>
            <button
              type="button"
              className={s.ctaPrimary}
              onClick={() => {
                document.getElementById('services-grid')?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                });
              }}
            >
              <Plus size={15} strokeWidth={2.2} aria-hidden />
              <span>ثبت درخواست</span>
            </button>
            <Link href="/services/compare" className={s.ctaSecondary}>
              <Filter size={14} strokeWidth={1.9} aria-hidden />
              <span>جدول مقایسه</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className={s.filterBar} role="search" aria-label="فیلتر سرویس‌ها">
        <div className={s.filterInner}>
          {/* Search */}
          <label className={s.searchField}>
            <Search size={15} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              className={s.searchInput}
              placeholder="جستجوی نام صرافی یا شهر…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="جستجوی صرافی"
            />
            {searchInput && (
              <button
                type="button"
                className={s.searchClear}
                onClick={() => setSearchInput('')}
                aria-label="پاک کردن جستجو"
              >
                ×
              </button>
            )}
          </label>

          {/* Group chips */}
          <div className={s.chipRow} role="tablist" aria-label="گروه سرویس">
            <Chip
              active={activeGroup === 'all'}
              onClick={() => {
                setActiveGroup('all');
                setActiveService('all');
              }}
            >
              همه
            </Chip>
            {Object.entries(SERVICE_GROUPS).map(([key, meta]) => (
              <Chip
                key={key}
                active={activeGroup === key}
                onClick={() => {
                  setActiveGroup(key);
                  setActiveService('all');
                }}
              >
                {meta.label}
              </Chip>
            ))}
          </div>

          {/* Service sub-chips */}
          {availableServices.length > 0 && (
            <div className={s.chipRowSub} role="tablist" aria-label="نوع سرویس">
              <Chip active={activeService === 'all'} onClick={() => setActiveService('all')} sub>
                همه سرویس‌ها
              </Chip>
              {availableServices.map((row) => (
                <Chip
                  key={row.serviceKey}
                  active={activeService === row.serviceKey}
                  onClick={() => setActiveService(row.serviceKey)}
                  sub
                >
                  {row.serviceName}
                </Chip>
              ))}
            </div>
          )}

          {/* Active filter badge */}
          {hasFilter && (
            <div className={s.filterMeta}>
              <span className={s.filterCount}>
                {_faNum.format(filtered.length)} گروه سرویس · {_faNum.format(totalMatches)} نتیجه
              </span>
              <button type="button" className={s.clearBtn} onClick={resetFilters}>
                پاک کردن فیلترها
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      <div className={s.resultWrap} id="services-grid">
        {filtered.length === 0 ? (
          <Empty
            icon={Search}
            title="نتیجه‌ای پیدا نشد"
            description="با فیلتر فعلی هیچ صرافی پیدا نشد. فیلتر را تغییر دهید یا جستجوی دیگری امتحان کنید."
            action={
              <Button variant="outline" size="sm" type="button" onClick={resetFilters}>
                پاک کردن فیلترها
              </Button>
            }
          />
        ) : (
          <div className={s.groups}>
            {groupByGroup(filtered).map((group) => {
              const groupMeta = SERVICE_GROUPS[group.key as ExchangeServiceMeta['group']];
              return (
                <RevealSection key={group.key}>
                  <section aria-labelledby={`grp-${group.key}`}>
                    {/* Group header */}
                    <header className={s.groupHeader}>
                      <div className={s.groupHeaderLeft}>
                        <h2 id={`grp-${group.key}`} className={s.groupTitle}>
                          {groupMeta?.label ?? group.key}
                        </h2>
                        {groupMeta?.description && (
                          <p className={s.groupDesc}>{groupMeta.description}</p>
                        )}
                      </div>
                      <span className={s.groupBadge}>
                        {_faNum.format(group.services.length)} سرویس
                      </span>
                    </header>

                    {/* Service cards grid */}
                    <ul className={`${s.serviceGrid} stagger-children`}>
                      {group.services.map((row) => {
                        const meta = getServiceMeta(row.serviceKey);
                        const accentColor =
                          ACCENT_MAP[meta?.accent ?? 'slate'] ?? 'var(--ds-text-muted)';
                        return (
                          <li
                            key={row.serviceKey}
                            className={s.serviceCard}
                            style={{ '--service-accent': accentColor } as React.CSSProperties}
                          >
                            {/* Card header */}
                            <div className={s.cardHeader}>
                              <span className={s.cardIcon} aria-hidden>
                                <ServiceIcon meta={meta} size={22} />
                              </span>
                              <div className={s.cardHeaderText}>
                                <h3 className={s.cardTitle}>{row.serviceName}</h3>
                                {meta?.description && (
                                  <p className={s.cardDesc}>{meta.description}</p>
                                )}
                              </div>
                              <span className={s.cardBadge}>{_faNum.format(row.count)}</span>
                            </div>

                            {/* Exchange list */}
                            <ul className={s.exchangeList}>
                              {row.exchanges.map((ex) => (
                                <li key={ex.id}>
                                  <Link
                                    href={ex.ctaHref ?? `/exchanges/${ex.slug}#services`}
                                    className={s.exchangeItem}
                                    onClick={() => trackExchangeClick(row.serviceKey, ex.id)}
                                  >
                                    {/* Logo */}
                                    <span className={s.exchangeLogo} aria-hidden>
                                      {ex.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={ex.logoUrl} alt="" loading="lazy" />
                                      ) : (
                                        <span className={s.exchangeLogoFallback}>
                                          {(ex.name[0] ?? '?').toUpperCase()}
                                        </span>
                                      )}
                                    </span>

                                    {/* Info */}
                                    <span className={s.exchangeInfo}>
                                      <span className={s.exchangeName}>{ex.name}</span>
                                      {ex.city && <span className={s.exchangeCity}>{ex.city}</span>}
                                    </span>

                                    {/* Arrow */}
                                    <ChevronLeft
                                      size={14}
                                      strokeWidth={2}
                                      className={s.exchangeArrow}
                                      aria-hidden
                                    />
                                  </Link>
                                </li>
                              ))}
                            </ul>

                            {/* Card footer link */}
                            <div className={s.cardFooter}>
                              <Link
                                href={`/services?service=${row.serviceKey}`}
                                className={s.cardFooterLink}
                              >
                                مشاهده همه صرافی‌ها
                                <ChevronLeft size={12} strokeWidth={2} aria-hidden />
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </RevealSection>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CounterItem({
  value,
  label,
  highlight,
}: {
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${s.counter} ${highlight ? s.counterHighlight : ''}`} role="listitem">
      <span className={s.counterValue}>{_faNum.format(value)}</span>
      <span className={s.counterLabel}>{label}</span>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  sub?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${s.chip} ${sub ? s.chipSub : ''} ${active ? s.chipActive : ''}`}
    >
      {children}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Grouped = Array<{ key: string; services: MarketplaceRow[] }>;

function groupByGroup(rows: MarketplaceRow[]): Grouped {
  const map = new Map<string, MarketplaceRow[]>();
  for (const row of rows) {
    const arr = map.get(row.serviceGroup) ?? [];
    arr.push(row);
    map.set(row.serviceGroup, arr);
  }
  return [...map.entries()].map(([key, services]) => ({ key, services }));
}
