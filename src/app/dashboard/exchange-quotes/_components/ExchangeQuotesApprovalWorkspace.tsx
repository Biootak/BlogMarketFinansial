'use client';

/**
 * ExchangeQuotesApprovalWorkspace — 2026 Billion-Dollar Approval Queue
 *
 * طراحی: Linear × Mercury × Ramp — Market Intelligence Command Center
 *
 * ویژگی‌های کلیدی:
 *  - Split-view: لیست کارت‌های scrollable + Detail Panel ثابت
 *  - KPI strip با glass + accent hairline + stagger animation
 *  - Urgency tiers: spread >3% = ambient breath border + urgent badge
 *  - SpreadPulse SVG: gradient bar با 3 threshold marker
 *  - Detail panel: نمایش همه اطلاعات + spread intel + note
 *  - Reject Dialog با textarea (نه inline input)
 *  - Batch approve با checkbox selection
 *  - Keyboard nav: j/k = حرکت، Enter = تأیید، d = رد، Esc = بستن panel
 *  - Sticky frosted toolbar با currency filter
 *  - همه states: loading / empty / error / success / disabled
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { approveQuote, rejectQuote } from '@/actions/exchange-quotes';
import { ConfirmDialog, EmptyState, MillionDollarEmpty, PageHeader } from '@/components/Dashboard/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Coins,
  Info,
  Layers,
  Loader2,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import s from './ExchangeQuotesApprovalWorkspace.module.css';

interface Props {
  initialPending: QuoteRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcSpread(buy: number, sell: number): number {
  if (buy <= 0) return 0;
  return ((sell - buy) / buy) * 100;
}

function fmtRate(val: string | number): string {
  return Number(val).toLocaleString('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string | Date): string {
  return new Date(iso).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function fmtDateRelative(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${new Intl.NumberFormat('fa-IR').format(mins)} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${new Intl.NumberFormat('fa-IR').format(hrs)} ساعت پیش`;
  return fmtDate(iso);
}

type SpreadLevel = 'low' | 'mid' | 'high';
function spreadLevel(pct: number): SpreadLevel {
  if (pct <= 1) return 'low';
  if (pct <= 3) return 'mid';
  return 'high';
}

function spreadLevelLabel(level: SpreadLevel): string {
  if (level === 'low') return 'اسپرد پایین';
  if (level === 'mid') return 'اسپرد متوسط';
  return 'اسپرد بالا';
}

// ─── SpreadPulse — 2026 inline SVG visualization ─────────────────────────────

function SpreadPulse({ spreadPct }: { spreadPct: number }) {
  const level = spreadLevel(spreadPct);
  const pct = Math.min(spreadPct, 6);
  const filled = (pct / 6) * 100;
  // SVG sparkline: 3 sentinel dots at 16.7%, 50%, 100% = 1%, 3%, 6%
  return (
    <div className={s.spreadPulse} data-level={level} title={`اسپرد: ${spreadPct.toFixed(2)}٪`}>
      <div className={s.spreadTrack}>
        <div className={s.spreadFill} style={{ width: `${filled}%` }} />
        {/* threshold hairlines */}
        <div className={s.spreadThreshold} style={{ insetInlineStart: '16.7%' }} aria-hidden />
        <div className={s.spreadThreshold} style={{ insetInlineStart: '50%' }} aria-hidden />
      </div>
      <span className={s.spreadLabel}>{spreadPct.toFixed(2)}٪</span>
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
  delay?: number;
  urgent?: boolean;
  sub?: string;
}

