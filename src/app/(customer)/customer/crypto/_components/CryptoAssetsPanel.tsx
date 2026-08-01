'use client';

/**
 * CryptoAssetsPanel — پنل دارایی‌های دیجیتال Customer Portal
 *
 * ساختار:
 *   ۱. KYC banner (اگر تأیید نشده)
 *   ۲. Portfolio Value Ribbon (signature)
 *   ۳. Wallet Cards grid (هر کارت: نمایش balance + rate + value + sparkline)
 *   ۴. Live Market Rates (compact list)
 *   ۵. Quick Actions
 *
 * فقط توکن‌های design system، RTL-first، pure CSS/SVG.
 */

import { Sparkline } from '@/app/(customer)/customer/_lib/Sparkline';
import { EmptyState, Spotlight } from '@/components/Dashboard/primitives';
import type { CryptoTickerRate } from '@/types/types';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bitcoin,
  ChevronLeft,
  CircleDollarSign,
  Coins,
  Eye,
  type LucideIcon,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import s from './CryptoAssetsPanel.module.css';

type WalletEntry = {
  id: string;
  currency: string;
  balance: number;
  type: string;
  status: string;
  updatedAt: string;
};

type Props = {
  wallets: WalletEntry[];
  rates: CryptoTickerRate[];
  kycStatus: string;
  exchangeName: string;
};

const ICON_MAP: Record<string, LucideIcon> = {
  BTC: Bitcoin,
  ETH: CircleDollarSign,
  USDT: Coins,
  USDC: Coins,
  BNB: Coins,
  SOL: CircleDollarSign,
};

const CRYPTO_DECIMALS: Record<string, number> = {
  BTC: 6,
  ETH: 5,
  USDT: 2,
  USDC: 2,
  BNB: 4,
  SOL: 3,
  XRP: 2,
  ADA: 2,
  DOGE: 2,
  TRX: 2,
  TON: 2,
};

// Intl singletons — یک‌بار ساخته می‌شوند
const _numFaInt = new Intl.NumberFormat('fa-IR');
const _numFaFrac: Record<number, Intl.NumberFormat> = {};
function _getFrac(frac: number): Intl.NumberFormat {
  if (!_numFaFrac[frac]) {
    _numFaFrac[frac] = new Intl.NumberFormat('fa-IR', {
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    });
  }
  return _numFaFrac[frac];
}

const fmtFa = (n: number, frac = 2): string => _getFrac(frac).format(n);
const fmtInt = (n: number): string => _numFaInt.format(Math.round(n));

/* ─── Sparkline بر پایهٔ نرخ واقعی ───
 * قبلاً یک hash تصادفی نماد بود (دادهٔ مصنوعی). حالا مسیر قیمتی از
 * `change` واقعی (از Exir) مشتق می‌شود: ۱۴ نقطه، از مقدار اولیه تا مقدار
 * پایانی که دقیقاً change درصد تغییر را منعکس می‌کند، با نوسان کوچک در
 * میانه. یعنی trend نمایش‌داده‌شده با عدد change کنارش هماهنگ است و
 * دیگر «دادهٔ الکی» نیست.
 */
function genSpark(symbol: string, change: number): number[] {
  const N = 14;
  const pct = Math.max(-25, Math.min(25, change));
  const start = 50 - pct * 0.4;
  const end = start + pct * 0.8;
  // seed سبک فقط برای نوسان (نه برای trend) — از symbol مشتق می‌شود
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) | 0;
  const points: number[] = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const linear = start + (end - start) * t;
    const wave = Math.sin(seed * 0.7 + i * 1.1) * 1.8;
    points.push(Math.max(4, Math.min(96, linear + wave)));
  }
  return points;
}

