'use client';

/**
 * ComparisonMatrixView — UI برای جدول مقایسه Layer 4.
 *
 *  الگو:
 *  - Hero با counter «X صرافی × Y سرویس = Z سرویس-صرافی»
 *  - Filter: فقط نمایش گروه انتخابی (currency/transfer/payment/crypto/specialty)
 *  - Table:
 *      • اولین ستون: نام صرافی + لوگو
 *      • ستون‌ها: هر سرویس با icon کوچک
 *      • سلول: ✓ سبز یا — خاکستری
 *      • hover روی سلول: tooltip با leadTimeMin و description
 *  - Sort: با کلیک روی header صرافی، بر اساس serviceCount
 *  - Highlight: اگر ?exchange=slug، آن ردیف متمایز می‌شود
 *  - Empty state: اگر هیچ صرافی فعالی سرویسی نداشت
 *
 *  UX: scroll افقی smooth روی موبایل، sticky first column
 */

import type { ComparisonMatrix } from '@/actions/exchange-services';
import { SERVICE_GROUPS, getServiceMeta } from '@/lib/exchange-services';
import { ArrowDown, ArrowUp, Filter, Info, Search } from 'lucide-react';
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

export default function ComparisonMatrixView({ matrix, initialExchange, initialGroup }: Props) {
  const router = useRouter();

  const [activeGroup, setActiveGroup] = useState<string>(initialGroup ?? 'all');
  const [search, setSearch] = useState<string>('');
  const [highlighted, setHighlighted] = useState<string | null>(initialExchange ?? null);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // ── URL sync ─────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeGroup !== 'all') params.set('group', activeGroup);
    if (highlighted) params.set('exchange', highlighted);
    const qs = params.toString();
    const url = qs ? `/services/compare?${qs}` : '/services/compare';
    if (
      typeof window !== 'undefined' &&
      window.location.pathname + window.location.search !== url
    ) {
      router.replace(url, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup, highlighted]);

  // ── filter services by group ─────────────────────────────────
  const visibleServiceKeys = useMemo(() => {
    if (activeGroup === 'all') {
      return new Set(matrix.services.map((s) => s.key));
    }
    return new Set(matrix.services.filter((s) => s.group === activeGroup).map((s) => s.key));
  }, [matrix.services, activeGroup]);

  // ── filter exchanges by search ───────────────────────────────
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
  const totalServices = visibleServiceKeys.size;
  const totalCells = visibleExchanges.length * totalServices;
  const filledCells = visibleExchanges.reduce((sum, ex) => {
    return sum + Array.from(visibleServiceKeys).filter((k) => ex.cells[k]).length;
  }, 0);
  const fillRate = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;

  // ── row highlight style ──────────────────────────────────────
  const onRowClick = useCallback((slug: string) => {
    setHighlighted((prev) => (prev === slug ? null : slug));
  }, []);

  if (matrix.exchanges.length === 0) {
    return (
      <main className={s.emptyPage} dir="rtl">
        <div className={s.empty}>
          <Filter size={28} strokeWidth={1.5} aria-hidden />
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
      {/* ── Hero ──────────────────────────────────────────── */}
      <header className={s.hero}>
        <div className={s.heroInner}>
          <span className={s.eyebrow}>
            <Filter size={12} strokeWidth={1.9} aria-hidden />
            <span>مقایسه خدمات</span>
          </span>
          <h1 className={s.title}>
            کدام صرافی چه خدماتی <span className={s.titleAccent}>آنلاین</span> ارائه می‌دهد؟
          </h1>
          <p className={s.sub}>یک جدول، تمام تفاوت‌ها — برای انتخاب سریع‌تر.</p>

          <div className={s.counters} role="list">
            <div className={s.counter} role="listitem">
              <span className={s.counterValue}>
                {_faNum.format(visibleExchanges.length)}
              </span>
              <span className={s.counterLabel}>صرافی فعال</span>
            </div>
            <span className={s.counterDivider} aria-hidden />
            <div className={s.counter} role="listitem">
              <span className={s.counterValue}>
                {_faNum.format(totalServices)}
              </span>
              <span className={s.counterLabel}>خدمت</span>
            </div>
            <span className={s.counterDivider} aria-hidden />
            <div className={s.counter} role="listitem">
              <span className={s.counterValue}>
                {_faNum.format(fillRate)}٪
              </span>
              <span className={s.counterLabel}>پوشش</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div className={s.toolbar} role="toolbar" aria-label="ابزار فیلتر">
        <div className={s.toolbarInner}>
          {/* Search */}
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

          {/* Group chips */}
          <div className={s.chips} role="tablist" aria-label="گروه">
            <GroupChip active={activeGroup === 'all'} onClick={() => setActiveGroup('all')}>
              همه
            </GroupChip>
            {Object.entries(SERVICE_GROUPS).map(([key, meta]) => (
              <GroupChip key={key} active={activeGroup === key} onClick={() => setActiveGroup(key)}>
                {meta.label}
              </GroupChip>
            ))}
          </div>

          {/* Sort toggle */}
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

      {/* ── Matrix Table ──────────────────────────────────── */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.stickyCol} scope="col">
                <span>صرافی</span>
              </th>
              {matrix.services
                .filter((svc) => visibleServiceKeys.has(svc.key))
                .map((svc) => {
                  const meta = getServiceMeta(svc.key);
                  const Icon = meta?.icon;
                  return (
                    <th key={svc.key} className={s.svcHead} scope="col">
                      <span className={s.svcHeadInner}>
                        {Icon && <Icon size={14} strokeWidth={1.8} aria-hidden />}
                        <span>{svc.name}</span>
                      </span>
                    </th>
                  );
                })}
              <th className={s.countHead} scope="col">
                <span>تعداد</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleExchanges.map((ex) => {
              const isHighlighted = highlighted === ex.exchangeSlug;
              return (
                <tr
                  key={ex.exchangeId}
                  className={`${s.row} ${isHighlighted ? s.rowHighlighted : ''}`}
                  onClick={() => onRowClick(ex.exchangeSlug)}
                >
                  <th scope="row" className={`${s.stickyCol} ${s.exchangeCell}`}>
                    <Link
                      href={`/exchanges/${ex.exchangeSlug}#services`}
                      className={s.exchangeLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={s.exchangeLogo} aria-hidden>
                        {ex.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ex.logoUrl} alt="" loading="lazy" />
                        ) : (
                          <span className={s.exchangeLogoFallback}>
                            {(ex.exchangeName[0] ?? '?').toUpperCase()}
                          </span>
                        )}
                      </span>
                      <span className={s.exchangeInfo}>
                        <span className={s.exchangeName}>{ex.exchangeName}</span>
                        {ex.city && <span className={s.exchangeCity}>{ex.city}</span>}
                      </span>
                    </Link>
                  </th>
                  {matrix.services
                    .filter((svc) => visibleServiceKeys.has(svc.key))
                    .map((svc) => {
                      const has = ex.cells[svc.key];
                      const lead = ex.leadTimes[svc.key];
                      return (
                        <td key={svc.key} className={`${s.cell} ${has ? s.cellYes : s.cellNo}`}>
                          {has ? (
                            <span
                              className={s.cellYesIcon}
                              aria-label={`دارد${lead ? ` - ${formatLeadTime(lead)}` : ''}`}
                              title={lead ? `پاسخ‌گویی: ${formatLeadTime(lead)}` : 'دارد'}
                            >
                              ✓
                              {lead != null && (
                                <span className={s.cellLead}>{formatLeadTime(lead)}</span>
                              )}
                            </span>
                          ) : (
                            <span className={s.cellNoIcon} aria-label="ندارد">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  <td className={s.countCell}>
                    <span className={s.countValue}>
                      {_faNum.format(ex.serviceCount)}
                    </span>
                    <span className={s.countLabel}>
                      از {_faNum.format(visibleServiceKeys.size)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Legend ─────────────────────────────────────────── */}
      <div className={s.legend} role="note">
        <Info size={14} strokeWidth={1.8} aria-hidden />
        <span>
          کلیک روی ردیف، آن صرافی را در جدول highlight می‌کند. برای دیدن جزئیات هر سرویس، روی نام
          صرافی کلیک کنید.
        </span>
      </div>
    </main>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */

function formatLeadTime(min: number): string {
  if (min < 60) return `${min} دقیقه`;
  if (min < 60 * 24) {
    const hours = Math.floor(min / 60);
    return `${_faNum.format(hours)} ساعت`;
  }
  const days = Math.floor(min / (60 * 24));
  return `${_faNum.format(days)} روز`;
}

/* ── Sub-components ───────────────────────────────────────── */

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