function KpiCard({ icon: Icon, label, value, accent, delay = 0, urgent, sub }: KpiCardProps) {
  return (
    <div
      className={`${s.kpiCard} ${urgent ? s.kpiCardUrgent : ''}`}
      style={{ '--kpi-accent': accent, '--kpi-delay': `${delay}ms` } as React.CSSProperties}
    >
      <div className={s.kpiIconWrap}>
        <Icon size={16} aria-hidden />
      </div>
      <div className={s.kpiBody}>
        <span className={s.kpiVal}>{value}</span>
        <span className={s.kpiLbl}>{label}</span>
        {sub && <span className={s.kpiSub}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  quote: QuoteRow;
  onApprove: () => void;
  onReject: () => void;
  isLoading: boolean;
}

function DetailPanel({ quote, onApprove, onReject, isLoading }: DetailPanelProps) {
  const spread = calcSpread(Number(quote.buyRate), Number(quote.sellRate));
  const level = spreadLevel(spread);

  return (
    <aside className={s.detailPanel} aria-label="جزئیات quote">
      {/* Exchange identity */}
      <div className={s.dpHead}>
        <div className={s.dpAvatar} aria-hidden>
          {(quote.exchangeName ?? quote.exchangeId).charAt(0).toUpperCase()}
        </div>
        <div className={s.dpNameGroup}>
          <strong className={s.dpName}>{quote.exchangeName ?? quote.exchangeId}</strong>
          {quote.exchangeCity && <span className={s.dpCity}>{quote.exchangeCity}</span>}
        </div>
        <Badge className={`${s.dpCurrencyBadge}`} variant="outline">
          {quote.currencyCode}
        </Badge>
      </div>

      {/* Rate cards */}
      <div className={s.dpRateGrid}>
        <div className={`${s.dpRateCard} ${s.dpBuyCard}`}>
          <div className={s.dpRateLbl}>
            <TrendingUp size={12} aria-hidden /> خرید
          </div>
          <div className={s.dpRateVal}>{fmtRate(quote.buyRate)}</div>
        </div>
        <div className={`${s.dpRateCard} ${s.dpSellCard}`}>
          <div className={s.dpRateLbl}>
            <TrendingDown size={12} aria-hidden /> فروش
          </div>
          <div className={s.dpRateVal}>{fmtRate(quote.sellRate)}</div>
        </div>
      </div>

      {/* Spread intelligence */}
      <div className={s.dpSpreadSection}>
        <div className={s.dpSpreadHeader}>
          <span className={s.dpSpreadTitle}>
            <Activity size={13} aria-hidden /> تحلیل اسپرد
          </span>
          <span className={`${s.dpSpreadBadge} ${s[`dpSpread_${level}`]}`}>
            {spreadLevelLabel(level)}
          </span>
        </div>
        <SpreadPulse spreadPct={spread} />
        <div className={s.dpSpreadGuide}>
          <span>۰٪</span>
          <span className={s.dpSpreadGuideMid}>۳٪</span>
          <span>۶٪+</span>
        </div>
      </div>

      {/* Meta info grid */}
      <dl className={s.dpMeta}>
        <div className={s.dpMetaItem}>
          <dt>جفت ارز</dt>
          <dd dir="ltr">{quote.currencyPair}</dd>
        </div>
        <div className={s.dpMetaItem}>
          <dt>واحد</dt>
          <dd>{quote.unit}</dd>
        </div>
        <div className={s.dpMetaItem}>
          <dt>اعتبار</dt>
          <dd>{new Intl.NumberFormat('fa-IR').format(quote.validMinutes)} دقیقه</dd>
        </div>
        <div className={s.dpMetaItem}>
          <dt>نسخه</dt>
          <dd>{new Intl.NumberFormat('fa-IR').format(quote.version)}</dd>
        </div>
        {quote.minAmount && (
          <div className={s.dpMetaItem}>
            <dt>حداقل مبلغ</dt>
            <dd>{fmtRate(quote.minAmount)}</dd>
          </div>
        )}
        {quote.maxAmount && (
          <div className={s.dpMetaItem}>
            <dt>حداکثر مبلغ</dt>
            <dd>{fmtRate(quote.maxAmount)}</dd>
          </div>
        )}
        <div className={`${s.dpMetaItem} ${s.dpMetaFull}`}>
          <dt>ثبت شده</dt>
          <dd>{fmtDate(quote.createdAt)}</dd>
        </div>
      </dl>

      {/* Note */}
      {quote.note && (
        <div className={s.dpNote}>
          <Info size={13} aria-hidden />
          <p>{quote.note}</p>
        </div>
      )}

      {/* Actions */}
      <div className={s.dpActions}>
        <Button
          className={s.dpApproveBtn}
          onClick={onApprove}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <Loader2 size={14} className={s.spin} aria-hidden />
          ) : (
            <CheckCircle2 size={14} aria-hidden />
          )}
          تأیید قیمت
        </Button>
        <Button variant="outline" className={s.dpRejectBtn} onClick={onReject} disabled={isLoading}>
          <XCircle size={14} aria-hidden />
          رد قیمت
        </Button>
      </div>

      <p className={s.dpKeyHint} aria-hidden>
        Enter = تأیید · D = رد · J/K = حرکت
      </p>
    </aside>
  );
}

