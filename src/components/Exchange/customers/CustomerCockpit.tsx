/**
 * CustomerCockpit — ارکستریتور صفحهٔ مرکز فرماندهی مشتریان.
 *
 * ساختار (radial-bento):
 *   1. Hero strip (KPI ribbon + totalCustomers)
 *   2. Bento grid بالا (2 ستون نامتقارن):
 *        - ستون راست: CustomerConstellation
 *        - ستون چپ: Segments + Risk distribution
 *   3. CustomerDirectory (grid اصلی)
 *   4. LiveWirePanel (پایین)
 *   5. CustomerBulkBar (overlay وقتی selected > 0)
 *   6. CustomerEditDrawer (overlay)
 */

'use client';

import {
  type CustomerActivityPulse,
  type CustomerRiskBucket,
  type CustomerRow,
  type CustomerSegment,
  type CustomerStats,
  type CustomerTopRow,
} from '@/actions/exchange-customers';
import { PageHeader } from '@/components/Dashboard/primitives';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useCustomerFilters } from '@/hooks/useCustomerFilters';
import {
  formatCompact,
  formatNumber,
  formatPercent,
  formatPhone,
  getInitials,
  riskLabel,
  riskTone,
} from '@/lib/customer-format';
import { RISK_BUCKET_META, STATUS_META } from '@/lib/customer-segments';
import { Activity, ShieldAlert, Sparkles, TrendingUp, Users } from 'lucide-react';
import type { CSSProperties } from 'react';
import { CustomerBulkBar } from './CustomerBulkBar';
import { CustomerConstellation } from './CustomerConstellation';
import {
  CustomerDirectory,
  type CustomerDirectoryFilters,
} from './CustomerDirectory';
import { CustomerEditDrawer } from './CustomerEditDrawer';
import { LiveWirePanel } from './LiveWirePanel';
import s from './CustomerCockpit.module.css';

interface Props {
  exchangeId: string;
  currency: string;
  customers: CustomerRow[];
  stats: CustomerStats;
  segments: CustomerSegment[];
  riskBuckets: CustomerRiskBucket[];
  pulse: CustomerActivityPulse;
  topCustomers: CustomerTopRow[];
  canWrite: boolean;
}

