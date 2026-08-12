'use client';

/**
 * LedgerWorkspace — دفتر کل صرافی (premium glass, لایه‌دار).
 *
 * ساختار:
 *   ۱. Hero: ماندهٔ صندوق + نمودار مساحتِ روند مانده
 *   ۲. نوار KPI (واریز / برداشت / ورودی / آخرین مانده)
 *   ۳. InsightLayout: جدول + rail (واریز در برابر برداشت، ارزها، حساب‌ها)
 */

import { type ExchangeLedgerData, getExchangeLedger } from '@/actions/exchange-ops';
import {
  type BarItem,
  BarList,
  InsightCard,
  InsightLayout,
  InsightPanel,
  SplitBar,
  type SplitBarSegment,
} from '@/components/Dashboard/primitives/InsightPanel';
import { ExchangeKpiRibbon, type ExchangeKpiTile } from '@/components/Exchange/ExchangeKpiRibbon';
import { ExchangePageHero } from '@/components/Exchange/ExchangePageHero';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Layers,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import s from './LedgerWorkspace.module.css';

const faNum = new Intl.NumberFormat('fa-IR');

function fmtMoney(v: string | null | undefined, currency = 'AFN'): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return `${faNum.format(n)} ${currency}`;
}

function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

interface Props {
  exchangeId: string;
  initial: ExchangeLedgerData | null;
  primaryCurrency: string;
}

type DirectionFilter = 'ALL' | 'DEBIT' | 'CREDIT';