/* ─── Wallet Card ───────────────────────────────────────────────── */
function WalletCard({ wallet, rate }: { wallet: WalletEntry; rate?: CryptoTickerRate }) {
  const Icon = ICON_MAP[wallet.currency] ?? CircleDollarSign;
  const decimals = CRYPTO_DECIMALS[wallet.currency] ?? 2;
  const usdValue = rate ? wallet.balance * rate.usdtPrice : null;
  const change = rate?.change ?? 0;
  const spark = useMemo(() => genSpark(wallet.currency, change), [wallet.currency, change]);
  const trendUp = change >= 0;

  return (
    <article className={s.walletCard} data-trend={trendUp ? 'up' : 'down'}>
      <span className={s.walletRail} aria-hidden />
      <header className={s.walletHead}>
        <span className={s.walletIcon} aria-hidden>
          <Icon size={16} />
        </span>
        <div className={s.walletIdentity}>
          <strong className={s.walletSymbol}>{wallet.currency}</strong>
          <span className={s.walletType}>
            {wallet.type === 'WALLET'
              ? 'کیف پول'
              : wallet.type === 'SAVINGS'
                ? 'پس‌انداز'
                : wallet.type}
          </span>
        </div>
        <span className={s.walletBadge} data-trend={trendUp ? 'up' : 'down'}>
          {trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
          {fmtFa(Math.abs(change), 2)}٪
        </span>
      </header>

      <div className={s.walletBalance}>
        <span className={s.walletAmount}>{fmtFa(wallet.balance, decimals)}</span>
        <span className={s.walletUnit}>{wallet.currency}</span>
      </div>

      {usdValue !== null ? (
        <div className={s.walletValue}>
          <span className={s.walletValueLabel}>معادل تتر</span>
          <span className={s.walletValueAmount}>{fmtInt(usdValue)} USDT</span>
        </div>
      ) : (
        <div className={s.walletValue}>
          <span className={s.walletValueLabel}>نرخ لحظه‌ای</span>
          <span className={s.walletValueAmount}>—</span>
        </div>
      )}

      <div className={s.walletSpark} aria-hidden>
        {/* Sparkline مشترک — رنگ از currentColor والد (CSS) می‌آید */}
        <Sparkline data={spark} height={28} fill stroke="currentColor" />
      </div>

      <footer className={s.walletFoot}>
        {/* M7-fix: تاریخچه با فیلتر حساب واقعی (اکنون getCustomerTransactions
            از accountId پشتیبانی می‌کند)؛ «انتقال» به پورتال عملیات مشتری (نه
            سایت عمومی money-transfer که قابلیت انتقال واقعی ندارد). */}
        <Link href={`/customer/transactions?accountId=${wallet.id}`} className={s.walletLink}>
          تاریخچه
          <ChevronLeft size={10} />
        </Link>
        <Link href="/customer/transfer?action=transfer" className={s.walletLink}>
          انتقال
          <ArrowLeftRight size={10} />
        </Link>
      </footer>
    </article>
  );
}

/* ─── Main Panel ────────────────────────────────────────────────── */
export function CryptoAssetsPanel({ wallets, rates, kycStatus, exchangeName }: Props) {
  const [hideBalance, setHideBalance] = useState(false);
  const ratesBySymbol = useMemo(() => {
    const m = new Map<string, CryptoTickerRate>();
    for (const r of rates) m.set(r.symbol.toUpperCase(), r);
    return m;
  }, [rates]);

  const portfolio = useMemo(() => {
    let totalUsdt = 0;
    for (const w of wallets) {
      const r = ratesBySymbol.get(w.currency);
      if (r) totalUsdt += w.balance * r.usdtPrice;
    }
    return totalUsdt;
  }, [wallets, ratesBySymbol]);

  const topRates = useMemo(() => {
    return rates
      .filter((r) =>
        ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE'].includes(r.symbol.toUpperCase()),
      )
      .slice(0, 8);
  }, [rates]);

  const kycOk = kycStatus === 'APPROVED';

  return (
    <div className={s.root} dir="rtl">
      <Spotlight tone="violet" className={s.spotlight} />

      {/* ── KYC Banner ───────────────────────────────────────────── */}
      {kycOk ? null : (
        <output className={s.kycBanner} aria-live="polite">
          <span className={s.kycIcon} aria-hidden>
            <ShieldCheck size={16} />
          </span>
          <div>
            <strong className={s.kycTitle}>برای تراکنش ارز دیجیتال، احراز هویت لازم است</strong>
            <p className={s.kycLead}>
              با فعال‌سازی KYC، سقف برداشت افزایش یافته و امکان خرید/فروش فعال می‌شود.
            </p>
          </div>
          <Link href="/customer/kyc" className={s.kycCta}>
            شروع احراز هویت
            <ChevronLeft size={12} />
          </Link>
        </output>
      )}

      {/* ── Portfolio Ribbon ─────────────────────────────────────── */}
      <header className={s.portfolio}>
        <div className={s.portfolioLeft}>
          <span className={s.portfolioEyebrow}>
            <span className={s.portfolioDot} aria-hidden />
            ارزش لحظه‌ای سبد
          </span>
          <div className={s.portfolioAmount}>
            <span className={s.portfolioNumber}>{hideBalance ? '••••••' : fmtInt(portfolio)}</span>
            <span className={s.portfolioCurrency}>USDT</span>
          </div>
          <span className={s.portfolioSub}>
            {wallets.length} دارایی · {exchangeName}
          </span>
        </div>
        <div className={s.portfolioRight}>
          <button
            type="button"
            className={s.eyeBtn}
            onClick={() => setHideBalance((v) => !v)}
            aria-label={hideBalance ? 'نمایش موجودی' : 'پنهان‌سازی موجودی'}
          >
            <Eye size={14} />
          </button>
        </div>
      </header>

      {/* ── Wallets Grid ─────────────────────────────────────────── */}
      {wallets.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="کیف پول ارز دیجیتال ندارید"
          description="برای شروع، با صرافی تماس بگیرید تا کیف پول ارز دیجیتال برای شما افتتاح شود."
          action={
            <Link href="/customer/requests/new?type=ACCOUNT_NEW" className={s.emptyCta}>
              <Plus size={12} />
              درخواست کیف پول
            </Link>
          }
        />
      ) : (
        <section aria-label="کیف پول‌های ارز دیجیتال">
          <header className={s.sectionHead}>
            <h2 className={s.sectionTitle}>کیف پول‌ها</h2>
            <span className={s.sectionSub}>{wallets.length} مورد</span>
          </header>
          <div className={s.walletsGrid}>
            {wallets.map((w) => (
              <WalletCard key={w.id} wallet={w} rate={ratesBySymbol.get(w.currency)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Live Market Rates ────────────────────────────────────── */}
      {topRates.length > 0 && (
        <section aria-label="نرخ‌های زنده بازار">
          <header className={s.sectionHead}>
            <h2 className={s.sectionTitle}>بازار لحظه‌ای</h2>
            <span className={s.sectionSub}>منبع: Exir</span>
          </header>
          <ul className={s.marketList}>
            {topRates.map((r) => {
              const trendUp = r.change >= 0;
              return (
                <li key={r.symbol} className={s.marketItem} data-trend={trendUp ? 'up' : 'down'}>
                  <span className={s.marketSymbol}>{r.symbol}</span>
                  <span className={s.marketPrice}>{fmtInt(r.usdtPrice)}</span>
                  <span className={s.marketChange}>
                    {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {fmtFa(Math.abs(r.change), 2)}٪
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <section aria-label="اقدامات سریع">
        <div className={s.actionsGrid}>
          {/* M7-fix: واریز/برداشت/تبدیل به پورتال عملیات مشتری (قابلیت واقعی)
              — قبلاً به /money-transfer (سایت) یا /customer/transactions
              (فقط لیست) می‌رفتند که قابلیت واریز/برداشت نداشت. */}
          <Link
            href="/customer/transfer?action=exchange"
            className={s.actionCard}
            data-tone="primary"
          >
            <span className={s.actionIcon} aria-hidden>
              <ArrowLeftRight size={14} />
            </span>
            <span className={s.actionLabel}>تبدیل ارز</span>
            <span className={s.actionHint}>بین ارزهای دیجیتال و فیات</span>
          </Link>
          <Link
            href="/customer/transfer?action=deposit"
            className={s.actionCard}
            data-tone="emerald"
          >
            <span className={s.actionIcon} aria-hidden>
              <ArrowDownLeft size={14} />
            </span>
            <span className={s.actionLabel}>واریز</span>
            <span className={s.actionHint}>افزایش موجودی حساب</span>
          </Link>
          <Link href="/customer/transfer?action=withdraw" className={s.actionCard} data-tone="rose">
            <span className={s.actionIcon} aria-hidden>
              <ArrowUpRight size={14} />
            </span>
            <span className={s.actionLabel}>برداشت</span>
            <span className={s.actionHint}>انتقال به خارج از پلتفرم</span>
          </Link>
          <Link
            href="/customer/requests/new?type=OTHER"
            className={s.actionCard}
            data-tone="violet"
          >
            <span className={s.actionIcon} aria-hidden>
              <Sparkles size={14} />
            </span>
            <span className={s.actionLabel}>درخواست ویژه</span>
            <span className={s.actionHint}>به صرافی</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
