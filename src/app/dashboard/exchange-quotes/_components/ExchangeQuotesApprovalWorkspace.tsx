'use client';

/**
 * ExchangeQuotesApprovalWorkspace — 2026 Premium Approval Command Center
 *
 * طراحی: Linear × Mercury × Bloomberg Terminal — Market Intelligence
 *
 * ویژگی‌ها:
 *  - AmbientBackground (emerald tone, low intensity)
 *  - Live status pulse bar (تعداد زنده / آخرین بروزرسانی)
 *  - View mode toggle: list ↔ grid
 *  - KPI strip با trend deltas + sparklines + gradient accent
 *  - Spread Heatmap — matrix صرافی‌ها × ارزها
 *  - Split-view: لیست scrollable + Detail Panel sticky (desktop)
 *  - Mobile: PanelDrawer به‌جای split-view
 *  - StatCard KPI (primitive reuse)
 *  - Search + Sort + Auto-refresh + Currency filter + Status filter + Filtered count
 *  - Market rate comparison (نرخ بازار vs نرخ صرافی)
 *  - Approval note در Detail Panel
 *  - Exchange logo display
 *  - Urgency tiers: spread >3% = breath border + badge
 *  - SpreadPulse visualization
 *  - Batch approve با checkbox (Radix)
 *  - Keyboard nav: j/k = حرکت، Enter = تأیید، d = رد
 *  - Compact mode موبایل
 *  - Quote History Timeline در DetailPanel
 *  - Skeleton loading states
 *  - Quick Actions row
 *  - همه tokens --ds-* / --nova-* — هیچ hardcoded hex/rgb
 *  - Anim utilities از globals.css — هیچ @keyframes سفارشی
 */

import type { QuoteRow } from '@/actions/exchange-quotes';
import { approveQuote, rejectQuote } from '@/actions/exchange-quotes';
import {
  AmbientBackground,
  ConfirmDialog,
  ExportButton,
  MillionDollarEmpty,
  PageHeader,
  PanelDrawer,
  QuickActionRow,
  SearchInput,
  Section,
  Skeleton,
  StatCard,
  StatusTimeline,
  TrendSparkline,
} from '@/components/Dashboard/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Coins,
  Grid3x3,
  ImageOff,
  Info,
  Layers,
  List,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import dpS from './DetailPanel.module.css';
import s from './ExchangeQuotesApprovalWorkspace.module.css';
import cardS from './QuoteCard.module.css';
import heatmapS from './SpreadHeatmap.module.css';

// ─── Module-level Intl singletons ─────────────────────────────────────────────
const faNum = new Intl.NumberFormat('fa-IR');

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  initialPending: QuoteRow[];
}

type SpreadLevel = 'low' | 'mid' | 'high';
type SortField = 'createdAt' | 'spread' | 'currencyCode';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';
type StatusFilter = 'all' | 'urgent' | 'normal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (mins < 60) return `${faNum.format(mins)} دقیقه پیش`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${faNum.format(hrs)} ساعت پیش`;
  return fmtDate(iso);
}

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

/** پیدا کردن نرخ بازار مرجع برای یک currency */
function findMarketRate(
  marketRates: Array<{ symbol: string; value: number; buyValue?: number; sellValue?: number }>,
  currencyCode: string,
): { rate: number; source: string } | null {
  const symbolMap: Record<string, string[]> = {
    USD: ['AFGHANI_USD', 'USDT'],
    EUR: ['AFGHANI_EUR'],
    GBP: ['AFGHANI_GBP'],
    AED: ['AFGHANI_AED'],
    TRY: ['AFGHANI_TRY'],
    SAR: ['AFGHANI_SAR'],
    CAD: ['AFGHANI_CAD'],
    AUD: ['AFGHANI_AUD'],
    CHF: ['AFGHANI_CHF'],
    CNY: ['AFGHANI_CNY'],
    JPY: ['AFGHANI_JPY'],
    KWD: ['AFGHANI_KWD'],
    IQD: ['AFGHANI_IQD'],
    RUB: ['AFGHANI_RUB'],
  };
  const symbols = symbolMap[currencyCode] ?? [];
  for (const sym of symbols) {
    const found = marketRates.find((r) => r.symbol === sym);
    if (found?.value) {
      return { rate: found.value, source: sym };
    }
  }
  return null;
}

// ─── SpreadPulse ──────────────────────────────────────────────────────────────

function SpreadPulse({ spreadPct }: { spreadPct: number }) {
  const level = spreadLevel(spreadPct);
  const pct = Math.min(spreadPct, 6);
  const filled = (pct / 6) * 100;

  return (
    <div className={cardS.spreadPulse} data-level={level} title={`اسپرد: ${spreadPct.toFixed(2)}٪`}>
      <div className={cardS.spreadTrack}>
        <div className={cardS.spreadFill} style={{ width: `${filled}%` }} />
        <div className={cardS.spreadThreshold} style={{ insetInlineStart: '16.7%' }} aria-hidden />
        <div className={cardS.spreadThreshold} style={{ insetInlineStart: '50%' }} aria-hidden />
      </div>
      <span className={cardS.spreadLabel}>{spreadPct.toFixed(2)}٪</span>
    </div>
  );
}

// ─── Spread Heatmap ───────────────────────────────────────────────────────────

interface HeatmapCellProps {
  exchangeName: string;
  spread: number;
  currencyCode: string;
  level: SpreadLevel;
}

