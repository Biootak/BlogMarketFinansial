'use client';

/**
 * WalletClient — 2026 Million-dollar fintech wallet
 *
 * ویژگی‌ها:
 * - Hero balance card با ambient SVG pulse (signature moment)
 * - سه دکمه سریع با spring micro-interaction
 * - Ledger با infinite scroll / cursor pagination
 * - KYC status banner اگر تأیید نشده
 * - EmptyState برای کاربر بدون Customer record
 * - همه ۵ حالت: loading / empty / error / success / disabled
 */

import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  BarChart2,
  Send,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import s from './WalletClient.module.css';

type Account = {
  id: string;
  currency: string;
  balance: string;
  status: string;
  type: string;
};

type WalletData = {
  customerId: string;
  fullName: string;
  kycLevel: string;
  kycStatus: string;
  accounts: Account[];
};

type LedgerEntry = {
  id: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  description: string | null;
  createdAt: string;
  runningBalance: string;
};

type Props = { walletData: WalletData | null };

function formatAFN(amount: string): string {
  const num = Number(amount);
  if (Number.isNaN(num)) return '—';
  // balance و amount در DB به صورت BigInt cents ذخیره می‌شوند → تقسیم بر 100
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency: 'AFN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** AmbientSVG — self-illuminating stroke rings (signature moment) */
function AmbientRings() {
  return (
    <div className={s.heroAmbient} aria-hidden>
      <svg
        className={s.heroAmbientSvg}
        viewBox="0 0 260 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="130"
          cy="130"
          r="100"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8 6"
          style={{ color: 'var(--ds-brand-500)', opacity: 0.6 }}
        />
        <circle
          cx="130"
          cy="130"
          r="70"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ color: 'var(--ds-brand-500)', opacity: 0.4 }}
        />
        <circle
          cx="130"
          cy="130"
          r="40"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: 'var(--ds-brand-500)', opacity: 0.3 }}
        />
      </svg>
    </div>
  );
}

