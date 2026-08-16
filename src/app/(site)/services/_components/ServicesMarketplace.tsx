'use client';

/**
 * ServicesMarketplace — بازارچه مرکزی خدمات (بازطراحی 2026-08-16)
 * ─────────────────────────────────────────────────────────────────────────────
 * معماری سوپر-اپ (۴ zone — قانون §3.7):
 *   1. Hero signature — constellation شناور سرویس‌های اصلی روی گرید dot-pulse
 *   2. شروع سریع — tile های Careem-style برای پرکاربردترین سرویس‌ها
 *   3. بازارچه — segmented tabs + چیپ سرویس + گرید کارت (featured span-2)
 *   4. چطور کار می‌کند — utility strip ۳ مرحله‌ای
 *
 * Data: از getMarketplaceCatalog (کاتالوگ کامل + پوشش DB)
 * Motion: CSS-only (opacity/transform) — dot-pulse ambient + stagger + spring
 * Research: پروب زنده MCP از Stripe / Wise / Revolut / Careem (2026-08-16)
 */

import { type MarketplaceRow, logServiceClick } from '@/actions/exchange-services';
import Empty from '@/components/Empty';
import { Button } from '@/components/ui/button';
import { type ExchangeServiceMeta, SERVICE_GROUPS, getServiceMeta } from '@/lib/exchange-services';
import {
  Banknote,
  ChevronLeft,
  CircleCheck,
  ClipboardList,
  Clock3,
  Filter,
  MousePointerClick,
  PhoneCall,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './ServicesMarketplace.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

/** سرویس‌های «شروع سریع» — پرکاربردترین مسیرها (Careem-style quick actions) */
const QUICK_ACTION_KEYS = [
  'INTERNATIONAL_TRANSFER',
  'CURRENCY_BUY',
  'CRYPTO_BUY',
  'ONLINE_PAYMENT',
  'MOBILE_TOPUP',
  'BILL_PAYMENT',
] as const;

/** accent token map (از lib/exchange-services.ts) */
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
}: { meta: ExchangeServiceMeta | undefined; size?: number }) {
  const Icon = meta?.icon ?? Banknote;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}