function HeatmapCell({ exchangeName, spread, currencyCode, level }: HeatmapCellProps) {
  const intensity = Math.min(spread / 6, 1);

  return (
    <div
      className={`${heatmapS.cell} ${heatmapS[`cell_${level}`]}`}
      style={{ '--intensity': intensity } as React.CSSProperties}
      title={`${exchangeName} · ${currencyCode}: ${spread.toFixed(2)}٪`}
    >
      <span className={heatmapS.cellValue}>{spread.toFixed(1)}٪</span>
      <span className={heatmapS.cellCurrency}>{currencyCode}</span>
    </div>
  );
}

function SpreadHeatmap({ quotes }: { quotes: QuoteRow[] }) {
  // Build matrix: exchange → currency → best spread (lowest)
  const matrix = useMemo(() => {
    const map = new Map<string, Map<string, { spread: number; level: SpreadLevel }>>();
    for (const q of quotes) {
      const spread = calcSpread(Number(q.buyRate), Number(q.sellRate));
      const level = spreadLevel(spread);
      const name = q.exchangeName ?? q.exchangeId;
      if (!map.has(name)) map.set(name, new Map());
      const exchangeMap = map.get(name)!;
      const existing = exchangeMap.get(q.currencyCode);
      if (!existing || spread < existing.spread) {
        exchangeMap.set(q.currencyCode, { spread, level });
      }
    }
    return map;
  }, [quotes]);

  const exchanges = [...matrix.keys()];
  const currencies = [...new Set(quotes.map((q) => q.currencyCode))].sort();

  if (exchanges.length === 0 || currencies.length === 0) return null;

  return (
    <div className={heatmapS.root}>
      <div className={heatmapS.header}>
        <span className={heatmapS.headerTitle}>
          <Activity size={14} aria-hidden />
          نقشه حرارتی اسپرد
        </span>
        <div className={heatmapS.legend}>
          <span className={heatmapS.legendItem}>
            <span className={`${heatmapS.legendDot} ${heatmapS.legendDot_low}`} />
            ≤۱٪
          </span>
          <span className={heatmapS.legendItem}>
            <span className={`${heatmapS.legendDot} ${heatmapS.legendDot_mid}`} />
            ۱-۳٪
          </span>
          <span className={heatmapS.legendItem}>
            <span className={`${heatmapS.legendDot} ${heatmapS.legendDot_high}`} />
            {'>۳٪'}
          </span>
        </div>
      </div>
      <div className={heatmapS.grid}>
        {/* Header row */}
        <div className={heatmapS.corner} />
        {currencies.map((c) => (
          <div key={c} className={heatmapS.colHeader}>
            {c}
          </div>
        ))}

        {/* Data rows */}
        {exchanges.map((ex) => {
          const exMap = matrix.get(ex)!;
          return (
            <React.Fragment key={ex}>
              <div className={heatmapS.rowHeader}>{ex}</div>
              {currencies.map((c) => {
                const cell = exMap.get(c);
                if (!cell) {
                  return <div key={c} className={`${heatmapS.cell} ${heatmapS.cellEmpty}`} />;
                }
                return (
                  <HeatmapCell
                    key={c}
                    exchangeName={ex}
                    spread={cell.spread}
                    currencyCode={c}
                    level={cell.level}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// React import from top covers Fragment usage
import React from 'react';

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  quote: QuoteRow;
  onApprove: (note: string) => void;
  onReject: () => void;
  isLoading: boolean;
  marketRate?: { rate: number; source: string } | null;
  isMobile?: boolean;
}

function DetailPanel({
  quote,
  onApprove,
  onReject,
  isLoading,
  marketRate,
  isMobile = false,
}: DetailPanelProps) {
  const [approvalNote, setApprovalNote] = useState('');
  const spread = calcSpread(Number(quote.buyRate), Number(quote.sellRate));
  const level = spreadLevel(spread);
  const exchangeName = quote.exchangeName ?? quote.exchangeId;

  // محاسبه تفاوت با نرخ بازار
  const marketDiff = useMemo(() => {
    if (!marketRate) return null;
    const quoteAvg = (Number(quote.buyRate) + Number(quote.sellRate)) / 2;
    const diff = ((quoteAvg - marketRate.rate) / marketRate.rate) * 100;
    return { pct: diff, marketRate: marketRate.rate, source: marketRate.source };
  }, [marketRate, quote.buyRate, quote.sellRate]);

  // Quote status timeline items (from quote metadata)
  const timelineItems = useMemo(() => {
    const items: Array<{
      icon: string;
      label: string;
      description?: string;
      timestamp?: string;
      tone: 'default' | 'success' | 'warning' | 'danger' | 'info';
    }> = [];

    items.push({
      icon: 'clock',
      label: 'ثبت شد',
      description: `توسط ${exchangeName}`,
      timestamp: quote.createdAt.toISOString(),
      tone: 'info',
    });

    if (quote.approvedAt) {
      items.push({
        icon: 'check',
        label: 'تأیید شد',
        description: quote.approvedById ? 'تأیید ادمین' : undefined,
        timestamp: quote.approvedAt.toISOString(),
        tone: 'success',
      });
    }

    if (quote.note) {
      items.push({
        icon: 'file',
        label: 'یادداشت',
        description: quote.note,
        tone: 'warning',
      });
    }

    return items;
  }, [quote, exchangeName]);

  return (
    <aside
      className={`${dpS.detailPanel} ${isMobile ? dpS.detailPanelMobile : ''}`}
      aria-label="جزئیات quote"
    >
      {/* Exchange identity */}
      <div className={dpS.dpHead}>
        {quote.exchangeLogoUrl ? (
          <div className={dpS.dpAvatar} aria-hidden>
            <Image
              src={quote.exchangeLogoUrl}
              alt=""
              width={44}
              height={44}
              className="rounded-lg object-cover"
              unoptimized
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
                const parent = img.parentElement;
                if (parent) {
                  parent.textContent = exchangeName.charAt(0).toUpperCase();
                }
              }}
            />
          </div>
        ) : (
          <div className={dpS.dpAvatar} aria-hidden>
            {exchangeName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className={dpS.dpNameGroup}>
          <strong className={dpS.dpName}>{exchangeName}</strong>
          {quote.exchangeCity && <span className={dpS.dpCity}>{quote.exchangeCity}</span>}
        </div>
        <Badge className={dpS.dpCurrencyBadge} variant="outline">
          {quote.currencyCode}
        </Badge>
      </div>

      {/* Rate cards */}
      <div className={dpS.dpRateGrid}>
        <div className={`${dpS.dpRateCard} ${dpS.dpBuyCard}`}>
          <div className={dpS.dpRateLbl}>
            <TrendingUp size={12} aria-hidden />
            خرید
          </div>
          <div className={dpS.dpRateVal}>{fmtRate(quote.buyRate)}</div>
        </div>
        <div className={`${dpS.dpRateCard} ${dpS.dpSellCard}`}>
          <div className={dpS.dpRateLbl}>
            <TrendingDown size={12} aria-hidden />
            فروش
          </div>
          <div className={dpS.dpRateVal}>{fmtRate(quote.sellRate)}</div>
        </div>
      </div>

      {/* Spread intelligence */}
      <div className={dpS.dpSpreadSection}>
        <div className={dpS.dpSpreadHeader}>
          <span className={dpS.dpSpreadTitle}>
            <Activity size={13} aria-hidden />
            تحلیل اسپرد
          </span>
          <span className={`${dpS.dpSpreadBadge} ${dpS[`dpSpread_${level}`]}`}>
            {spreadLevelLabel(level)}
          </span>
        </div>
        <SpreadPulse spreadPct={spread} />
        <div className={dpS.dpSpreadGuide}>
          <span>۰٪</span>
          <span className={dpS.dpSpreadGuideMid}>۳٪</span>
          <span>۶٪+</span>
        </div>
      </div>

      {/* Market rate comparison */}
      {marketRate && marketDiff && (
        <div
          className={`${dpS.dpMarketCompare} ${marketDiff.pct > 2 || marketDiff.pct < -2 ? dpS.dpMarketCompareWarning : ''}`}
        >
          <div className={dpS.dpMarketHeader}>
            <span className={dpS.dpMarketTitle}>
              <Scale size={13} aria-hidden />
              مقایسه با بازار
            </span>
            <span
              className={`${dpS.dpMarketDiff} ${marketDiff.pct > 0 ? dpS.dpMarketDiffUp : dpS.dpMarketDiffDown}`}
            >
              {marketDiff.pct > 0 ? '+' : ''}
              {marketDiff.pct.toFixed(2)}٪
            </span>
          </div>
          <div className={dpS.dpMarketRates}>
            <span className={dpS.dpMarketLabel}>
              نرخ بازار: <strong>{fmtRate(marketDiff.marketRate)}</strong>
            </span>
            <span className={dpS.dpMarketSource}>منبع: {marketDiff.source}</span>
          </div>
        </div>
      )}

      {!marketRate && (
        <div className={dpS.dpMarketNoData}>
          <ImageOff size={13} aria-hidden />
          نرخ بازار برای این ارز موجود نیست
        </div>
      )}

      {/* Meta info grid */}
      <dl className={dpS.dpMeta}>
        <div className={dpS.dpMetaItem}>
          <dt>جفت ارز</dt>
          <dd dir="ltr">{quote.currencyPair}</dd>
        </div>
        <div className={dpS.dpMetaItem}>
          <dt>واحد</dt>
          <dd>{quote.unit}</dd>
        </div>
        <div className={dpS.dpMetaItem}>
          <dt>اعتبار</dt>
          <dd>{faNum.format(quote.validMinutes)} دقیقه</dd>
        </div>
        <div className={dpS.dpMetaItem}>
          <dt>نسخه</dt>
          <dd>{faNum.format(quote.version)}</dd>
        </div>
        {quote.minAmount && (
          <div className={dpS.dpMetaItem}>
            <dt>حداقل مبلغ</dt>
            <dd>{fmtRate(quote.minAmount)}</dd>
          </div>
        )}
        {quote.maxAmount && (
          <div className={dpS.dpMetaItem}>
            <dt>حداکثر مبلغ</dt>
            <dd>{fmtRate(quote.maxAmount)}</dd>
          </div>
        )}
        <div className={`${dpS.dpMetaItem} ${dpS.dpMetaFull}`}>
          <dt>ثبت شده</dt>
          <dd>{fmtDate(quote.createdAt)}</dd>
        </div>
      </dl>

      {/* Exchange note */}
      {quote.note && (
        <div className={dpS.dpNote}>
          <Info size={13} aria-hidden />
          <p>{quote.note}</p>
        </div>
      )}

      {/* Quote History Timeline */}
      {timelineItems.length > 1 && (
        <div>
          <h4
            className="text-xs font-bold mb-2 text-muted-foreground"
            style={{ letterSpacing: '0.05em' }}
          >
            تاریخچه
          </h4>
          <StatusTimeline items={timelineItems} maxItems={5} />
        </div>
      )}

      {/* Approval note input */}
      <div className={dpS.dpApprovalNote}>
        <label className={dpS.dpApprovalNoteLabel} htmlFor="approval-note">
          یادداشت تأیید (اختیاری)
        </label>
        <Textarea
          id="approval-note"
          className={dpS.dpApprovalNoteTextarea}
          placeholder="یادداشت خود را بنویسید…"
          value={approvalNote}
          onChange={(e) => setApprovalNote(e.target.value)}
          rows={2}
          maxLength={300}
        />
      </div>

      {/* Actions */}
      <div className={dpS.dpActions}>
        <Button
          className={dpS.dpApproveBtn}
          onClick={() => onApprove(approvalNote)}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <CheckCircle2 size={14} aria-hidden />
          )}
          تأیید قیمت
        </Button>
        <Button
          variant="outline"
          className={dpS.dpRejectBtn}
          onClick={onReject}
          disabled={isLoading}
        >
          <XCircle size={14} aria-hidden />
          رد قیمت
        </Button>
      </div>

      {!isMobile && (
        <p className={dpS.dpKeyHint} aria-hidden>
          Enter = تأیید · D = رد · J/K = حرکت
        </p>
      )}
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
  viewMode: ViewMode;
}

function QuoteCard({
  quote,
  isSelected,
  isChecked,
  isLoading,
  onSelect,
  onCheckToggle,
  rowIndex,
  viewMode,
}: QuoteCardProps) {
  const spread = calcSpread(Number(quote.buyRate), Number(quote.sellRate));
  const level = spreadLevel(spread);
  const isUrgent = level === 'high';
  const exchangeName = quote.exchangeName ?? quote.exchangeId;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      className={`${cardS.card} ${isSelected ? cardS.cardSelected : ''} ${isUrgent ? cardS.cardUrgent : ''} ${isLoading ? cardS.cardLoading : ''} ${viewMode === 'grid' ? cardS.cardGrid : ''}`}
      style={{ '--row-i': Math.min(rowIndex, 10) } as React.CSSProperties}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {/* Checkbox — Radix */}
      <div className={cardS.cardCheck} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isChecked}
          onCheckedChange={onCheckToggle}
          aria-label={`انتخاب ${exchangeName}`}
          className={cardS.cardCheckbox}
        />
      </div>

      {/* Exchange avatar / logo */}
      {quote.exchangeLogoUrl ? (
        <div className={cardS.cardAvatar} aria-hidden>
          <Image
            src={quote.exchangeLogoUrl}
            alt=""
            width={36}
            height={36}
            className="rounded-lg object-cover"
            unoptimized
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              const parent = img.parentElement;
              if (parent) parent.textContent = exchangeName.charAt(0).toUpperCase();
            }}
          />
        </div>
      ) : (
        <div className={cardS.cardAvatar} aria-hidden>
          {exchangeName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className={cardS.cardMain}>
        <div className={cardS.cardTopRow}>
          <strong className={cardS.cardName}>{exchangeName}</strong>
          {quote.exchangeCity && <span className={cardS.cardCity}>{quote.exchangeCity}</span>}
          {isUrgent && (
            <span className={cardS.urgentBadge} aria-label="اسپرد بالا">
              <span className={cardS.urgentDot} aria-hidden />
              ریسک بالا
            </span>
          )}
        </div>

        <div className={cardS.cardRates}>
          <span className={cardS.cardBuy}>
            خرید: <strong>{fmtRate(quote.buyRate)}</strong>
          </span>
          <ArrowLeftRight size={11} className={cardS.cardRateArrow} aria-hidden />
          <span className={cardS.cardSell}>
            فروش: <strong>{fmtRate(quote.sellRate)}</strong>
          </span>
        </div>

        <SpreadPulse spreadPct={spread} />
      </div>

      <div className={cardS.cardMeta}>
        <Badge variant="outline" className={cardS.currencyBadge}>
          {quote.currencyCode}
        </Badge>
        <span className={cardS.cardTime}>
          <Clock size={10} aria-hidden />
          {fmtDateRelative(quote.createdAt)}
        </span>
      </div>

      {isLoading && (
        <div className={cardS.cardSpinner} aria-hidden>
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}
    </div>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function QuoteCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--ds-border-default)] bg-[var(--ds-surface)]">
      <Skeleton className="h-5 w-5 rounded" />
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-1 w-full" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function DetailPanelSkeleton() {
  return (
    <div className="space-y-4 p-5 rounded-2xl border border-[var(--ds-border-default)] bg-[var(--ds-surface)]">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20 mt-1" />
        </div>
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-12 rounded-md" />
      </div>
      <Skeleton className="h-10 rounded-lg" />
      <Skeleton className="h-10 rounded-lg" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExchangeQuotesApprovalWorkspace({ initialPending }: Props) {
  const [quotes, setQuotes] = useState<QuoteRow[]>(initialPending);
  const [selectedId, setSelectedId] = useState<string | null>(initialPending[0]?.id ?? null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [marketRates, setMarketRates] = useState<
    Array<{ symbol: string; value: number; buyValue?: number; sellValue?: number }>
  >([]);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [activityItems, setActivityItems] = useState<
    Array<{
      icon: string;
      label: string;
      description?: string;
      timestamp?: string;
      tone: 'default' | 'success' | 'warning' | 'danger' | 'info';
    }>
  >([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Detect mobile ──────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 860);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Initial loading simulation (for skeleton) ─────────────────────────────
  useEffect(() => {
    if (initialPending.length > 0) {
      setIsLoading(false);
    }
  }, [initialPending.length]);

  // ── Load market rates for comparison ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/market-rates');
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.success && json.data) {
            setMarketRates(json.data);
          }
        }
      } catch {
        // silently fail — market rates optional
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Auto-refresh polling ───────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/exchange-quotes/pending');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setQuotes(data.data);
            setLastRefreshed(new Date());
          }
        }
      } catch {
        // silently fail
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // ── Cleanup timers on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const spreads = quotes.map((q) => calcSpread(Number(q.buyRate), Number(q.sellRate)));
    const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;
    const highRisk = spreads.filter((s) => s > 3).length;
    const currencies = [...new Set(quotes.map((q) => q.currencyCode))];
    const exchanges = [...new Set(quotes.map((q) => q.exchangeId))];
    return { count: quotes.length, avgSpread, highRisk, currencies, exchanges, spreads };
  }, [quotes]);

  // ── Filtered + Sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...quotes];

    // Currency filter
    if (filterCurrency !== 'all') {
      result = result.filter((q) => q.currencyCode === filterCurrency);
    }

    // Status filter (urgent = spread > 3%)
    if (filterStatus === 'urgent') {
      result = result.filter((q) => calcSpread(Number(q.buyRate), Number(q.sellRate)) > 3);
    } else if (filterStatus === 'normal') {
      result = result.filter((q) => calcSpread(Number(q.buyRate), Number(q.sellRate)) <= 3);
    }

    // Search filter (exchange name, city, currency)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          (r.exchangeName ?? '').toLowerCase().includes(q) ||
          (r.exchangeCity ?? '').toLowerCase().includes(q) ||
          r.currencyCode.toLowerCase().includes(q),
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'spread') {
        cmp =
          calcSpread(Number(a.buyRate), Number(a.sellRate)) -
          calcSpread(Number(b.buyRate), Number(b.sellRate));
      } else if (sortField === 'currencyCode') {
        cmp = a.currencyCode.localeCompare(b.currencyCode);
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [quotes, filterCurrency, filterStatus, searchQuery, sortField, sortDir]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedId) ?? null,
    [quotes, selectedId],
  );

  // ── Feedback helpers ──────────────────────────────────────────────────────
  function showSuccess(msg: string) {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessMsg(msg);
    successTimerRef.current = setTimeout(() => setSuccessMsg(null), 3000);
  }
  function showError(msg: string) {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 4000);
  }

  // ── Activity tracking ─────────────────────────────────────────────────────
  const addActivity = useCallback((item: (typeof activityItems)[number]) => {
    setActivityItems((prev) => [item, ...prev].slice(0, 10));
  }, []);

  // ── Single approve (with note) ─────────────────────────────────────────────
  const handleApprove = useCallback(
    async (id: string, note?: string) => {
      setLoadingId(id);
      const res = await approveQuote(id, note || undefined);
      setLoadingId(null);
      setLastRefreshed(new Date());
      if (res.success) {
        const quote = quotes.find((q) => q.id === id);
        const exchangeName = quote?.exchangeName ?? quote?.exchangeId ?? 'صرافی';
        addActivity({
          icon: 'check',
          label: `تأیید ${exchangeName}`,
          description: `قیمت ${quote?.currencyCode ?? ''} تأیید شد`,
          timestamp: new Date().toISOString(),
          tone: 'success',
        });
        setQuotes((prev) => {
          const next = prev.filter((q) => q.id !== id);
          const idx = prev.findIndex((q) => q.id === id);
          const nextItem = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
          setSelectedId(nextItem?.id ?? null);
          return next;
        });
        showSuccess('قیمت تأیید شد');
        // Auto-scroll to top of list
        setTimeout(() => {
          listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      } else {
        showError(res.error.message);
      }
    },
    [quotes, addActivity],
  );

  // ── Single reject ──────────────────────────────────────────────────────────
  const handleRejectConfirm = useCallback(async () => {
    if (!selectedId || !rejectReason.trim()) return;
    const id = selectedId;
    setLoadingId(id);
    const res = await rejectQuote(id, rejectReason);
    setLoadingId(null);
    setLastRefreshed(new Date());
    if (res.success) {
      const quote = quotes.find((q) => q.id === id);
      const exchangeName = quote?.exchangeName ?? quote?.exchangeId ?? 'صرافی';
      addActivity({
        icon: 'xCircle',
        label: `رد ${exchangeName}`,
        description: rejectReason,
        timestamp: new Date().toISOString(),
        tone: 'danger',
      });
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
      setTimeout(() => {
        listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else {
      showError(res.error.message);
    }
  }, [selectedId, rejectReason, quotes, addActivity]);

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
    setLastRefreshed(new Date());
    if (ok > 0) {
      addActivity({
        icon: 'check',
        label: `تأیید گروهی ${faNum.format(ok)} قیمت`,
        description: fail > 0 ? `${faNum.format(fail)} خطا` : 'همه موفق',
        timestamp: new Date().toISOString(),
        tone: fail > 0 ? 'warning' : 'success',
      });
    }
    if (fail === 0) {
      showSuccess(`${faNum.format(ok)} قیمت تأیید شد`);
    } else {
      showError(`${faNum.format(ok)} تأیید، ${faNum.format(fail)} خطا`);
    }
  }, [checked, addActivity]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
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

  // ── Mobile: open detail drawer on select ───────────────────────────────────
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (isMobile) setMobileDetailOpen(true);
    },
    [isMobile],
  );

  // ── Export data ────────────────────────────────────────────────────────────
  const exportColumns = useMemo(
    () => [
      { key: 'exchangeName', header: 'صرافی' },
      { key: 'currencyCode', header: 'ارز' },
      { key: 'buyRate', header: 'نرخ خرید' },
      { key: 'sellRate', header: 'نرخ فروش' },
      { key: 'spread', header: 'اسپرد (٪)' },
      { key: 'createdAt', header: 'تاریخ ثبت' },
    ],
    [],
  );

  const exportData = useMemo(
    () =>
      quotes.map((q) => ({
        exchangeName: q.exchangeName ?? q.exchangeId,
        currencyCode: q.currencyCode,
        buyRate: q.buyRate,
        sellRate: q.sellRate,
        spread: calcSpread(Number(q.buyRate), Number(q.sellRate)).toFixed(2),
        createdAt: fmtDate(q.createdAt),
      })),
    [quotes],
  );

  // ── Handle mobile detail approve ───────────────────────────────────────────
  const handleMobileApprove = useCallback(
    async (note: string) => {
      if (!selectedId) return;
      await handleApprove(selectedId, note);
      setMobileDetailOpen(false);
    },
    [selectedId, handleApprove],
  );

  const mobileSelectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedId) ?? null,
    [quotes, selectedId],
  );

  const mobileMarketRate = useMemo(() => {
    if (!mobileSelectedQuote) return null;
    return findMarketRate(marketRates, mobileSelectedQuote.currencyCode);
  }, [mobileSelectedQuote, marketRates]);

  // ── Last refreshed display ─────────────────────────────────────────────────
  const lastRefreshedText = useMemo(() => {
    return fmtDateRelative(lastRefreshed);
  }, [lastRefreshed]);

  // ── Quick actions ──────────────────────────────────────────────────────────
  const quickActions = useMemo(
    () => [
      {
        href: '/dashboard/exchanges',
        icon: <Layers size={14} />,
        label: 'صرافی‌ها',
        tone: 'cyan' as const,
      },
      {
        href: '/dashboard/exchange-staff',
        icon: <Coins size={14} />,
        label: 'کارکنان صرافی',
        tone: 'emerald' as const,
      },
    ],
    [],
  );

  // ── Sparkline data from spreads ────────────────────────────────────────────
  const sparkData = useMemo(() => {
    return kpi.spreads.slice(-12);
  }, [kpi.spreads]);

  // ── Urgent count for status filter ─────────────────────────────────────────
  const urgentCount = useMemo(
    () => quotes.filter((q) => calcSpread(Number(q.buyRate), Number(q.sellRate)) > 3).length,
    [quotes],
  );
  const normalCount = useMemo(
    () => quotes.filter((q) => calcSpread(Number(q.buyRate), Number(q.sellRate)) <= 3).length,
    [quotes],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className={s.root} dir="rtl">
        {/* ── Ambient Background (subtle) ── */}
        <AmbientBackground colors={['cyan', 'indigo', 'cyan']} intensity="low" />

        {/* ── PageHeader (single, in workspace) ── */}
        <PageHeader
          variant="compact"
          title="مرکز تأیید قیمت‌گذاری"
          description="قیمت‌های خرید/فروش ثبت‌شده توسط صرافی‌ها را بررسی و تأیید یا رد کنید"
          breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'تأیید قیمت‌ها' }]}
          eyebrow="Market Intelligence"
          icon="arrow-left-right"
          accent="emerald"
          meta={[
            { label: 'در صف', value: kpi.count },
            { label: 'اسپرد', value: `${kpi.avgSpread.toFixed(1)}٪` },
          ]}
        />

        {/* ── Live Status Pulse Bar ── */}
        <div className={s.statusBar}>
          <div className={s.statusPulse} />
          <span className={s.statusLabel}>{faNum.format(quotes.length)} قیمت در انتظار بررسی</span>
          <div className={s.statusDivider} />
          <span className={s.statusTime}>
            <Zap size={11} aria-hidden />
            بروزرسانی: {lastRefreshedText}
          </span>
          {autoRefresh && (
            <>
              <div className={s.statusDivider} />
              <span className={s.statusAuto}>
                <RefreshCw size={10} className="animate-spin" aria-hidden />
                خودکار فعال
              </span>
            </>
          )}
        </div>

        {/* ── KPI Strip (StatCard primitive) ── */}
        <div className={s.kpiStrip} role="region" aria-label="آمار کلی">
          <StatCard
            label="در صف بررسی"
            value={kpi.count}
            icon={Clock}
            format="persian"
            spark={
              sparkData.length > 1 ? (
                <TrendSparkline data={sparkData} height={24} width={72} />
              ) : undefined
            }
          />
          <StatCard
            label="اسپرد میانگین"
            value={`${kpi.avgSpread.toFixed(2)}٪`}
            icon={Scale}
            format="persian"
          />
          <StatCard
            label="ریسک بالا (>۳٪)"
            value={kpi.highRisk}
            icon={kpi.highRisk > 0 ? AlertTriangle : ShieldCheck}
            format="persian"
            delta={
              kpi.count > 0
                ? {
                    value: (kpi.highRisk / kpi.count) * 100,
                    trend: kpi.highRisk > kpi.count / 2 ? 'down' : 'up',
                  }
                : undefined
            }
          />
          <StatCard
            label="ارزهای فعال"
            value={kpi.currencies.length}
            icon={Coins}
            format="persian"
          />
        </div>

        {/* ── Quick Actions ── */}
        {quotes.length > 0 && <QuickActionRow items={quickActions} />}

        {/* ── Feedback toasts ── */}
        {successMsg && (
          <output className={s.toastSuccess} aria-live="polite">
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

        {/* ── Spread Heatmap ── */}
        {quotes.length >= 3 && <SpreadHeatmap quotes={quotes} />}

        {/* ── Toolbar (sticky) ── */}
        <div className={s.toolbar}>
          <div className={s.toolbarStart}>
            {/* Search */}
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="جستجوی صرافی، شهر، ارز…"
              className={s.searchInput}
            />

            {/* Select all checkbox */}
            {filtered.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Checkbox
                      checked={checked.size === filtered.length && filtered.length > 0}
                      onCheckedChange={checkAll}
                      aria-label="انتخاب همه"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>انتخاب همه</TooltipContent>
              </Tooltip>
            )}

            {/* Status filter pills */}
            {quotes.length > 0 && (
              <div className={s.statusFilter} role="tablist" aria-label="فیلتر وضعیت">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === 'all'}
                  className={`${s.statusPill} ${filterStatus === 'all' ? s.statusPillActive : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  همه
                  <span className={s.pillCount}>{faNum.format(quotes.length)}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === 'urgent'}
                  className={`${s.statusPill} ${s.statusPillUrgent} ${filterStatus === 'urgent' ? s.statusPillActive : ''}`}
                  onClick={() => setFilterStatus('urgent')}
                >
                  <span className={s.pillDot} aria-hidden />
                  فوری
                  <span className={s.pillCount}>{faNum.format(urgentCount)}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filterStatus === 'normal'}
                  className={`${s.statusPill} ${s.statusPillNormal} ${filterStatus === 'normal' ? s.statusPillActive : ''}`}
                  onClick={() => setFilterStatus('normal')}
                >
                  عادی
                  <span className={s.pillCount}>{faNum.format(normalCount)}</span>
                </button>
              </div>
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
                  <span className={s.filterCount}>{faNum.format(quotes.length)}</span>
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
                      <span className={s.filterCount}>{faNum.format(cnt)}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Filtered count */}
            {filtered.length !== quotes.length && (
              <span className={s.filteredCount} aria-live="polite">
                {faNum.format(filtered.length)} از {faNum.format(quotes.length)} نتیجه
              </span>
            )}
          </div>

          <div className={s.toolbarEnd}>
            {/* Sort */}
            <Select
              value={`${sortField}-${sortDir}`}
              onValueChange={(val) => {
                const [field, dir] = val.split('-') as [SortField, SortDir];
                setSortField(field);
                setSortDir(dir);
              }}
            >
              <SelectTrigger className={s.sortSelect}>
                <SelectValue placeholder="مرتب‌سازی" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="createdAt-desc">جدیدترین</SelectItem>
                <SelectItem value="createdAt-asc">قدیمی‌ترین</SelectItem>
                <SelectItem value="spread-desc">بیشترین اسپرد</SelectItem>
                <SelectItem value="spread-asc">کمترین اسپرد</SelectItem>
                <SelectItem value="currencyCode-asc">ارز (الفبا)</SelectItem>
              </SelectContent>
            </Select>

            {/* View mode toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5">
                  <Toggle
                    size="sm"
                    pressed={viewMode === 'list'}
                    onPressedChange={() => setViewMode('list')}
                    className={s.viewToggle}
                    aria-label="نمای لیستی"
                  >
                    <List size={14} aria-hidden />
                  </Toggle>
                  <Toggle
                    size="sm"
                    pressed={viewMode === 'grid'}
                    onPressedChange={() => setViewMode('grid')}
                    className={s.viewToggle}
                    aria-label="نمای شبکه‌ای"
                  >
                    <Grid3x3 size={14} aria-hidden />
                  </Toggle>
                </div>
              </TooltipTrigger>
              <TooltipContent>نمای لیست / شبکه</TooltipContent>
            </Tooltip>

            {/* Auto-refresh toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`${s.toolBtn} ${autoRefresh ? s.toolBtnActive : ''}`}
                  onClick={() => setAutoRefresh((p) => !p)}
                  aria-label={autoRefresh ? 'توقف بروزرسانی خودکار' : 'بروزرسانی خودکار'}
                  aria-pressed={autoRefresh}
                >
                  <RefreshCw
                    size={14}
                    className={autoRefresh ? 'animate-spin' : undefined}
                    aria-hidden
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {autoRefresh ? 'بروزرسانی خودکار فعال (۳۰ ثانیه)' : 'بروزرسانی خودکار'}
              </TooltipContent>
            </Tooltip>

            {/* Export */}
            {quotes.length > 0 && (
              <ExportButton
                data={exportData}
                columns={exportColumns}
                filename="exchange-quotes"
                label="خروجی"
              />
            )}

            {/* Batch actions */}
            {checked.size > 0 && (
              <div className={s.batchBar}>
                <Layers size={13} aria-hidden />
                <span className={s.batchCount}>{faNum.format(checked.size)} انتخاب شده</span>
                <Button
                  size="sm"
                  className={s.batchApproveBtn}
                  onClick={() => setBatchConfirmOpen(true)}
                  disabled={batchLoading}
                >
                  {batchLoading ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 size={12} aria-hidden />
                  )}
                  تأیید گروهی
                </Button>
              </div>
            )}

            {/* Keyboard hint */}
            {!isMobile && (
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
            )}
          </div>
        </div>

        {/* ── Empty state / Skeleton ── */}
        {filtered.length === 0 ? (
          isLoading ? (
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <QuoteCardSkeleton />
                <QuoteCardSkeleton />
                <QuoteCardSkeleton />
              </div>
              <div className="hidden lg:block w-96 flex-shrink-0">
                <DetailPanelSkeleton />
              </div>
            </div>
          ) : (
            <MillionDollarEmpty
              variant="shield"
              tone="emerald"
              eyebrow="مرکز تأیید"
              title={quotes.length === 0 ? 'صف خالی است' : 'نتیجه‌ای یافت نشد'}
              description={
                quotes.length === 0
                  ? 'همه قیمت‌ها بررسی شده‌اند. وقتی صرافی قیمت جدید ثبت کند اینجا نمایش داده می‌شود.'
                  : 'فیلتر یا جستجوی خود را تغییر دهید.'
              }
            />
          )
        ) : (
          /* ── Split-view (desktop) / Stack (mobile) ── */
          <div
            className={`${s.splitView} ${isMobile ? '' : viewMode === 'grid' ? s.splitViewGrid : ''}`}
          >
            {/* Queue list */}
            <div
              className={`${s.queueList} ${viewMode === 'grid' ? s.queueListGrid : ''}`}
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
                  onSelect={() => handleSelect(q.id)}
                  onCheckToggle={() => toggleCheck(q.id)}
                  rowIndex={i}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Detail Panel — desktop only */}
            {!isMobile && selectedQuote && (
              <DetailPanel
                quote={selectedQuote}
                onApprove={(note) => handleApprove(selectedQuote.id, note)}
                onReject={() => setRejectOpen(true)}
                isLoading={loadingId === selectedQuote.id}
                marketRate={findMarketRate(marketRates, selectedQuote.currencyCode)}
              />
            )}
          </div>
        )}

        {/* ── Activity Feed (desktop only, bottom) ── */}
        {!isMobile && activityItems.length > 0 && (
          <Section title="فعالیت‌های اخیر" icon={Activity} padding="none">
            <StatusTimeline items={activityItems} maxItems={5} />
          </Section>
        )}

        {/* ── Mobile Detail Drawer ── */}
        {mobileSelectedQuote && (
          <PanelDrawer
            open={mobileDetailOpen}
            title="جزئیات قیمت‌گذاری"
            onClose={() => setMobileDetailOpen(false)}
            width="min(100vw, 560px)"
            footer={
              <div className="flex gap-2 p-4" dir="rtl">
                <Button
                  className="flex-1 bg-[var(--ds-brand-500)] text-white"
                  onClick={async () => {
                    await handleMobileApprove('');
                  }}
                  disabled={loadingId !== null}
                >
                  {loadingId !== null ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 size={14} aria-hidden />
                  )}
                  تأیید
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  disabled={loadingId !== null}
                >
                  <XCircle size={14} aria-hidden />
                  رد
                </Button>
              </div>
            }
          >
            <DetailPanel
              quote={mobileSelectedQuote}
              onApprove={handleMobileApprove}
              onReject={() => {
                setMobileDetailOpen(false);
                setRejectOpen(true);
              }}
              isLoading={loadingId === mobileSelectedQuote.id}
              marketRate={mobileMarketRate}
              isMobile
            />
          </PanelDrawer>
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
              <div className={dpS.rejectDialogBody}>
                <div className={dpS.rejectQuoteSummary}>
                  <div className={dpS.rejectAvatarSmall} aria-hidden>
                    {(selectedQuote.exchangeName ?? selectedQuote.exchangeId)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <strong>{selectedQuote.exchangeName ?? selectedQuote.exchangeId}</strong>
                    <span className={dpS.rejectRateLine}>
                      خرید: {fmtRate(selectedQuote.buyRate)} · فروش:{' '}
                      {fmtRate(selectedQuote.sellRate)}
                    </span>
                  </div>
                </div>

                <label className={dpS.rejectLabel} htmlFor="reject-reason">
                  دلیل رد <span aria-hidden>*</span>
                </label>
                <Textarea
                  id="reject-reason"
                  className={dpS.rejectTextarea}
                  placeholder="دلیل رد کردن این قیمت را بنویسید…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  autoFocus
                  maxLength={500}
                />
                <span className={dpS.rejectCharCount}>
                  {faNum.format(rejectReason.length)} / ۵۰۰
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
                  <Loader2 size={14} className="animate-spin" aria-hidden />
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
          description={`${faNum.format(checked.size)} قیمت تأیید خواهد شد. این عمل قابل بازگشت نیست.`}
          confirmLabel="تأیید همه"
          onConfirm={handleBatchApprove}
          loading={batchLoading}
        />
      </div>
    </TooltipProvider>
  );
}