export function WalletClient({ walletData }: Props) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEntries = useCallback(async (cursor?: string) => {
    const isMore = !!cursor;
    if (isMore) setLoadingMore(true);
    else setLoading(true);
    setFetchError(null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const url = `/api/customer/transactions?limit=20${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error('خطا در دریافت تراکنش‌ها');
      const json = (await res.json()) as {
        success: boolean;
        data?: { entries: LedgerEntry[]; nextCursor: string | null; hasMore: boolean };
        error?: { message: string };
      };
      if (!json.success) throw new Error(json.error?.message ?? 'خطای ناشناخته');
      const data = json.data!;
      if (isMore) {
        setEntries((prev) => [...prev, ...data.entries]);
      } else {
        setEntries(data.entries);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setFetchError((err as Error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    return () => abortRef.current?.abort();
  }, [fetchEntries]);

  // ── No customer record ────────────────────────────────────────────────────
  if (!walletData) {
    return (
      <div className={s.noCustomer}>
        <Wallet size={48} aria-hidden style={{ color: 'var(--ds-text-muted)', opacity: 0.35 }} />
        <h1 className={s.noCustomerTitle}>کیف پول هنوز فعال نشده</h1>
        <p className={s.noCustomerDesc}>
          برای فعال‌سازی کیف پول، ابتدا اطلاعات هویتی خود را تکمیل کنید.
        </p>
        <Link href="/dashboard/kyc" className={s.ctaLink}>
          <ShieldAlert size={16} aria-hidden />
          احراز هویت (KYC)
        </Link>
      </div>
    );
  }

  const primaryAccount =
    walletData.accounts.find((a) => a.type === 'WALLET') ?? walletData.accounts[0];
  const kycApproved = walletData.kycStatus === 'APPROVED';

  return (
    <div className={s.page}>
      {/* ── KYC Banner ── */}
      {!kycApproved && (
        <div className={s.kycBanner} role="status">
          <ShieldAlert
            size={18}
            aria-hidden
            style={{ color: 'var(--ds-status-pending-fg)', flexShrink: 0 }}
          />
          <p className={s.kycBannerText}>
            برای استفاده کامل از کیف پول، احراز هویت خود را تکمیل کنید.
          </p>
          <Link href="/dashboard/kyc" className={s.kycBannerLink} aria-label="احراز هویت">
            احراز هویت ←
          </Link>
        </div>
      )}

      {/* ── Hero Balance Card ── */}
      <div className={s.hero} aria-label="موجودی کیف پول">
        <AmbientRings />
        <p className={s.heroEyebrow}>موجودی کل</p>
        <div>
          <span className={s.heroBalance} aria-live="polite">
            {primaryAccount ? formatAFN(primaryAccount.balance) : '—'}
          </span>
          {primaryAccount && <span className={s.heroCurrency}>{primaryAccount.currency}</span>}
        </div>
        <div className={s.heroMeta}>
          {kycApproved && primaryAccount && (
            <span className={s.heroBadge}>
              <span className={s.heroBadgeDot} aria-hidden />
              حساب فعال
            </span>
          )}
          {walletData.fullName && (
            <span style={{ fontSize: 'var(--ds-text-xs)', color: 'var(--ds-text-muted)' }}>
              {walletData.fullName}
            </span>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className={s.actions} role="group" aria-label="عملیات سریع">
        {[
          { label: 'انتقال', Icon: Send, href: '/dashboard/transfer' },
          { label: 'معاملات', Icon: ArrowLeftRight, href: '/dashboard/my-deals' },
          { label: 'گزارش', Icon: BarChart2, href: '#transactions' },
        ].map(({ label, Icon, href }) => (
          <Link key={label} href={href} className={s.actionBtn} aria-label={label}>
            <span className={s.actionIcon}>
              <Icon size={20} aria-hidden />
            </span>
            <span className={s.actionLabel}>{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Transactions ── */}
      <section className={s.txSection} id="transactions" aria-label="تاریخچه تراکنش‌ها">
        <div className={s.txHeader}>
          <h2 className={s.txTitle}>تاریخچه تراکنش‌ها</h2>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className={s.txList} aria-busy="true" aria-label="در حال بارگذاری">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={s.txSkeleton}>
                <Skeleton className={s.skDot} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Skeleton className={s.skLine} style={{ width: '60%' }} />
                  <Skeleton className={s.skLine} style={{ width: '35%', height: '10px' }} />
                </div>
                <Skeleton
                  style={{ width: '70px', height: '14px', borderRadius: 'var(--ds-radius-sm)' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && fetchError && (
          <div className={s.txError} role="alert">
            <p style={{ marginBottom: 'var(--ds-space-2)' }}>{fetchError}</p>
            <button type="button" onClick={() => fetchEntries()} className={s.loadMoreBtn}>
              تلاش مجدد
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !fetchError && entries.length === 0 && (
          <div className={s.txEmpty}>
            <ArrowLeftRight size={36} className={s.txEmptyIcon} aria-hidden />
            <p className={s.txEmptyTitle}>هنوز تراکنشی نداری</p>
            <p className={s.txEmptyDesc}>اولین انتقال خود را انجام بده تا تاریخچه‌ات شروع شود.</p>
          </div>
        )}

        {/* Transaction rows */}
        {!loading && entries.length > 0 && (
          <div className={s.txList} role="list">
            {entries.map((entry) => (
              <div key={entry.id} className={s.txRow} role="listitem">
                <div
                  className={entry.direction === 'CREDIT' ? s.txDotCredit : s.txDotDebit}
                  aria-hidden
                >
                  {entry.direction === 'CREDIT' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                </div>
                <div className={s.txMeta}>
                  <p className={s.txDesc}>
                    {entry.description ?? (entry.direction === 'CREDIT' ? 'واریز' : 'برداشت')}
                  </p>
                  <p className={s.txDate}>{formatDate(entry.createdAt)}</p>
                </div>
                <span
                  className={`${s.txAmount} ${
                    entry.direction === 'CREDIT' ? s.txAmountCredit : s.txAmountDebit
                  }`}
                  aria-label={`${entry.direction === 'CREDIT' ? 'واریز' : 'برداشت'} ${formatAFN(entry.amount)}`}
                >
                  {entry.direction === 'CREDIT' ? '＋' : '−'}
                  {formatAFN(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className={s.loadMore}>
            <button
              type="button"
              onClick={() => fetchEntries(nextCursor ?? undefined)}
              disabled={loadingMore}
              className={s.loadMoreBtn}
            >
              {loadingMore ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
