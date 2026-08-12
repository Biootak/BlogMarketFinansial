'use client';

/**
 * LedgerWorkspace — دفتر کل صرافی (premium glass).
 *
 * - KPI: مجموع واریز / مجموع برداشت / تعداد ورودی / ماندهٔ آخرین ورودی هر ارز
 * - فیلتر جهت (همه/واریز/برداشت) + جستجو
 * - جدول: زمان، حساب/مشتری، شرح، جهت، مبلغ، ماندهٔ جاری
 * - اسکرول افقی در موبایل با ستون «حساب» چسبان
 */

import { type ExchangeLedgerData, getExchangeLedger } from '@/actions/exchange-ops';
import { KpiCard } from '@/components/Dashboard/primitives/KpiCard';
import { StatGrid } from '@/components/Dashboard/primitives/StatGrid';
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
      <StatGrid>
        <KpiCard
          label="مجموع واریزها"
          value={fmtMoney(data?.creditTotal, primaryCurrency)}
          icon={ArrowDownLeft}
          trend="up"
          info={`${data ? faNum.format(data.creditCount) : '۰'} واریز در بازه`}
        />
        <KpiCard
          label="مجموع برداشت‌ها"
          value={fmtMoney(data?.debitTotal, primaryCurrency)}
          icon={ArrowUpRight}
          trend="down"
          info={`${data ? faNum.format(data.debitCount) : '۰'} برداشت در بازه`}
        />
        <KpiCard
          label="ورودی‌های دفتر"
          value={data?.total ?? 0}
          icon={BookOpen}
          info="کل ورودی‌های ثبت‌شدهٔ این صرافی"
        />
        <KpiCard
          label="ماندهٔ آخرین ورودی"
          value={
            balances.length > 0
              ? `${faNum.format(Number(balances[0].balance))} ${balances[0].currency}`
              : '—'
          }
          icon={Wallet}
          info="جدیدترین ماندهٔ جاری ثبت‌شده"
        />
      </StatGrid>

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
        <div className={s.toolbarRight}>
          <div className={s.search}>
            <Search size={15} aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی شرح، مشتری، حساب، تراکنش…"
              aria-label="جستجوی دفتر"
            />
          </div>
          <button
            className={s.reload}
            onClick={reload}
            disabled={loading}
            aria-label="بارگذاری مجدد"
          >
            <RefreshCw size={15} className={loading ? s.spin : undefined} />
          </button>
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
                        <span className="mono" dir="ltr">
                          {r.txnId ?? ''}
                        </span>
                      </div>
                    </td>
                    <td className={s.desc}>{r.description ?? '—'}</td>
                    <td>
                      <span className={`${s.dir} ${r.direction === 'CREDIT' ? s.dirIn : s.dirOut}`}>
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
  );
}
