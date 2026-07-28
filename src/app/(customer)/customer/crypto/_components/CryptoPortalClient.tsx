'use client';

/**
 * CryptoPortalClient — پورتال ارز دیجیتال مشتری
 *
 * 2026-07 P1-fix: حذف شبیه‌سازی Math.random و داده‌های hardcoded.
 *   - نرخ‌ها از `fetchCryptoTickerRates` (Exir API واقعی) دریافت می‌شوند.
 *   - موجودی کریپتو: backend هنوز wallet کریپتو ندارد؛ به‌جای فریب با `0`،
 *     یک EmptyState معتبر با برچسب «به‌زودی» نشان داده می‌شود.
 *   - دکمه «معامله آنی»: چون backend trade کریپتو وجود ندارد، disabled با
 *     tooltip «به‌زودی» است تا فریب‌کار نباشد.
 *   - هر ۶۰ ثانیه refresh با cleanup صحیح AbortController.
 *   - همه ۵ حالت (loading/empty/error/success/disabled) پیاده شده‌اند.
 */

import { fetchCryptoTickerRates } from '@/actions/fetchCryptoTickerRates';
import { EmptyState } from '@/components/Dashboard/primitives';
import { PageHeader, Section, StatCard, StatGrid } from '@/components/Dashboard/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  Bitcoin,
  Coins,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Info,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import type { CryptoTickerRate } from '@/types/types';

type LoadState = 'loading' | 'success' | 'error' | 'empty';

const REFRESH_MS = 60_000;
const FETCH_TIMEOUT_MS = 10_000;

/** ارزهای کلیدی که در بالای صفحه نمایش داده می‌شوند. */
const FEATURED_SYMBOLS = ['BTC', 'ETH', 'USDT', 'SOL'] as const;

