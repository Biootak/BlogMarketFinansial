'use client';

/**
 * QuotesWorkspace — کابین مالی صراف: مدیریت قیمت‌های خرید/فروش.
 *
 * بازطراحی v2 (2026-08-01):
 *  - نمای شبکه‌ای کارت (موبایل/تبلت) + جدول مرتب‌پذیر (دسکتاپ)
 *  - فیلتر وضعیت، جستجو، مرتب‌سازی (نرخ/اسپرد/زمان/نسخه)
 *  - ثبت قیمت جدید در PanelDrawer + جزئیات/تاریخچهٔ quote در PanelDrawer
 *  - فقط داده واقعی DB؛ هیچ mock نیست. عملیات از actions موجود.
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { EmptyState, SearchInput } from '@/components/Dashboard/primitives';
import {
  QUOTE_STATUS_FA,
  QUOTE_STATUS_KEYS,
  countdownLabel,
  formatDateTime,
  quoteNumber,
  spreadPct,
} from '@/lib/exchange-quotes-labels';
import { ArrowDownUp, Clock, History, Plus, RefreshCw, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { QuoteCard } from './QuoteCard';
import { QuoteComposer } from './QuoteComposer';
import { QuoteDetailsDrawer } from './QuoteDetailsDrawer';
import s from './QuotesWorkspace.module.css';

interface Props {
  exchangeId: string;
  allowedCurrencies: string[];
  initialQuotes: QuoteRow[];
}

type SortKey = 'updatedAt' | 'buyRate' | 'sellRate' | 'spread' | 'version';

export default function QuotesWorkspace({ exchangeId, allowedCurrencies, initialQuotes }: Props) {
  const [quotes, setQuotes] = useState<QuoteRow[]>(initialQuotes);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // drawer ها
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ساعت زندهٔ countdown — هر ۳۰ ثانیه
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const selected = useMemo(
    () => quotes.find((q) => q.id === selectedId) ?? null,
    [quotes, selectedId],
  );

  const handleSaved = (quote: QuoteRow) => {
    setQuotes((prev) => [
      quote,
      ...prev.filter((q) => !(q.currencyCode === quote.currencyCode && q.status === 'PENDING')),
    ]);
  };

  // ── فیلتر + جستجو + مرتب‌سازی ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = quotes;
    if (statusFilter !== 'ALL') list = list.filter((q) => q.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (x) => x.currencyCode.toLowerCase().includes(q) || x.currencyPair.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'updatedAt') cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
      else if (sortKey === 'buyRate') cmp = Number(a.buyRate) - Number(b.buyRate);
      else if (sortKey === 'sellRate') cmp = Number(a.sellRate) - Number(b.sellRate);
      else if (sortKey === 'spread') {
        cmp = spreadRatio(a) - spreadRatio(b);
      } else cmp = a.version - b.version;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [quotes, statusFilter, query, sortKey, sortDir]);

  function spreadRatio(q: QuoteRow): number {
    const b = Number(q.buyRate);
    const s = Number(q.sellRate);
    if (!Number.isFinite(b) || !Number.isFinite(s) || b <= 0) return 0;
    return (s - b) / b;
  }

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = { ALL: quotes.length };
    for (const q of quotes) m[q.status] = (m[q.status] ?? 0) + 1;
    return m;
  }, [quotes]);

  const showTable = filtered.length > 0;

  return (
    <div className={s.root}>
      {/* ── نوار ابزار ─────────────────────────────────────────────────── */}
      <div className={s.toolbar}>
        <div className={s.toolbarFilters}>
          {(['ALL', ...QUOTE_STATUS_KEYS] as string[]).map((key) => {
            const st = key === 'ALL' ? null : QUOTE_STATUS_FA[key];
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                className={s.chip}
                data-active={active}
                data-tone={st?.tone}
                onClick={() => setStatusFilter(key)}
                aria-pressed={active}
              >
                {key === 'ALL' ? 'همه' : st?.label}
                <span className={s.chipCount}>{counts[key] ?? 0}</span>
              </button>
            );
          })}
        </div>

        <div className={s.toolbarControls}>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="جستجوی ارز یا جفت…"
            ariaLabel="جستجوی قیمت"
            className={s.search}
          />
          <button type="button" className={s.btnPrimary} onClick={() => setFormOpen(true)}>
            <Plus size={16} aria-hidden />
            ثبت قیمت جدید
          </button>
        </div>
      </div>

      {/* ── لیست خالی ──────────────────────────────────────────────────── */}
      {!showTable ? (
        <div className={s.emptyWrap}>
          <EmptyState
            icon={query || statusFilter !== 'ALL' ? SearchX : RefreshCw}
            title={query || statusFilter !== 'ALL' ? 'نتیجه‌ای یافت نشد' : 'هنوز قیمتی ثبت نشده'}
            description={
              query || statusFilter !== 'ALL'
                ? 'با جستجو یا فیلتر دیگری امتحان کنید.'
                : 'اولین قیمت را ثبت کنید تا در سایت نمایش داده شود.'
            }
            action={
              query || statusFilter !== 'ALL' ? (
                <button
                  type="button"
                  className={s.btnGhost}
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('ALL');
                  }}
                >
                  پاک‌سازی فیلترها
                </button>
              ) : (
                <button type="button" className={s.btnPrimary} onClick={() => setFormOpen(true)}>
                  <Plus size={16} aria-hidden />
                  ثبت اولین قیمت
                </button>
              )
            }
          />
        </div>
      ) : (
        <>
          {/* ── نمای موبایل/تبلت: کارت‌ها ─────────────────────────────── */}
          <div className={s.cardGrid} aria-label="قیمت‌های ثبت‌شده">
            {filtered.map((q) => (
              <QuoteCard key={q.id} quote={q} nowMs={nowMs} onSelect={setSelectedId} />
            ))}
          </div>

          {/* ── نمای دسکتاپ: جدول ─────────────────────────────────────── */}
          <div className={s.tableWrap}>
            <div className={s.tableScroll}>
              <table className={s.table} aria-label="قیمت‌های ثبت‌شده">
                <thead>
                  <tr className={s.tableHead}>
                    <th scope="col" className={s.thCurrency}>
                      ارز
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className={s.thSort}
                        onClick={() => toggleSort('buyRate')}
                      >
                        خرید
                        <ArrowDownUp size={13} aria-hidden />
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className={s.thSort}
                        onClick={() => toggleSort('sellRate')}
                      >
                        فروش
                        <ArrowDownUp size={13} aria-hidden />
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        className={s.thSort}
                        onClick={() => toggleSort('spread')}
                      >
                        اسپرد
                        <ArrowDownUp size={13} aria-hidden />
                      </button>
                    </th>
                    <th scope="col">وضعیت</th>
                    <th scope="col">
                      <button
                        type="button"
                        className={s.thSort}
                        onClick={() => toggleSort('updatedAt')}
                      >
                        آخرین تغییر
                        <ArrowDownUp size={13} aria-hidden />
                      </button>
                    </th>
                    <th scope="col" className={s.thExpiry}>
                      انقضا / پیام
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => {
                    const st = QUOTE_STATUS_FA[q.status] ?? {
                      label: q.status,
                      tone: 'muted' as const,
                    };
                    const active = q.status === 'ACTIVE';
                    return (
                      <tr key={q.id} className={s.tableRow} data-status={q.status}>
                        <td className={s.tdCurrency}>
                          <button
                            type="button"
                            className={s.currencyBtn}
                            onClick={() => setSelectedId(q.id)}
                          >
                            <span className={s.tdCode} dir="ltr">
                              {q.currencyCode}
                            </span>
                            <span className={s.tdPair} dir="ltr">
                              {q.currencyPair}
                            </span>
                          </button>
                        </td>
                        <td className={s.tdNum} dir="ltr">
                          {quoteNumber(q.buyRate)}
                        </td>
                        <td className={s.tdNum} dir="ltr">
                          {quoteNumber(q.sellRate)}
                        </td>
                        <td className={s.tdSpread} dir="ltr">
                          {spreadPct(q.buyRate, q.sellRate)}
                        </td>
                        <td>
                          <output className={s.statusPill} data-tone={st.tone}>
                            {active && <span className={s.liveDot} aria-hidden />}
                            {st.label}
                          </output>
                        </td>
                        <td className={s.tdDate}>
                          <span className={s.tdDateValue}>{formatDateTime(q.updatedAt)}</span>
                        </td>
                        <td className={s.tdExpiry}>
                          {active && q.expiresAt ? (
                            <span className={s.countdown}>
                              <Clock size={12} aria-hidden />
                              {countdownLabel(q.expiresAt, nowMs)}
                            </span>
                          ) : q.status === 'REJECTED' && q.note ? (
                            <span className={s.rejectNote} title={q.note}>
                              {q.note.slice(0, 40)}
                              {q.note.length > 40 ? '…' : ''}
                            </span>
                          ) : q.status === 'PENDING' ? (
                            <span className={s.pendingNote}>
                              <History size={12} aria-hidden />
                              در انتظار بررسی
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={s.tableFoot}>
              <span>
                {filtered.length} از {quotes.length} قیمت
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── مودال‌ها ───────────────────────────────────────────────────── */}
      <QuoteComposer
        open={formOpen}
        exchangeId={exchangeId}
        allowedCurrencies={allowedCurrencies}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
      <QuoteDetailsDrawer
        quote={selected}
        exchangeId={exchangeId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