// ── Ambient SVG Grid (Linear dot-pulse — خانواده سایت) ──────────────────────
function AmbientGrid({ className }: { className?: string }) {
  const COLS = 5;
  const ROWS = 3;
  const DELAY_STEP = 160;
  return (
    <svg
      className={`${s.ambientGrid} ${className ?? ''}`}
      viewBox="0 0 200 120"
      fill="none"
      aria-hidden
      focusable="false"
    >
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

// ── Hero Constellation — signature moment ────────────────────────────────────
const CONSTELLATION = [
  { key: 'CURRENCY_BUY', label: 'خرید ارز' },
  { key: 'INTERNATIONAL_TRANSFER', label: 'حواله' },
  { key: 'CRYPTO_BUY', label: 'رمزارز' },
  { key: 'ONLINE_PAYMENT', label: 'پرداخت' },
  { key: 'MOBILE_TOPUP', label: 'شارژ' },
] as const;

function HeroConstellation() {
  return (
    <div className={s.constellation} aria-hidden="true">
      <AmbientGrid className={s.constDots} />
      {CONSTELLATION.map((item, i) => {
        const meta = getServiceMeta(item.key);
        const accent = ACCENT_MAP[meta?.accent ?? 'slate'];
        return (
          <span
            key={item.key}
            className={s.constTile}
            style={
              {
                '--const-accent': accent,
                animationDelay: `${200 + i * 90}ms`,
              } as React.CSSProperties
            }
            data-tile={i}
          >
            <ServiceIcon meta={meta} size={i === 1 ? 24 : 20} />
          </span>
        );
      })}
    </div>
  );
}

// ── ScrollReveal ─────────────────────────────────────────────────────────────
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

// ── Main ─────────────────────────────────────────────────────────────────────
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
        // سرویس‌های پوشش‌داده‌نشده (count 0): بدون جستجوی صرافی دیده شوند (به‌زودی)
        if (filteredExchanges.length === 0 && exchangeQuery) return null;
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
  const solo = filtered.length === 1;

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
      {/* ══════════ Zone 1 — Hero signature ══════════ */}
      <header className={s.hero}>
        <div className={s.heroInner}>
          <div className={s.heroText}>
            <div className={s.eyebrowWrap}>
              <span className={s.eyebrow}>
                <Zap size={11} strokeWidth={2.2} aria-hidden />
                <span>بازارچه خدمات آنلاین</span>
              </span>
            </div>

            <h1 className={s.title}>
              هر خدمت مالی که نیاز دارید،
              <br />
              <span className={s.titleAccent}>یک بازارچه، همه صرافی‌ها</span>
            </h1>

            <p className={s.sub}>
              خرید ارز، حواله، پرداخت آنلاین، شارژ موبایل و ده‌ها سرویس دیگر — صرافی مناسب را پیدا
              کنید و سفارش خود را آنلاین ثبت کنید.
            </p>

            <div className={s.ctaRow}>
              <Link href="/services/order" className={s.ctaPrimary}>
                <Plus size={15} strokeWidth={2.2} aria-hidden />
                <span>ثبت سفارش</span>
              </Link>
              <Link href="/services/compare" className={s.ctaSecondary}>
                <Filter size={14} strokeWidth={1.9} aria-hidden />
                <span>جدول مقایسه</span>
              </Link>
            </div>

            <div className={s.heroStats} role="list">
              <span className={s.heroStat} role="listitem">
                <strong className={s.heroStatValue}>{_faNum.format(totalExchanges)}</strong>
                <span className={s.heroStatLabel}>صرافی فعال</span>
              </span>
              <span className={s.heroStatDivider} aria-hidden />
              <span className={s.heroStat} role="listitem">
                <strong className={s.heroStatValue}>{_faNum.format(totalServices)}</strong>
                <span className={s.heroStatLabel}>نوع سرویس</span>
              </span>
              <span className={s.heroStatDivider} aria-hidden />
              <span className={s.heroStat} role="listitem">
                <strong className={s.heroStatValue}>
                  <Clock3 size={14} aria-hidden />
                  ۳۰′
                </strong>
                <span className={s.heroStatLabel}>پاسخ کارشناس</span>
              </span>
            </div>
          </div>

          <HeroConstellation />
        </div>
      </header>

      {/* ══════════ Zone 2 — شروع سریع (quick actions) ══════════ */}
      <RevealSection>
        <section className={s.zone} aria-labelledby="quick-title">
          <header className={s.zoneHeader}>
            <div>
              <h2 id="quick-title" className={s.zoneTitle}>
                شروع سریع
              </h2>
              <p className={s.zoneSub}>پرکاربردترین خدمات — با یک کلیک سفارش ثبت کنید</p>
            </div>
            <span className={s.zoneBadge}>
              <Sparkles size={12} aria-hidden /> بدون مراجعه حضوری
            </span>
          </header>

          <ul className={s.quickGrid}>
            {QUICK_ACTION_KEYS.map((key) => {
              const row = data.find((r) => r.serviceKey === key);
              if (!row) return null;
              const meta = getServiceMeta(row.serviceKey);
              const accent = ACCENT_MAP[meta?.accent ?? 'slate'];
              return (
                <li key={key}>
                  <Link
                    href={`/services/order?service=${row.serviceKey}`}
                    className={s.quickTile}
                    style={{ '--qa-accent': accent } as React.CSSProperties}
                  >
                    <span className={s.quickIcon} aria-hidden>
                      <ServiceIcon meta={meta} size={20} />
                    </span>
                    <span className={s.quickText}>
                      <span className={s.quickName}>{row.serviceName}</span>
                      <span className={s.quickSub}>
                        {row.count > 0
                          ? `${_faNum.format(row.count)} صرافی فعال`
                          : 'درخواست آنلاین'}
                      </span>
                    </span>
                    <ChevronLeft size={15} strokeWidth={2} className={s.quickArrow} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </RevealSection>

      {/* ══════════ Zone 3 — بازارچه (catalog) ══════════ */}
      <RevealSection>
        <section className={s.zone} id="services-grid" aria-labelledby="catalog-title">
          <header className={s.catalogHeader}>
            <div>
              <h2 id="catalog-title" className={s.zoneTitle}>
                همه سرویس‌ها
              </h2>
              <p className={s.zoneSub}>
                {_faNum.format(totalServices)} سرویس · {_faNum.format(totalMatches)} سرویس–صرافی
                فعال
              </p>
            </div>

            <label className={s.searchField}>
              <Search size={15} strokeWidth={1.8} aria-hidden />
              <input
                type="search"
                className={s.searchInput}
                placeholder="جستجوی صرافی یا شهر…"
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
          </header>

          {/* Segmented group tabs */}
          <div className={s.segTabs} role="tablist" aria-label="گروه سرویس">
            <button
              type="button"
              role="tab"
              aria-selected={activeGroup === 'all'}
              onClick={() => {
                setActiveGroup('all');
                setActiveService('all');
              }}
              className={`${s.segTab} ${activeGroup === 'all' ? s.segTabActive : ''}`}
            >
              همه
            </button>
            {Object.entries(SERVICE_GROUPS).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeGroup === key}
                onClick={() => {
                  setActiveGroup(key);
                  setActiveService('all');
                }}
                className={`${s.segTab} ${activeGroup === key ? s.segTabActive : ''}`}
              >
                {meta.label}
              </button>
            ))}
          </div>

          {/* Service sub-chips */}
          {availableServices.length > 0 && (
            <div className={s.subChips} role="tablist" aria-label="نوع سرویس">
              <Chip active={activeService === 'all'} onClick={() => setActiveService('all')}>
                همه سرویس‌ها
              </Chip>
              {availableServices.map((row) => (
                <Chip
                  key={row.serviceKey}
                  active={activeService === row.serviceKey}
                  onClick={() => setActiveService(row.serviceKey)}
                >
                  {row.serviceName}
                </Chip>
              ))}
            </div>
          )}

          {/* Active filter meta */}
          {hasFilter && (
            <div className={s.filterMeta}>
              <span className={s.filterCount}>
                {_faNum.format(filtered.length)} سرویس · {_faNum.format(totalMatches)} نتیجه
              </span>
              <button type="button" className={s.clearBtn} onClick={resetFilters}>
                پاک کردن فیلترها
              </button>
            </div>
          )}

          {/* Grid */}
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
            <ul className={`${s.serviceGrid} stagger-children`}>
              {filtered.map((row, i) => {
                const featured = i === 0;
                return (
                  <ServiceCard
                    key={row.serviceKey}
                    row={row}
                    featured={featured}
                    solo={solo}
                    trackClick={trackExchangeClick}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </RevealSection>

      {/* ══════════ Zone 4 — چطور کار می‌کند (utility) ══════════ */}
      <RevealSection>
        <section className={s.zone} aria-labelledby="how-title">
          <header className={s.zoneHeader}>
            <div>
              <h2 id="how-title" className={s.zoneTitle}>
                چطور کار می‌کند؟
              </h2>
              <p className={s.zoneSub}>از انتخاب تا انجام — سه قدم ساده</p>
            </div>
          </header>

          <ol className={s.steps}>
            <li className={s.step}>
              <span className={s.stepIcon} aria-hidden>
                <MousePointerClick size={20} />
              </span>
              <span className={s.stepNum}>۱</span>
              <h3 className={s.stepTitle}>سرویس را انتخاب کنید</h3>
              <p className={s.stepBody}>
                از بین {_faNum.format(totalServices)} سرویس مالی، گزینه خود را بیابید.
              </p>
            </li>
            <li className={s.step}>
              <span className={s.stepIcon} aria-hidden>
                <ClipboardList size={20} />
              </span>
              <span className={s.stepNum}>۲</span>
              <h3 className={s.stepTitle}>سفارش را آنلاین ثبت کنید</h3>
              <p className={s.stepBody}>فرم ۳ مرحله‌ای را در کمتر از ۲ دقیقه پر کنید.</p>
            </li>
            <li className={s.step}>
              <span className={s.stepIcon} aria-hidden>
                <PhoneCall size={20} />
              </span>
              <span className={s.stepNum}>۳</span>
              <h3 className={s.stepTitle}>کارشناس تماس می‌گیرد</h3>
              <p className={s.stepBody}>
                نرخ نهایی تأیید و سرویس انجام می‌شود —{' '}
                <ShieldCheck size={13} className={s.stepCheck} aria-hidden /> بدون هزینه پنهان.
              </p>
            </li>
          </ol>
        </section>
      </RevealSection>
    </main>
  );
}

// ── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({
  row,
  featured,
  solo,
  trackClick,
}: {
  row: MarketplaceRow;
  featured: boolean;
  solo: boolean;
  trackClick: (serviceKey: string, exchangeId: string) => void;
}) {
  const meta = getServiceMeta(row.serviceKey);
  const accent = ACCENT_MAP[meta?.accent ?? 'slate'];
  const covered = row.count > 0;
  // solo (فیلتر یک سرویس) → همه صرافی‌ها؛ وگرنه حداکثر ۳
  const visibleExchanges = solo ? row.exchanges : row.exchanges.slice(0, 3);
  const hasMore = !solo && row.exchanges.length > 3;

  return (
    <li
      className={`${s.serviceCard} ${featured ? s.cardFeatured : ''} ${!covered ? s.cardEmpty : ''} ${solo ? s.cardSolo : ''}`}
      style={{ '--service-accent': accent } as React.CSSProperties}
    >
      <div className={s.cardTop}>
        <span className={s.cardIcon} aria-hidden>
          <ServiceIcon meta={meta} size={featured ? 26 : 20} />
        </span>
        <div className={s.cardHead}>
          <h3 className={s.cardTitle}>{row.serviceName}</h3>
          {meta?.description && <p className={s.cardDesc}>{meta.description}</p>}
        </div>
        {meta?.personaBadge && <span className={s.personaBadge}>{meta.personaBadge}</span>}
        {covered ? (
          <span className={s.coverageBadge} title={`${_faNum.format(row.count)} صرافی فعال`}>
            <CircleCheck size={12} aria-hidden />
            {_faNum.format(row.count)}
          </span>
        ) : (
          <span className={s.soonBadge}>به‌زودی</span>
        )}
      </div>

      {covered ? (
        <ul className={s.exchangeList} aria-label={`صرافی‌های ارائه‌دهنده ${row.serviceName}`}>
          {visibleExchanges.map((ex) => (
            <li key={ex.id}>
              <Link
                href={ex.ctaHref ?? `/exchanges/${ex.slug}#services`}
                className={s.exchangeItem}
                onClick={() => trackClick(row.serviceKey, ex.id)}
              >
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
                <span className={s.exchangeInfo}>
                  <span className={s.exchangeName}>{ex.name}</span>
                  {ex.city && <span className={s.exchangeCity}>{ex.city}</span>}
                </span>
                <ChevronLeft size={14} strokeWidth={2} className={s.exchangeArrow} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.emptyState}>
          <p className={s.emptyText}>
            هنوز صرافی فعالی این سرویس را ارائه نمی‌دهد — اما می‌توانید همین حالا درخواست ثبت کنید.
          </p>
        </div>
      )}

      <div className={s.cardFoot}>
        <Link href={`/services/order?service=${row.serviceKey}`} className={s.cardCta}>
          ثبت درخواست
          <ChevronLeft size={13} strokeWidth={2.2} aria-hidden />
        </Link>
        {hasMore && (
          <Link href={`/services?service=${row.serviceKey}`} className={s.cardLink}>
            همه {_faNum.format(row.count)} صرافی
            <ChevronLeft size={12} strokeWidth={2} aria-hidden />
          </Link>
        )}
      </div>
    </li>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({
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