export function CustomerCockpit({
  exchangeId,
  currency,
  customers,
  stats,
  segments,
  riskBuckets,
  pulse,
  topCustomers,
  canWrite,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  // local state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);

  // filters + selection (مالک اصلی state — به directory پاس می‌دهیم)
  const {
    filters,
    setFilters,
    sort,
    setSort,
    toggleSort,
    sorted,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    cityOptions,
    resetFilters,
  } = useCustomerFilters(customers);

  // wrapper برای رابط controlled directory (تحول functional update)
  const onFiltersChange = useCallback(
    (
      update: (prev: CustomerDirectoryFilters) => CustomerDirectoryFilters,
    ) => {
      setFilters((prev: CustomerDirectoryFilters) => update(prev));
    },
    [setFilters],
  );

  // map id → activity for Constellation
  const activityMap = useMemo(() => {
    const m = new Map<string, { count: number; volume: number }>();
    for (const t of topCustomers) {
      m.set(t.id, { count: t.txnCount, volume: Number(t.totalVolume) / 100 });
    }
    return m;
  }, [topCustomers]);

  // Handlers
  const openAdd = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((row: CustomerRow) => {
    setEditing(row);
    setDrawerOpen(true);
  }, []);

  const handleSaved = useCallback(
    (saved: CustomerRow) => {
      setDrawerOpen(false);
      setEditing(null);
      toast({
        title: 'ذخیره شد',
        description: saved.fullName,
      });
      router.refresh();
    },
    [toast, router],
  );

  return (
    <div className={s.root} dir="rtl">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        breadcrumb={[{ label: 'پنل صرافی' }, { label: 'مشتریان' }]}
        title="مرکز فرماندهی مشتریان"
        description="مدیریت، تحلیل و اقدام روی مشتریان صرافی — همه چیز در یک نما"
        eyebrow="Cockpit ۲۰۲۶"
        icon="users"
        accent="emerald"
      />

      {/* ── Hero KPI ribbon (radial center) ─────────────────────────── */}
      <section className={s.hero} aria-label="آمار کلی">
        <div className={s.heroBackdrop} aria-hidden />

        <div className={s.heroHead}>
          <span className={s.heroEyebrow}>
            <Sparkles size={13} aria-hidden />
            snapshot زنده
          </span>
          <h2 className={s.heroTitle}>اکوسیستم مشتریان صرافی</h2>
          <p className={s.heroSub}>
            <span dir="ltr">{formatNumber(stats.total)}</span>{' '}
            مشتری ثبت‌شده · <span dir="ltr">{formatNumber(stats.active)}</span> فعال
          </p>
        </div>

        <div className={s.heroKpis} role="list">
          {[
            {
              label: 'کل',
              value: stats.total,
              tone: 'emerald' as const,
              icon: Users,
              sub: `+${formatNumber(stats.newLast7d)} هفتهٔ اخیر`,
            },
            {
              label: 'فعال',
              value: stats.active,
              tone: 'emerald' as const,
              icon: Activity,
              sub: formatPercent(stats.activationRate),
            },
            {
              label: 'پرریسک',
              value: stats.highRisk,
              tone: 'rose' as const,
              icon: ShieldAlert,
              sub: stats.highRisk === 0 ? 'امن' : 'نیاز به بررسی',
            },
            {
              label: 'KYC در انتظار',
              value: stats.kycPending,
              tone: 'amber' as const,
              icon: TrendingUp,
              sub: `${formatNumber(stats.kycApproved)} تأیید شده`,
            },
          ].map((tile, i) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.label}
                role="listitem"
                className={s.kpi}
                data-tone={tile.tone}
                style={{ '--i': i } as CSSProperties}
              >
                <span className={s.kpiIcon} data-tone={tile.tone}>
                  <Icon size={14} aria-hidden />
                </span>
                <span className={s.kpiValue}>{formatNumber(tile.value)}</span>
                <span className={s.kpiLabel}>{tile.label}</span>
                <span className={s.kpiSub}>{tile.sub}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Bento upper (segments + risk + constellation) ──────────── */}
      <section className={s.bento} aria-label="تحلیل">
        {/* Top customers list */}
        <article className={s.panel}>
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>پنج مشتری برتر ۳۰ روز اخیر</h3>
            <span className={s.panelMeta}>بر اساس حجم تراکنش</span>
          </header>
          {topCustomers.length === 0 ? (
            <p className={s.empty}>هنوز تراکنش فعالی ندارید.</p>
          ) : (
            <ol className={s.topList} aria-label="پنج مشتری برتر">
              {topCustomers.map((t, i) => {
                const tone = i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze';
                return (
                  <li key={t.id} className={s.topItem}>
                    <span className={s.topRank} data-tone={tone} aria-hidden>
                      {i + 1}
                    </span>
                    <span
                      className={s.topAvatar}
                      style={{
                        background: `oklch(91% 0.04 ${(t.riskScore * 3.6) % 360})`,
                      }}
                      aria-hidden
                    >
                      {getInitials(t.fullName)}
                    </span>
                    <span className={s.topInfo}>
                      <span className={s.topName}>{t.fullName}</span>
                      <span className={s.topMeta} dir="ltr">
                        {formatPhone(t.phone)}
                        {t.city ? ` · ${t.city}` : ''}
                      </span>
                    </span>
                    <span className={s.topAmount}>
                      <span className={s.topAmountVal}>
                        {formatCompact(BigInt(t.totalVolume) / BigInt(100))} {currency}
                      </span>
                      <span className={s.topAmountSub}>
                        {formatNumber(t.txnCount)} تراکنش
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </article>

        {/* Segments + Risk radial-ish bars */}
        <article className={s.panel}>
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>سهم وضعیت‌ها</h3>
            <span className={s.panelMeta}>توزیع کنونی</span>
          </header>
          <ul className={s.segmentList} aria-label="سهم هر وضعیت">
            {segments.map((seg) => {
              const meta = STATUS_META[seg.id as keyof typeof STATUS_META];
              const pct = (seg.share * 100).toFixed(1);
              return (
                <li key={seg.id} className={s.segmentItem}>
                  <span className={s.segmentLabel}>
                    <span className={s.segmentDot} data-tone={seg.tone} aria-hidden />
                    {seg.label}
                  </span>
                  <span className={s.segmentBar} aria-hidden>
                    <span
                      className={s.segmentFill}
                      data-tone={seg.tone}
                      style={{ '--pct': `${pct}%` } as CSSProperties}
                    />
                  </span>
                  <span className={s.segmentValue}>
                    <span className={s.segmentCount}>{formatNumber(seg.count)}</span>
                    <span className={s.segmentPct}>{formatNumber(Math.round(seg.share * 100))}٪</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className={s.panelHint} aria-hidden>
            {metaHint(segments)}
          </p>
        </article>

        {/* Risk distribution radial */}
        <article className={s.panel}>
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>توزیع ریسک</h3>
            <span className={s.panelMeta}>میانگین {formatNumber(Math.round(stats.avgRisk))}/۱۰۰</span>
          </header>
          <div className={s.riskRing} role="img" aria-label="نمودار رادار ریسک">
            <svg viewBox="-110 -110 220 220" className={s.riskSvg}>
              {riskBuckets.map((b, i) => {
                const pct = b.share;
                const start = -Math.PI / 2 + (i / 3) * Math.PI * 2 - Math.PI / 3;
                const end = start + Math.PI * 2 * pct;
                if (pct === 0) return null;
                const r = 80;
                const x1 = Math.cos(start) * r;
                const y1 = Math.sin(start) * r;
                const x2 = Math.cos(end) * r;
                const y2 = Math.sin(end) * r;
                const large = pct > 0.5 ? 1 : 0;
                return (
                  <path
                    key={b.bucket}
                    d={`M0,0 L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
                    fill={`var(--at-${b.tone})`}
                    opacity="0.85"
                  />
                );
              })}
              <circle r="44" fill="var(--at-bg-elevated)" />
              <text
                textAnchor="middle"
                y="-2"
                fontSize="11"
                fontWeight="700"
                fill="var(--at-fg)"
                fontFamily="inherit"
              >
                {formatNumber(stats.total)}
              </text>
              <text
                textAnchor="middle"
                y="14"
                fontSize="9"
                fill="var(--at-fg-muted)"
                fontFamily="inherit"
              >
                مشتری
              </text>
            </svg>
            <ul className={s.riskLegend}>
              {riskBuckets.map((b) => (
                <li key={b.bucket} className={s.riskLegendItem}>
                  <span
                    className={s.riskLegendDot}
                    data-tone={b.tone}
                    aria-hidden
                  />
                  <span className={s.riskLegendLabel}>{RISK_BUCKET_META[b.bucket].label}</span>
                  <span className={s.riskLegendVal}>
                    {formatNumber(b.count)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        {/* Constellation */}
        <article className={`${s.panel} ${s.panelWide}`}>
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>نقشه هم‌بندی</h3>
            <span className={s.panelMeta}>
              نمایش node از تراکنش‌های ۳۰ روز اخیر
            </span>
          </header>
          <CustomerConstellation
            customers={topCustomers.map((t) => ({
              id: t.id,
              exchangeId,
              fullName: t.fullName,
              fatherName: null,
              nationalId: null,
              passportNo: null,
              phone: t.phone,
              email: null,
              address: null,
              city: t.city,
              status: t.status,
              kycLevel: t.kycLevel,
              kycStatus: 'APPROVED',
              personalLimitAf: null,
              riskScore: t.riskScore,
              notes: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }))}
            activity={activityMap}
            currency={currency}
          />
        </article>
      </section>

      {/* ── Top cities + last activity summary ────────────────────── */}
      <section className={s.bentoSmall} aria-label="جغرافیا و ریسک">
        <article className={s.panel}>
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>شهرهای برتر</h3>
            <span className={s.panelMeta}>۵ شهر با بیشترین مشتری</span>
          </header>
          {stats.topCities.length === 0 ? (
            <p className={s.empty}>هنوز شهری ثبت نشده.</p>
          ) : (
            <ul className={s.cityList} aria-label="شهرهای برتر">
              {stats.topCities.map((c: { city: string; count: number }) => {
                const max = stats.topCities[0]?.count ?? 1;
                const pct = Math.max(8, (c.count / max) * 100);
                return (
                  <li key={c.city} className={s.cityItem}>
                    <span className={s.cityName}>{c.city}</span>
                    <span className={s.cityBar} aria-hidden>
                      <span
                        className={s.cityBarFill}
                        style={{ '--pct': `${pct}%` } as CSSProperties}
                      />
                    </span>
                    <span className={s.cityCount}>{formatNumber(c.count)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className={s.panel}>
          <header className={s.panelHead}>
            <h3 className={s.panelTitle}>مشتریان پرریسک</h3>
            <span className={s.panelMeta}>نیازمند بازنگری</span>
          </header>
          {(() => {
            const risky = customers
              .filter((c) => c.riskScore > 70)
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 5);
            if (risky.length === 0) {
              return <p className={s.empty}>مشتری پرریسکی ثبت نشده.</p>;
            }
            return (
              <ul className={s.riskyList} aria-label="مشتریان پرریسک">
                {risky.map((c) => {
                  const tone = riskTone(c.riskScore);
                  return (
                    <li key={c.id} className={s.riskyItem}>
                      <span
                        className={s.riskyAvatar}
                        style={{
                          background: `oklch(91% 0.04 ${(c.riskScore * 3.6) % 360})`,
                        }}
                        aria-hidden
                      >
                        {getInitials(c.fullName)}
                      </span>
                      <span className={s.riskyInfo}>
                        <span className={s.riskyName}>{c.fullName}</span>
                        <span className={s.riskyMeta} dir="ltr">
                          {formatPhone(c.phone)}
                        </span>
                      </span>
                      <span className={s.riskyScore} data-tone={tone}>
                        {c.riskScore}
                        <span className={s.riskyLabel}>{riskLabel(c.riskScore)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </article>
      </section>

      {/* ── Main directory ────────────────────────────────────────── */}
      <section className={s.directorySection} aria-label="فهرست مشتریان">
        <header className={s.directoryHead}>
          <h2 className={s.directoryTitle}>دایرکتوری مشتریان</h2>
          <p className={s.directorySub}>
            جستجو، فیلتر، انتخاب گروهی و ویرایش سریع
          </p>
        </header>
        <CustomerDirectory
          rows={customers}
          canWrite={canWrite}
          sorted={sorted}
          filters={filters}
          cityOptions={cityOptions}
          sort={sort}
          selectedIds={selectedIds}
          onFiltersChange={onFiltersChange}
          onSortChange={setSort}
          onToggleSort={toggleSort}
          onToggleSelected={toggleSelected}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onResetFilters={resetFilters}
          onAdd={openAdd}
          onSelectCustomer={openEdit}
          onEditCustomer={openEdit}
        />
      </section>

      {/* ── Live wire ─────────────────────────────────────────────── */}
      <LiveWirePanel pulse={pulse} currency={currency} />

      {/* ── Bulk action bar (overlay) ─────────────────────────────── */}
      <CustomerBulkBar
        exchangeId={exchangeId}
        selectedIds={selectedIds}
        rows={sorted}
        onClear={clearSelection}
      />

      {/* ── Edit drawer (overlay) ────────────────────────────────── */}
      <CustomerEditDrawer
        open={drawerOpen}
        exchangeId={exchangeId}
        initialData={editing}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}

function metaHint(segments: CustomerSegment[]): string {
  const active = segments.find((s) => s.id === 'ACTIVE');
  if (!active) return '—';
  if (active.share >= 0.8) return 'اکثریت قریب به اتفاق مشتریان فعال هستند.';
  if (active.share >= 0.5) return 'بیش از نیمی از مشتریان فعال‌اند.';
  if (active.share >= 0.3) return 'نسبت فعال‌ها متوسط است — اقدام لازم.';
  return 'اکثریت مشتریان غیرفعال — نیاز به کمپین فعال‌سازی.';
}

export default CustomerCockpit;
