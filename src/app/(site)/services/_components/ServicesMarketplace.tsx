'use client';

/**
 * ServicesMarketplace — UI component for /services central hub.
 *
 *  Pattern: Marketplace hub
 *  - Hero: توضیح + counters (صرافی‌ها، خدمات، درخواست‌های فعال)
 *  - Filter bar: chip-tabs برای گروه + service
 *  - Result list: گروه‌بندی بر اساس serviceGroup
 *  - Empty state برای فیلتر بدون نتیجه
 *
 *  URL state: query params ?service=...&group=... (برای اشتراک‌گذاری)
 */

import { type MarketplaceRow, logServiceClick } from '@/actions/exchange-services';
import Empty from '@/components/Empty';
import { Button } from '@/components/ui/button';
import { type ExchangeServiceMeta, SERVICE_GROUPS, getServiceMeta } from '@/lib/exchange-services';
import { Banknote, Filter, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import s from './ServicesMarketplace.module.css';

const _faNum = new Intl.NumberFormat('fa-IR');

type Props = {
  data: MarketplaceRow[];
  initialService?: string;
  initialExchange?: string;
  initialGroup?: string;
};

function ServiceIcon({
  meta,
  size = 18,
  strokeWidth = 1.8,
}: {
  meta: ExchangeServiceMeta | undefined;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = meta?.icon ?? Banknote;
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden />;
}

export default function ServicesMarketplace({
  data,
  initialService,
  initialExchange,
  initialGroup,
}: Props) {
  const router = useRouter();

  // ── state از URL (synced) ─────────────────────────────────────────
  const [activeGroup, setActiveGroup] = useState<string>(initialGroup ?? 'all');
  const [activeService, setActiveService] = useState<string>(initialService ?? 'all');
  const [exchangeQuery, setExchangeQuery] = useState<string>(initialExchange ?? '');
  const [searchInput, setSearchInput] = useState<string>(initialExchange ?? '');

  // ── URL sync ─────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeGroup !== 'all') params.set('group', activeGroup);
    if (activeService !== 'all') params.set('service', activeService);
    if (exchangeQuery) params.set('exchange', exchangeQuery);
    const qs = params.toString();
    const url = qs ? `/services?${qs}` : '/services';
    // فقط اگر تغییر کرده
    if (
      typeof window !== 'undefined' &&
      window.location.pathname + window.location.search !== url
    ) {
      router.replace(url, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, activeService, exchangeQuery]);

  // ── debounce search input ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setExchangeQuery(searchInput.trim()), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── filter ────────────────────────────────────────────────────────
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

  // ── counters ─────────────────────────────────────────────────────
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

  // Fire-and-forget analytics — وقتی کاربر از بازارچه روی یک صرافی کلیک می‌کند
  // source='marketplace' تا بفهمیم کدام سرویس‌ها مشتری را به صرافی می‌رسانند
  const trackExchangeClick = (serviceKey: string, exchangeId: string) => {
    void logServiceClick({
      serviceKey,
      exchangeId,
      source: 'marketplace',
      referer: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  };

  // ── سرویس‌های قابل فیلتر بر اساس group فعال ───────────────────────
  const availableServices = useMemo(() => {
    if (activeGroup === 'all') return data;
    return data.filter((r) => r.serviceGroup === activeGroup);
  }, [data, activeGroup]);

  return (
    <main className={s.root} dir="rtl">
      {/* ── Hero ─────────────────────────────────────────── */}
      <header className={s.hero}>
        <div className={s.heroInner}>
          <span className={s.eyebrow}>
            <Search size={12} strokeWidth={1.9} aria-hidden />
            <span>خدمات صرافی‌ها</span>
          </span>
          <h1 className={s.title}>
            پیدا کردن صرافی مناسب برای هر خدمت — <span className={s.titleAccent}>در یک نگاه</span>
          </h1>
          <p className={s.sub}>
            همه خدمات آنلاین صرافی‌ها را در یک صفحه ببینید. فیلتر کنید، مقایسه کنید، درخواست ثبت
            کنید.
          </p>

          {/* Counters */}
          <div className={s.counters} role="list">
            <div className={s.counter} role="listitem">
              <span className={s.counterValue}>{_faNum.format(totalExchanges)}</span>
              <span className={s.counterLabel}>صرافی فعال</span>
            </div>
            <span className={s.counterDivider} aria-hidden />
            <div className={s.counter} role="listitem">
              <span className={s.counterValue}>{_faNum.format(totalServices)}</span>
              <span className={s.counterLabel}>خدمت</span>
            </div>
            <span className={s.counterDivider} aria-hidden />
            <div className={s.counter} role="listitem">
              <span className={s.counterValue}>{_faNum.format(totalMatches)}</span>
              <span className={s.counterLabel}>صرافی-خدمت</span>
            </div>
          </div>

          <div className={s.heroCta}>
            <Link href="/services/compare" className={s.compareLink}>
              <Filter size={14} strokeWidth={1.9} aria-hidden />
              <span>مشاهده جدول مقایسه</span>
            </Link>
            {/* R14-fix (2026-07-29): ثبت درخواست سریع — primary CTA در hero.
                کاربران می‌توانند بدون لاگین از طریق exchangeServiceRequestDialog ثبت کنند. */}
            <button
              type="button"
              className={s.primaryLink}
              onClick={() => {
                // به اولین سرویس فعال scroll + auto-open dialog از exchange card
                const target = document.getElementById('services-grid');
                target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              aria-label="ثبت درخواست جدید"
            >
              <Plus size={14} strokeWidth={2.2} aria-hidden />
              <span>ثبت درخواست جدید</span>
            </button>
            <span className={s.heroHint}>برای مقایسه همزمان همه صرافی‌ها در یک نگاه</span>
          </div>
        </div>
      </header>

      {/* ── Filter Bar ──────────────────────────────────── */}
      <div className={s.filterBar} role="search">
        <div className={s.filterInner}>
          {/* Search input */}
          <label className={s.searchField}>
            <Search size={16} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              className={s.searchInput}
              placeholder="جستجوی نام صرافی یا شهر..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="جستجوی صرافی"
            />
          </label>

          {/* Group chips */}
          <div className={s.chips} role="tablist" aria-label="گروه خدمات">
            <Chip
              active={activeGroup === 'all'}
              onClick={() => {
                setActiveGroup('all');
                setActiveService('all');
              }}
            >
              همه گروه‌ها
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

          {/* Service chips (dynamic based on group) */}
          {availableServices.length > 0 && (
            <div className={s.chips} role="tablist" aria-label="خدمت">
              <Chip
                active={activeService === 'all'}
                onClick={() => setActiveService('all')}
                variant="sub"
              >
                همه خدمات
              </Chip>
              {availableServices.map((row) => (
                <Chip
                  key={row.serviceKey}
                  active={activeService === row.serviceKey}
                  onClick={() => setActiveService(row.serviceKey)}
                  variant="sub"
                >
                  {row.serviceName}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Result ──────────────────────────────────────── */}
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
            {groupByGroup(filtered).map((group) => (
              <section key={group.key} className={s.group} aria-labelledby={`grp-${group.key}`}>
                <header className={s.groupHeader}>
                  <h2 id={`grp-${group.key}`} className={s.groupTitle}>
                    {SERVICE_GROUPS[group.key as ExchangeServiceMeta['group']]?.label ?? group.key}
                  </h2>
                  <span className={s.groupCount}>{_faNum.format(group.services.length)} خدمت</span>
                </header>

                <ul className={s.serviceList}>
                  {group.services.map((row) => {
                    const meta = getServiceMeta(row.serviceKey);
                    return (
                      <li key={row.serviceKey} className={s.serviceCard}>
                        <header className={s.serviceHeader}>
                          <div className={s.serviceIcon} aria-hidden>
                            <ServiceIcon meta={meta} />
                          </div>
                          <div className={s.serviceHeaderText}>
                            <h3 className={s.serviceName}>{row.serviceName}</h3>
                            <p className={s.serviceMeta}>
                              <span>{_faNum.format(row.count)} صرافی</span>
                            </p>
                          </div>
                        </header>

                        <ul className={s.exchangeList}>
                          {row.exchanges.map((ex) => (
                            <li key={ex.id} className={s.exchangeItem}>
                              <Link
                                href={`/exchanges/${ex.slug}#services`}
                                className={s.exchangeLink}
                                onClick={() => trackExchangeClick(row.serviceKey, ex.id)}
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
                                <span className={s.exchangeArrow} aria-hidden>
                                  ←
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function Chip({
  active,
  onClick,
  children,
  variant = 'primary',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'sub';
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`${s.chip} ${s[`chip_${variant}`] ?? ''} ${active ? s.chipActive : ''}`}
    >
      {children}
    </button>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

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