// ─── Quote Card ───────────────────────────────────────────────────────────────

interface QuoteCardProps {
  quote: QuoteRow;
  isSelected: boolean;
  isChecked: boolean;
  isLoading: boolean;
  onSelect: () => void;
  onCheckToggle: () => void;
  rowIndex: number;
}

function QuoteCard({
  quote,
  isSelected,
  isChecked,
  isLoading,
  onSelect,
  onCheckToggle,
  rowIndex,
}: QuoteCardProps) {
  const spread = calcSpread(Number(quote.buyRate), Number(quote.sellRate));
  const level = spreadLevel(spread);
  const isUrgent = level === 'high';

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      className={`${s.card} ${isSelected ? s.cardSelected : ''} ${isUrgent ? s.cardUrgent : ''} ${isLoading ? s.cardLoading : ''}`}
      style={{ '--row-i': rowIndex } as React.CSSProperties}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {/* Checkbox */}
      <div
        className={s.cardCheck}
        role="checkbox"
        aria-checked={isChecked}
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onCheckToggle();
        }}
      >
        <div className={`${s.checkbox} ${isChecked ? s.checkboxChecked : ''}`}>
          {isChecked && <CheckCircle2 size={10} aria-hidden />}
        </div>
      </div>

      {/* Exchange info */}
      <div className={s.cardAvatar} aria-hidden>
        {(quote.exchangeName ?? quote.exchangeId).charAt(0).toUpperCase()}
      </div>

      <div className={s.cardMain}>
        <div className={s.cardTopRow}>
          <strong className={s.cardName}>{quote.exchangeName ?? quote.exchangeId}</strong>
          {quote.exchangeCity && <span className={s.cardCity}>{quote.exchangeCity}</span>}
          {isUrgent && (
            <span className={s.urgentBadge} aria-label="اسپرد بالا">
              <span className={s.urgentDot} aria-hidden />
              ریسک بالا
            </span>
          )}
        </div>

        <div className={s.cardRates}>
          <span className={s.cardBuy}>
            خرید: <strong>{fmtRate(quote.buyRate)}</strong>
          </span>
          <ArrowLeftRight size={11} className={s.cardRateArrow} aria-hidden />
          <span className={s.cardSell}>
            فروش: <strong>{fmtRate(quote.sellRate)}</strong>
          </span>
        </div>

        <SpreadPulse spreadPct={spread} />
      </div>

      <div className={s.cardMeta}>
        <Badge variant="outline" className={s.currencyBadge}>
          {quote.currencyCode}
        </Badge>
        <span className={s.cardTime}>
          <Clock size={10} aria-hidden />
          {fmtDateRelative(quote.createdAt)}
        </span>
      </div>

      {isLoading && (
        <div className={s.cardSpinner} aria-hidden>
          <Loader2 size={16} className={s.spin} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExchangeQuotesApprovalWorkspace({ initialPending }: Props) {
  const [quotes, setQuotes] = useState<QuoteRow[]>(initialPending);
  const [selectedId, setSelectedId] = useState<string | null>(initialPending[0]?.id ?? null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const avgSpread =
      quotes.length > 0
        ? quotes.reduce((sum, q) => sum + calcSpread(Number(q.buyRate), Number(q.sellRate)), 0) /
          quotes.length
        : 0;
    const highRisk = quotes.filter(
      (q) => calcSpread(Number(q.buyRate), Number(q.sellRate)) > 3,
    ).length;
    const currencies = [...new Set(quotes.map((q) => q.currencyCode))];
    return { count: quotes.length, avgSpread, highRisk, currencies };
  }, [quotes]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filterCurrency === 'all') return quotes;
    return quotes.filter((q) => q.currencyCode === filterCurrency);
  }, [quotes, filterCurrency]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedId) ?? null,
    [quotes, selectedId],
  );

  // ── Feedback helpers ──────────────────────────────────────────────────────
  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }
  function showError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  }

  // ── Single approve ─────────────────────────────────────────────────────────
  const handleApprove = useCallback(
    async (id: string) => {
      setLoadingId(id);
      const res = await approveQuote(id);
      setLoadingId(null);
      if (res.success) {
        setQuotes((prev) => {
          const next = prev.filter((q) => q.id !== id);
          // auto-select next item
          const idx = prev.findIndex((q) => q.id === id);
          const nextItem = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
          setSelectedId(nextItem?.id ?? null);
          return next;
        });
        showSuccess('قیمت تأیید شد');
      } else {
        showError(res.error.message);
      }
    },
    [],
  );

  // ── Single reject ──────────────────────────────────────────────────────────
  const handleRejectConfirm = useCallback(async () => {
    if (!selectedId || !rejectReason.trim()) return;
    const id = selectedId;
    setLoadingId(id);
    const res = await rejectQuote(id, rejectReason);
    setLoadingId(null);
    if (res.success) {
      setQuotes((prev) => {
        const next = prev.filter((q) => q.id !== id);
        const idx = prev.findIndex((q) => q.id === id);
        const nextItem = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
        setSelectedId(nextItem?.id ?? null);
        return next;
      });
      setRejectOpen(false);
      setRejectReason('');
      showSuccess('قیمت رد شد');
    } else {
      showError(res.error.message);
    }
  }, [selectedId, rejectReason]);

  // ── Batch approve ──────────────────────────────────────────────────────────
  const handleBatchApprove = useCallback(async () => {
    setBatchLoading(true);
    setBatchConfirmOpen(false);
    let ok = 0;
    let fail = 0;
    const ids = [...checked];
    for (const id of ids) {
      const res = await approveQuote(id);
      if (res.success) {
        ok++;
        setQuotes((prev) => prev.filter((q) => q.id !== id));
      } else {
        fail++;
      }
    }
    setBatchLoading(false);
    setChecked(new Set());
    if (fail === 0) {
      showSuccess(`${new Intl.NumberFormat('fa-IR').format(ok)} قیمت تأیید شد`);
    } else {
      showError(
        `${new Intl.NumberFormat('fa-IR').format(ok)} تأیید، ${new Intl.NumberFormat('fa-IR').format(fail)} خطا`,
      );
    }
  }, [checked]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      const idx = filtered.findIndex((q) => q.id === selectedId);

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = filtered[idx + 1];
        if (next) setSelectedId(next.id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = filtered[idx - 1];
        if (prev) setSelectedId(prev.id);
      } else if (e.key === 'Enter' && selectedId && !loadingId) {
        e.preventDefault();
        startTransition(() => {
          handleApprove(selectedId);
        });
      } else if ((e.key === 'd' || e.key === 'Delete') && selectedId) {
        e.preventDefault();
        setRejectOpen(true);
      } else if (e.key === 'Escape') {
        setRejectOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, selectedId, loadingId, handleApprove, startTransition]);

  // ── Check toggle ───────────────────────────────────────────────────────────
  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const checkAll = useCallback(() => {
    if (checked.size === filtered.length) setChecked(new Set());
    else setChecked(new Set(filtered.map((q) => q.id)));
  }, [checked, filtered]);

  return (
    <TooltipProvider>
      <div className={s.root} dir="rtl">
        <PageHeader
          variant="compact"
          title="صف تأیید قیمت‌گذاری"
          description="قیمت‌های خرید/فروش ثبت‌شده توسط صرافی‌ها را بررسی و تأیید یا رد کنید"
          breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تأیید قیمت‌ها' }]}
          eyebrow="Market Intelligence"
          icon="arrow-left-right"
          accent="emerald"
        />

        {/* ── KPI Strip ── */}
        <div className={s.kpiStrip} role="region" aria-label="آمار کلی">
          <KpiCard
            icon={Clock}
            label="در صف بررسی"
            value={new Intl.NumberFormat('fa-IR').format(kpi.count)}
            accent="var(--ds-accent-amber)"
            delay={0}
            urgent={kpi.count > 0}
            sub={kpi.count > 0 ? 'نیاز به بررسی' : 'صف خالی'}
          />
          <KpiCard
            icon={Scale}
            label="اسپرد میانگین"
            value={`${kpi.avgSpread.toFixed(2)}٪`}
            accent="var(--ds-brand-500)"
            delay={60}
            sub={kpi.avgSpread > 3 ? 'بالاتر از حد نرمال' : 'در محدوده نرمال'}
          />
          <KpiCard
            icon={kpi.highRisk > 0 ? AlertTriangle : ShieldCheck}
            label="اسپرد بالا (>۳٪)"
            value={new Intl.NumberFormat('fa-IR').format(kpi.highRisk)}
            accent={kpi.highRisk > 0 ? 'var(--ds-accent-rose)' : 'var(--ds-accent-emerald)'}
            delay={120}
            urgent={kpi.highRisk > 0}
            sub={kpi.highRisk > 0 ? 'نیاز به توجه فوری' : 'همه در محدوده سالم'}
          />
          <KpiCard
            icon={Coins}
            label="ارزهای متفاوت"
            value={new Intl.NumberFormat('fa-IR').format(kpi.currencies.length)}
            accent="var(--ds-accent-violet)"
            delay={180}
            sub={kpi.currencies.slice(0, 3).join(' · ')}
          />
        </div>

        {/* ── Feedback toasts ── */}
        {successMsg && (
          <output className={s.toastSuccess} aria-live="polite" role="status">
            <CheckCircle2 size={14} aria-hidden />
            {successMsg}
          </output>
        )}
        {errorMsg && (
          <output className={s.toastError} aria-live="assertive" role="alert">
            <XCircle size={14} aria-hidden />
            {errorMsg}
          </output>
        )}

        {/* ── Toolbar ── */}
        <div className={s.toolbar}>
          <div className={s.toolbarStart}>
            {/* Select all checkbox */}
            {filtered.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`${s.checkbox} ${checked.size === filtered.length && filtered.length > 0 ? s.checkboxChecked : ''}`}
                    onClick={checkAll}
                    aria-label="انتخاب همه"
                    style={{ marginInlineEnd: 'var(--ds-space-1)' }}
                  >
                    {checked.size === filtered.length && filtered.length > 0 && (
                      <CheckCircle2 size={10} aria-hidden />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>انتخاب همه</TooltipContent>
              </Tooltip>
            )}

            {/* Currency filter */}
            {kpi.currencies.length > 1 && (
              <nav className={s.filterNav} role="tablist" aria-label="فیلتر ارز">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterCurrency === 'all'}
                  className={`${s.filterBtn} ${filterCurrency === 'all' ? s.filterBtnActive : ''}`}
                  onClick={() => setFilterCurrency('all')}
                >
                  همه
                  <span className={s.filterCount}>
                    {new Intl.NumberFormat('fa-IR').format(quotes.length)}
                  </span>
                </button>
                {kpi.currencies.map((c) => {
                  const cnt = quotes.filter((q) => q.currencyCode === c).length;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="tab"
                      aria-selected={filterCurrency === c}
                      className={`${s.filterBtn} ${filterCurrency === c ? s.filterBtnActive : ''}`}
                      onClick={() => setFilterCurrency(c)}
                    >
                      {c}
                      <span className={s.filterCount}>
                        {new Intl.NumberFormat('fa-IR').format(cnt)}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className={s.toolbarEnd}>
            {/* Batch actions */}
            {checked.size > 0 && (
              <div className={s.batchBar}>
                <Layers size={13} aria-hidden />
                <span className={s.batchCount}>
                  {new Intl.NumberFormat('fa-IR').format(checked.size)} انتخاب شده
                </span>
                <Button
                  size="sm"
                  className={s.batchApproveBtn}
                  onClick={() => setBatchConfirmOpen(true)}
                  disabled={batchLoading}
                >
                  {batchLoading ? (
                    <Loader2 size={12} className={s.spin} aria-hidden />
                  ) : (
                    <CheckCircle2 size={12} aria-hidden />
                  )}
                  تأیید گروهی
                </Button>
              </div>
            )}

            {/* Keyboard hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className={s.hintBtn} aria-label="راهنمای کیبورد">
                  <Info size={14} aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className={s.kbHint}>J/K یا ↑↓ = حرکت · Enter = تأیید · D = رد</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 ? (
          <MillionDollarEmpty
            variant="shield"
            tone="emerald"
            eyebrow="مرکز تأیید"
            title="صف خالی است"
            description="همه قیمت‌ها بررسی شده‌اند. وقتی صرافی قیمت جدید ثبت کند اینجا نمایش داده می‌شود."
          />
        ) : (
          /* ── Split-view ── */
          <div className={s.splitView}>
            {/* Queue list */}
            <div
              className={s.queueList}
              ref={listRef}
              role="listbox"
              aria-label="صف قیمت‌های در انتظار"
            >
              {filtered.map((q, i) => (
                <QuoteCard
                  key={q.id}
                  quote={q}
                  isSelected={selectedId === q.id}
                  isChecked={checked.has(q.id)}
                  isLoading={loadingId === q.id}
                  onSelect={() => setSelectedId(q.id)}
                  onCheckToggle={() => toggleCheck(q.id)}
                  rowIndex={i}
                />
              ))}
            </div>

            {/* Detail Panel */}
            {selectedQuote && (
              <DetailPanel
                quote={selectedQuote}
                onApprove={() => handleApprove(selectedQuote.id)}
                onReject={() => setRejectOpen(true)}
                isLoading={loadingId === selectedQuote.id}
              />
            )}
          </div>
        )}

        {/* ── Reject Dialog ── */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-rose-600 dark:text-rose-400">رد قیمت‌گذاری</DialogTitle>
              <DialogDescription>
                {selectedQuote && (
                  <>
                    قیمت ارائه‌شده توسط{' '}
                    <strong>{selectedQuote.exchangeName ?? selectedQuote.exchangeId}</strong> برای{' '}
                    <strong>{selectedQuote.currencyCode}</strong> رد خواهد شد.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedQuote && (
              <div className={s.rejectDialogBody}>
                <div className={s.rejectQuoteSummary}>
                  <div className={s.rejectAvatarSmall} aria-hidden>
                    {(selectedQuote.exchangeName ?? selectedQuote.exchangeId).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{selectedQuote.exchangeName ?? selectedQuote.exchangeId}</strong>
                    <span className={s.rejectRateLine}>
                      خرید: {fmtRate(selectedQuote.buyRate)} · فروش: {fmtRate(selectedQuote.sellRate)}
                    </span>
                  </div>
                </div>

                <label className={s.rejectLabel} htmlFor="reject-reason">
                  دلیل رد <span aria-hidden>*</span>
                </label>
                <Textarea
                  id="reject-reason"
                  className={s.rejectTextarea}
                  placeholder="دلیل رد کردن این قیمت را بنویسید…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  // biome-ignore lint/a11y/noAutofocus: reject dialog is intentional context
                  autoFocus
                  maxLength={500}
                />
                <span className={s.rejectCharCount}>
                  {new Intl.NumberFormat('fa-IR').format(rejectReason.length)} / ۵۰۰
                </span>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectReason('');
                }}
                disabled={loadingId !== null}
              >
                انصراف
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || loadingId !== null}
                aria-busy={loadingId !== null}
              >
                {loadingId !== null ? (
                  <Loader2 size={14} className={s.spin} aria-hidden />
                ) : (
                  <XCircle size={14} aria-hidden />
                )}
                رد قیمت
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Batch Confirm ── */}
        <ConfirmDialog
          open={batchConfirmOpen}
          onOpenChange={setBatchConfirmOpen}
          title="تأیید گروهی قیمت‌ها"
          description={`${new Intl.NumberFormat('fa-IR').format(checked.size)} قیمت تأیید خواهد شد. این عمل قابل بازگشت نیست.`}
          confirmLabel="تأیید همه"
          onConfirm={handleBatchApprove}
          loading={batchLoading}
        />
      </div>
    </TooltipProvider>
  );
}