export default function LedgerWorkspace({ exchangeId, initial, primaryCurrency }: Props) {
  const [data, setData] = useState(initial);
  const [dir, setDir] = useState<DirectionFilter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows.filter((r) => {
      if (dir !== 'ALL' && r.direction !== dir) return false;
      if (!q) return true;
      return (
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.customerName ?? '').toLowerCase().includes(q) ||
        (r.accountLabel ?? '').toLowerCase().includes(q) ||
        (r.txnId ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, dir, query]);

  const balances = useMemo(() => {
    const map = new Map<string, { balance: string; currency: string }>();
    if (!data) return [];
    for (const r of data.rows) {
      if (!map.has(r.currency)) {
        map.set(r.currency, { balance: r.runningBalance, currency: r.currency });
      }
    }
    return Array.from(map.values());
  }, [data]);

  // ── دادهٔ rail ────────────────────────────────────────────────────────
  const directionSegments: SplitBarSegment[] = useMemo(() => {
    if (!data) return [];
    const out: SplitBarSegment[] = [];
    if (data.creditCount > 0)
      out.push({ label: 'واریز', value: data.creditCount, color: 'emerald' });
    if (data.debitCount > 0) out.push({ label: 'برداشت', value: data.debitCount, color: 'rose' });
    return out;
  }, [data]);

  const currencyItems: BarItem[] = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const r of data.rows) {
      map.set(r.currency, (map.get(r.currency) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, color: 'indigo' as const }));
  }, [data]);

  const accountItems: BarItem[] = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const r of data.rows) {
      const name = r.customerName ?? r.accountLabel ?? '—';
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value, color: 'emerald' as const }));
  }, [data]);

  // ── دادهٔ sparkline hero ───────────────────────────────────────────────
  const spark = useMemo(() => {
    if (!data) return [];
    return data.rows
      .slice(0, 14)
      .reverse()
      .map((r) => Number(r.runningBalance) || 0);
  }, [data]);

  const latestBalance = balances[0];

  async function reload() {
    setLoading(true);
    try {
      const res = await getExchangeLedger(exchangeId, { limit: 60, direction: dir, query });
      if (res.success) setData(res.data);
    } finally {
      setLoading(false);
    }
  }

  const dirTabs: Array<{ key: DirectionFilter; label: string }> = [
    { key: 'ALL', label: 'همه' },
    { key: 'CREDIT', label: 'واریز' },
    { key: 'DEBIT', label: 'برداشت' },
  ];

  return (
    <div className={s.root}>
      {/* ── ۱. Hero + روند مانده ──────────────────── */}
      <ExchangePageHero
        eyebrow="صرافی · مالی"
        title="دفتر کل صرافی"
        description="گردش حساب‌ها و ماندهٔ جاری — روند ماندهٔ صندوق از جدیدترین ورودی‌های دفتر"
        statValue={latestBalance ? fmtMoney(latestBalance.balance, latestBalance.currency) : '—'}
        statLabel="ماندهٔ آخرین ورودی"
        trend={
          data && data.creditTotal !== data.debitTotal
            ? {
                label: data.creditCount > data.debitCount ? 'واریزها غالب‌اند' : 'برداشت‌ها غالب‌اند',
                tone: data.creditCount > data.debitCount ? 'up' : 'down',
              }
            : { label: 'تعادل واریز/برداشت', tone: 'neutral' }
        }
        liveLabel="بروزرسانی آنی"
        visual={
          <BalanceSpark values={spark} currency={latestBalance?.currency ?? primaryCurrency} />
        }
        action={
          <button
            className={s.reload}
            onClick={reload}
            disabled={loading}
            aria-label="بارگذاری مجدد"
          >
            <RefreshCw size={15} className={loading ? s.spin : undefined} /> تازه‌سازی
          </button>
        }
      />

      {/* ── ۲. روبان KPI فشرده ───────────────────── */}
      <ExchangeKpiRibbon
        tiles={
          [
            {
              label: 'مجموع واریزها',
              value: fmtMoney(data?.creditTotal, primaryCurrency),
              icon: ArrowDownLeft,
              tone: 'emerald',
              sub: data ? `${faNum.format(data.creditCount)} واریز` : '—',
            },
            {
              label: 'مجموع برداشت‌ها',
              value: fmtMoney(data?.debitTotal, primaryCurrency),
              icon: ArrowUpRight,
              tone: 'rose',
              sub: data ? `${faNum.format(data.debitCount)} برداشت` : '—',
            },
            {
              label: 'ورودی‌های دفتر',
              value: faNum.format(data?.total ?? 0),
              icon: BookOpen,
              tone: 'sky',
              sub: 'کل ورودی‌های ثبت‌شده',
            },
            {
              label: 'ارزهای دارای گردش',
              value: faNum.format(balances.length),
              icon: Wallet,
              tone: 'slate',
              sub: 'ارزهای دارای مانده',
            },
          ] as ExchangeKpiTile[]
        }
      />

      {/* ── ۳. جدول + rail ───────────────────────── */}
      <InsightLayout
        main={
          <div className={s.workspace}>
            <div className={s.toolbar}>
              <div className={s.filters} role="tablist" aria-label="فیلتر جهت">
                {dirTabs.map((t) => (
                  <button
                    key={t.key}
                    className={`${s.pill} ${dir === t.key ? s.pillActive : ''}`}
                    onClick={() => setDir(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className={s.search}>
                <Search size={15} aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی شرح، مشتری، حساب، تراکنش…"
                  aria-label="جستجوی دفتر"
                />
              </div>
            </div>

            <div className={s.panel}>
              {filtered.length === 0 ? (
                <div className={s.empty}>
                  <div className={s.emptyIcon}>
                    <Layers size={24} />
                  </div>
                  <b>ورودی‌ای یافت نشد</b>
                  <p>فیلتر یا جستجو را تغییر دهید.</p>
                </div>
              ) : (
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>زمان</th>
                        <th className={s.stickyCol}>حساب / مشتری</th>
                        <th>شرح</th>
                        <th>جهت</th>
                        <th>مبلغ</th>
                        <th>ماندهٔ جاری</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id}>
                          <td className={s.time}>{fmtTime(r.createdAt)}</td>
                          <td className={s.stickyCol}>
                            <div className={s.account}>
                              <b>{r.customerName ?? r.accountLabel ?? '—'}</b>
                              <span dir="ltr">{r.txnId ?? ''}</span>
                            </div>
                          </td>
                          <td className={s.desc}>{r.description ?? '—'}</td>
                          <td>
                            <span
                              className={`${s.dir} ${r.direction === 'CREDIT' ? s.dirIn : s.dirOut}`}
                            >
                              {r.direction === 'CREDIT' ? (
                                <ArrowDownLeft size={13} aria-hidden />
                              ) : (
                                <ArrowUpRight size={13} aria-hidden />
                              )}
                              {r.direction === 'CREDIT' ? 'واریز' : 'برداشت'}
                            </span>
                          </td>
                          <td className={r.direction === 'CREDIT' ? s.amountIn : s.amountOut}>
                            {fmtMoney(r.amount, r.currency)}
                          </td>
                          <td className={s.balance} dir="ltr">
                            {fmtMoney(r.runningBalance, r.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        }
        aside={
          <InsightPanel>
            <InsightCard title="واریز در برابر برداشت" icon={ArrowDownLeft}>
              <SplitBar data={directionSegments} />
            </InsightCard>
            <InsightCard title="ارزهای دارای گردش" icon={Wallet}>
              <BarList data={currencyItems} />
            </InsightCard>
            <InsightCard title="حساب‌های پرگردش" icon={BookOpen}>
              <BarList data={accountItems} />
            </InsightCard>
          </InsightPanel>
        }
      />
    </div>
  );
}

// ─── Balance sparkline visual ───────────────────────────────────────────────

function BalanceSpark({ values, currency }: { values: number[]; currency: string }) {
  const W = 320;
  const H = 110;
  const pts = values.length > 1 ? values : [0, 0];
  const max = Math.max(...pts, 1);
  const min = Math.min(...pts, 0);
  const range = max - min || 1;
  const step = W / (pts.length - 1 || 1);

  const line = pts
    .map(
      (v, i) => `${(i * step).toFixed(1)},${(H - 8 - ((v - min) / range) * (H - 16)).toFixed(1)}`,
    )
    .join(' ');
  const area = `0,${H} ${line} ${W},${H}`;

  const gradId = 'ledgerSparkGrad';

  return (
    <div className={s.sparkCard}>
      <div className={s.sparkHead}>
        <span>روند ماندهٔ جاری (آخرین ورودی‌ها)</span>
        <b>{fmtMoney(String(pts[pts.length - 1]), currency)}</b>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={s.sparkSvg} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ds-brand-500)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--ds-brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--ds-brand-500)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={W}
          cy={H - 8 - ((pts[pts.length - 1] - min) / range) * (H - 16)}
          r="4"
          fill="var(--ds-brand-500)"
          stroke="#fff"
          strokeWidth="2"
        />
      </svg>
      <div className={s.sparkFoot}>
        <span>قدیمی‌ترین</span>
        <span>جدیدترین</span>
      </div>
    </div>
  );
}