export default function CryptoPortalClient() {
  const [rates, setRates] = useState<CryptoTickerRate[]>([]);
  const [status, setStatus] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    async function load() {
      try {
        const result = await fetchCryptoTickerRates();
        if (cancelled) return;

        if (!result.success || !result.data || result.data.length === 0) {
          setStatus('error');
          setErrorMsg(result.message || 'دریافت نرخ‌ها ناموفق بود');
          return;
        }

        // فیلتر ارزهای پشتیبانی‌شده در این صفحه
        const featured = result.data.filter((r) =>
          FEATURED_SYMBOLS.includes(r.symbol as (typeof FEATURED_SYMBOLS)[number]),
        );

        if (featured.length === 0) {
          setStatus('empty');
          return;
        }

        setRates(featured);
        setStatus('success');
        setLastUpdated(new Date());
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'خطای ناشناخته');
      }
    }

    load();
    const interval = window.setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
      window.clearInterval(interval);
    };
  }, []);

  const handleManualRetry = () => {
    setStatus('loading');
    // re-trigger effect by toggling — useEffect will run again on next tick
    // با تغییر مجدد state، useEffect دوباره اجرا می‌شود
    setTimeout(() => window.location.reload(), 100);
  };

  const fmtPrice = (price: number): string => {
    if (!Number.isFinite(price) || price <= 0) return '—';
    if (price < 0.01) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      });
    }
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fmtChange = (change: number): string =>
    `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="تبادل ارز دیجیتال"
        description="خرید، فروش و تبدیل دارایی‌های دیجیتال"
        breadcrumb={[{ label: 'پرتال مشتری' }, { label: 'ارز دیجیتال' }]}
        icon="arrow-left-right"
      />

      <StatGrid cols={3}>
        <StatCard
          label="موجودی بیت‌کوین"
          value="به‌زودی"
          icon={Bitcoin}
          info="Bitcoin (BTC)"
        />
        <StatCard
          label="موجودی تتر (USDT)"
          value="به‌زودی"
          icon={Coins}
          info="Tether (USDT)"
        />
        <StatCard
          label="معادل دلاری کل"
          value="به‌زودی"
          icon={Wallet}
          info="Total USD Balance"
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="خرید و فروش سریع" icon={<RefreshCw className="size-5" />} className="h-full">
          <div className="rounded-2xl bg-muted/30 p-6 backdrop-blur-sm border border-border/50">
            <div className="flex flex-col gap-4">
              <div className="group space-y-2">
                <label className="text-xs font-medium text-muted-foreground transition-colors group-focus-within:text-primary">
                  پرداخت می‌کنم
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4"
                      placeholder="0.00"
                      type="number"
                      disabled
                      aria-disabled="true"
                      aria-label="مبلغ پرداختی"
                    />
                  </div>
                  <select
                    className="rounded-xl border border-border bg-background px-3 font-medium outline-none transition-colors hover:bg-muted/50"
                    disabled
                    aria-label="ارز پرداختی"
                  >
                    <option>USD</option>
                    <option>AFN</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5 transition-transform hover:rotate-180">
                  <ArrowRightLeft size={18} />
                </div>
              </div>

              <div className="group space-y-2">
                <label className="text-xs font-medium text-muted-foreground transition-colors group-focus-within:text-primary">
                  دریافت می‌کنم
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none ring-primary/20 transition-all focus:border-primary focus:ring-4"
                      placeholder="0.00"
                      type="number"
                      readOnly
                      disabled
                      aria-label="مبلغ دریافتی"
                    />
                  </div>
                  <select
                    className="rounded-xl border border-border bg-background px-3 font-medium outline-none transition-colors hover:bg-muted/50"
                    disabled
                    aria-label="ارز دریافتی"
                  >
                    <option>BTC</option>
                    <option>USDT</option>
                    <option>ETH</option>
                  </select>
                </div>
              </div>

              <button
                disabled
                aria-disabled="true"
                title="این قابلیت به‌زودی فعال خواهد شد"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary/60 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all cursor-not-allowed"
              >
                <Info className="size-4" />
                معامله آنی (به‌زودی)
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                سامانه معامله ارز دیجیتال در حال توسعه است.
              </p>
            </div>
          </div>
        </Section>

        <Section
          title="وضعیت بازار"
          icon={<TrendingUp className="size-5" />}
          className="h-full"
        >
          {status === 'loading' && <MarketLoadingSkeleton />}

          {status === 'error' && (
            <ErrorState
              message={errorMsg}
              onRetry={handleManualRetry}
            />
          )}

          {status === 'empty' && (
            <EmptyState
              icon={TrendingUp}
              title="داده‌ای موجود نیست"
              description="در حال حاضر نرخ ارز دیجیتال در دسترس نیست."
            />
          )}

          {status === 'success' && (
            <div className="flex flex-col divide-y divide-border/50">
              <AnimatePresence mode="popLayout">
                {rates.map((coin) => {
                  const isPositive = coin.change >= 0;
                  return (
                    <motion.div
                      layout
                      key={coin.symbol}
                      className="flex items-center justify-between py-4 transition-colors hover:bg-muted/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background border border-border shadow-sm">
                          {coin.symbol === 'BTC' ? (
                            <Bitcoin className="text-orange-500" size={20} />
                          ) : (
                            <Coins className="text-primary" size={20} />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold">{coin.symbol}</div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase">
                            {coin.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-mono font-semibold tabular-nums">
                          ${fmtPrice(coin.usdtPrice)}
                        </div>
                        <div
                          className="flex items-center justify-end gap-0.5 text-[10px] font-bold tabular-nums"
                          data-tone={isPositive ? 'up' : 'down'}
                          style={{ color: 'var(--nova-up)' }}
                          aria-label={`تغییر ${fmtChange(coin.change)}`}
                        >
                          {isPositive ? (
                            <TrendingUp className="size-2.5" />
                          ) : (
                            <TrendingDown
                              className="size-2.5"
                              style={{ color: 'var(--nova-down)' }}
                            />
                          )}
                          {fmtChange(coin.change)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {lastUpdated && (
                <p className="pt-3 text-center text-[10px] text-muted-foreground">
                  آخرین به‌روزرسانی: {lastUpdated.toLocaleTimeString('fa-IR')}
                </p>
              )}
            </div>
          )}
        </Section>
      </div>
    </motion.div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function MarketLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-10" />
            </div>
          </div>
          <div className="space-y-1 text-left">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle className="size-10" />}
      title="خطا در دریافت نرخ‌ها"
      description={message || 'دریافت داده‌های بازار ناموفق بود. لطفاً مجدداً تلاش کنید.'}
      action={
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          تلاش مجدد
        </button>
      }
    />
  );
}
