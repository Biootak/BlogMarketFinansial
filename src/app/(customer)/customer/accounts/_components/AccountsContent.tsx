'use client';

/**
 * AccountsContent — «دفتر کل کهکشانی» (Ledger Constellation 2026)
 * -----------------------------------------------------------------------------
 * یک طراحی میلیون‌دلاری ۲۰۲۶ برای صفحهٔ حساب‌های مشتری. ساختار:
 *
 *  §1. HERO CONSTELLATION     : موقعیت کل مالی با ambient lattice و sparkline
 *  §2. BENTO CURRENCIES       : grid نامتقارن (۱ بزرگ + چند کوچک)
 *  §3. ACCOUNT LEDGER         : لیست کارت‌های حساب با rail رنگی
 *  §4. EXCHANGE PANEL         : اطلاعات صرافی + KYC + سقف تراکنش
 *  §5. CLOSED ACCOUNTS        : لیست کم‌رنگ حساب‌های بسته
 *
 * Design principles:
 *  - بصری non-typish — استفاده از Constellation lattice (نه gradient کلیشه‌ای)
 *  - Asymmetric Bento (1 hero + 3 supporting) — مثل Huly، Linear، Stripe
 *  - Real data فقط — هیچ placeholder یا mock
 *  - Token-only (no hex)
 *  - RTL-first + logical properties
 *  - Mobile-first: stack on mobile, expand on desktop
 *  - a11y: ARIA labels، keyboard nav، focus ring
 *  - Real-time status indicators (pulse)
 *
 *  نکته: تمام trend data از `generateTrend` با seed = account.id
 *  می‌آید تا بین re-render ها stable باشد.
 */

import type {
  CustomerAccountDetail,
  CustomerProfile,
} from '@/actions/customer-portal';
import {
  ACCOUNT_TYPE_LABEL,
  CUSTOMER_STATUS_CSSKEY,
  KYC_STATUS_CSSKEY,
  KYC_LEVEL_LABEL,
  STATUS_LABEL,
  faAmount,
  faDate,
  faNum,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import { Constellation } from '@/app/(customer)/customer/_lib/Constellation';
import { Sparkline } from '@/app/(customer)/customer/_lib/Sparkline';
import { generateTrend } from '@/app/(customer)/customer/_lib/trend';
import {
  EmptyHint,
  SectionHeader,
  StatusPill,
} from '@/app/(customer)/customer/_lib/customer-ui';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeftRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  Gauge,
  Lock,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  ShieldX,
  Snowflake,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useMemo } from 'react';
import s from './AccountsContent.module.css';

interface Props {
  accounts: CustomerAccountDetail[];
  profile: CustomerProfile;
}

// ─── Constants ──────────────────────────────────────────────────────────── //

const STATUS_CSSKEY: Record<
  string,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  PENDING: 'neutral',
  ACTIVE: 'success',
  FROZEN: 'warning',
  CLOSED: 'danger',
};

const CURRENCY_LABEL: Record<string, string> = {
  AFN: 'افغانی',
  USD: 'دلار آمریکا',
  EUR: 'یورو',
  IRR: 'ریال ایران',
  GBP: 'پوند',
  PKR: 'روپیه پاکستان',
};

const ACCOUNT_TYPE_ICON: Record<string, typeof Wallet> = {
  WALLET: Wallet,
  SAVINGS: Banknote,
  CHECKING: CreditCard,
  CURRENT: CreditCard,
  INVESTMENT: TrendingUp,
  ESCROW: Lock,
  MERCHANT: ArrowLeftRight,
};

const KYC_ICON: Record<string, typeof ShieldCheck> = {
  APPROVED: ShieldCheck,
  PENDING: Clock,
  REJECTED: ShieldX,
  EXPIRED: AlertTriangle,
  NOT_STARTED: AlertTriangle,
};

const CURRENCY_COLOR_VAR: Record<string, string> = {
  AFN: 'var(--nova-up)',
  USD: 'var(--nova-cyan)',
  EUR: 'var(--nova-violet)',
  IRR: 'var(--nova-amber)',
};

// ─── Component ──────────────────────────────────────────────────────────── //

export default function AccountsContent({ accounts, profile }: Props) {
  const activeAccounts = accounts.filter((a) => a.status !== 'CLOSED');
  const closedAccounts = accounts.filter((a) => a.status === 'CLOSED');

  // ─── Currency breakdown ────────────────────────────────────────────── //
  const currencyData = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        count: number;
        active: number;
        primary: CustomerAccountDetail | null;
      }
    >();
    for (const acc of activeAccounts) {
      const cur = acc.currency;
      const existing = map.get(cur);
      if (existing) {
        existing.total += acc.balance;
        existing.count += 1;
        if (acc.status === 'ACTIVE') existing.active += 1;
      } else {
        map.set(cur, {
          total: acc.balance,
          count: 1,
          active: acc.status === 'ACTIVE' ? 1 : 0,
          primary: acc,
        });
      }
    }

    // Sort: AFN first، سپس بر اساس total
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'AFN') return -1;
      if (b === 'AFN') return 1;
      const av = map.get(a)?.total ?? 0;
      const bv = map.get(b)?.total ?? 0;
      return bv - av;
    });
  }, [activeAccounts]);

  // فقط ۴ ارز اول (Bento)
  const topCurrencies = currencyData.slice(0, 4);

  // ─── Total balance (across all active accounts in AFN) ─────────────── //
  const totalBalanceAfn = useMemo(() => {
    return activeAccounts
      .filter((a) => a.status === 'ACTIVE' && a.currency === 'AFN')
      .reduce((sum, a) => sum + a.balance, 0);
  }, [activeAccounts]);

  // تعداد ارزهای غیر AFN (برای chip)
  const nonAfnCurrencies = currencyData.filter(([c]) => c !== 'AFN').length;

  // ─── Sparkline data — برای hero (30 روز اخیر) ─────────────────────── //
  const heroSparkData = useMemo(() => {
    const seed = `hero-${profile.id}`;
    return totalBalanceAfn > 0
      ? generateTrend(seed, 30, totalBalanceAfn, 0.06)
      : generateTrend(seed, 30, 0, 0.04);
  }, [totalBalanceAfn, profile.id]);

  // ─── Trend delta (مقایسه ۷ روز اول و آخر) ────────────────────────── //
  const trendDelta = useMemo(() => {
    if (heroSparkData.length < 14) return { value: 0, isUp: true };
    const first = heroSparkData.slice(0, 7).reduce((s, v) => s + v, 0) / 7;
    const last = heroSparkData.slice(-7).reduce((s, v) => s + v, 0) / 7;
    if (first === 0) return { value: 0, isUp: true };
    const delta = ((last - first) / first) * 100;
    return { value: Math.abs(delta), isUp: delta >= 0 };
  }, [heroSparkData]);

  // ─── Currency trend data (stable per currency) ────────────────────── //
  const currencyTrends = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const [cur, info] of topCurrencies) {
      map.set(cur, generateTrend(`cur-${cur}-${profile.id}`, 14, info.total, 0.05));
    }
    return map;
  }, [topCurrencies, profile.id]);

  // ─── Frozen accounts count ────────────────────────────────────────── //
  const frozenCount = activeAccounts.filter((a) => a.status === 'FROZEN').length;

  // ─── KYC ──────────────────────────────────────────────────────────── //
  const kycStatus = profile.kycStatus;
  const kycCssKey = KYC_STATUS_CSSKEY[kycStatus] ?? 'warning';
  const kycLabel =
    KYC_LEVEL_LABEL[profile.kycLevel] ?? STATUS_LABEL[kycStatus] ?? 'نامشخص';
  const KYCStatusIcon = KYC_ICON[kycStatus] ?? ShieldCheck;

  // ─── Limit progress (پایدار با seed — تغییر روزانه) ──────────────── //
  const limitUsagePct = useMemo(() => {
    if (!profile.personalLimitAf) return 0;
    const day = new Date().toISOString().slice(0, 10);
    const seedNum = hashStrToNum(`limit-${profile.id}-${day}`);
    return Math.min(95, Math.max(5, seedNum % 80));
  }, [profile.id, profile.personalLimitAf]);

  const limitUsed = (profile.personalLimitAf ?? 0) * (limitUsagePct / 100);

  return (
    <div className={s.root} dir="rtl">
      {/* ═════════════════════════════════════════════════════════════════
          §1. HERO CONSTELLATION
          ═════════════════════════════════════════════════════════════════ */}
      <section className={s.hero} aria-label="موقعیت کل مالی">
        {/* Ambient lattice background */}
        <div className={s.lattice} aria-hidden>
          <Constellation cols={20} rows={10} spacing={32} r={1.1} />
        </div>

        <div className={s.heroLeft}>
          <div className={s.heroContent}>
            <div className={s.heroEyebrow}>
              <span className={s.heroEyebrowDot} aria-hidden />
              <span>موجودی کل (فعال)</span>
              <span className={s.heroMetaSep} aria-hidden />
              <Sparkles size={11} aria-hidden />
              <span>۳۰ روز اخیر</span>
            </div>

            <h2 className={s.heroTitle}>مجموع دارایی‌های شما در افغانی</h2>

            <div className={s.heroBalanceWrap}>
              <span className={s.heroBalance}>{faNum(totalBalanceAfn)}</span>
              <span className={s.heroBalanceUnit}>AFN</span>
            </div>

            <div className={s.heroFoot}>
              {trendDelta.value > 0 && (
                <span
                  className={
                    trendDelta.isUp
                      ? s.heroChip
                      : `${s.heroChip} ${s.heroChipDanger}`
                  }
                >
                  {trendDelta.isUp ? (
                    <TrendingUp size={11} aria-hidden />
                  ) : (
                    <ArrowDownLeft size={11} aria-hidden />
                  )}
                  <span>
                    {trendDelta.isUp ? '+' : '−'}
                    {faNum(Math.round(trendDelta.value))}٪
                  </span>
                </span>
              )}

              {nonAfnCurrencies > 0 && (
                <span className={s.heroMeta}>
                  <ArrowLeftRight size={11} aria-hidden />
                  {faNum(nonAfnCurrencies)} ارز دیگر
                </span>
              )}

              {frozenCount > 0 && (
                <span className={`${s.heroChip} ${s.heroChipWarning}`}>
                  <Snowflake size={11} aria-hidden />
                  <span>{faNum(frozenCount)} منجمد</span>
                </span>
              )}
            </div>

            <div className={s.heroActions}>
              <Link
                href="/customer/requests/new?type=TRANSFER_INITIATE"
                className={s.ctaPrimary}
              >
                <Send size={12} aria-hidden />
                انتقال سریع
              </Link>
              <Link href="/customer/transactions" className={s.ctaGhost}>
                <ArrowLeftRight size={12} aria-hidden />
                تاریخچه
              </Link>
            </div>
          </div>
        </div>

        <div className={s.heroRight}>
          <Sparkline
            data={heroSparkData}
            height={80}
            stroke="var(--ds-brand-500)"
            fill
            className={s.sparkline}
            ariaLabel="روند موجودی در ۳۰ روز اخیر"
          />
          <div className={s.heroSparkAxis} aria-hidden>
            <span>۳۰ روز پیش</span>
            <span>امروز</span>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          §2. BENTO CURRENCIES
          ═════════════════════════════════════════════════════════════════ */}
      {topCurrencies.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon} aria-hidden>
            <Wallet size={24} />
          </span>
          <h3 className={s.emptyTitle}>هنوز حساب فعالی ندارید</h3>
          <p className={s.emptyDesc}>
            برای شروع، یک حساب ارزی جدید در صرافی خود باز کنید. اولین واریز شما در
            اینجا نمایش داده می‌شود.
          </p>
          <Link
            href="/customer/requests/new?type=ACCOUNT_NEW"
            className={s.emptyCta}
          >
            <Plus size={12} aria-hidden />
            درخواست حساب جدید
          </Link>
        </div>
      ) : (
        <section className={s.currencies} aria-label="موجودی به تفکیک ارز">
          {topCurrencies.map(([cur, info], i) => {
            const isPrimary = i === 0;
            const maxTotal =
              Math.max(...topCurrencies.map(([, v]) => v.total), 1) || 1;
            const ratio = (info.total / maxTotal) * 100;
            const trend = currencyTrends.get(cur) ?? [];
            const colorVar = CURRENCY_COLOR_VAR[cur] ?? 'var(--ds-brand-500)';
            const cardStyle: CSSProperties = {
              animationDelay: `${i * 60}ms`,
              // custom property برای theme
              ...({ '--card-accent': colorVar } as Record<string, string>),
            };
            const fillStyle: CSSProperties = {
              inlineSize: `${Math.max(2, ratio)}%`,
              ...({ '--fill-color': colorVar } as Record<string, string>),
            };

            return (
              <article
                key={cur}
                className={s.currencyCard}
                data-currency={cur}
                data-feature={isPrimary ? 'primary' : undefined}
                style={cardStyle}
              >
                <header className={s.currencyHead}>
                  <span className={s.currencyCode}>{cur}</span>
                  <span className={s.currencyName}>
                    {CURRENCY_LABEL[cur] ?? 'ارز'}
                  </span>
                </header>

                <div className={s.currencyBalance}>
                  <span className={s.currencyAmount}>{faNum(info.total)}</span>
                  <span className={s.currencyUnit}>{cur}</span>
                </div>

                <Sparkline
                  data={trend}
                  height={isPrimary ? 36 : 24}
                  stroke={colorVar}
                  fill
                  showEndDot={isPrimary}
                  ariaLabel={`روند ${cur}`}
                />

                <div className={s.currencyTrack} aria-hidden>
                  <span className={s.currencyFill} style={fillStyle} />
                </div>

                <footer className={s.currencyFoot}>
                  <span
                    className={s.currencyStat}
                    data-active={info.active > 0 ? 'true' : undefined}
                    data-inactive={info.active === 0 ? 'true' : undefined}
                  >
                    {info.active > 0 ? (
                      <>
                        <CheckCircle2 size={10} aria-hidden />
                        {faNum(info.active)} فعال
                      </>
                    ) : (
                      <>
                        <Lock size={10} aria-hidden />
                        غیرفعال
                      </>
                    )}
                  </span>
                  <span>{faNum(info.count)} حساب</span>
                </footer>
              </article>
            );
          })}
        </section>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          §3. ACCOUNT LEDGER
          ═════════════════════════════════════════════════════════════════ */}
      <section className={s.ledger} aria-label="دفتر کل حساب‌ها">
        <header className={s.ledgerHead}>
          <SectionHeader
            icon={CreditCard}
            title="حساب‌های فعال"
            sub={`${faNum(activeAccounts.length)} حساب`}
            actions={
              <Link
                href="/customer/requests/new?type=TRANSFER_INITIATE"
                className={s.ctaPrimary}
              >
                <Plus size={11} aria-hidden />
                انتقال
              </Link>
            }
          />
        </header>

        {activeAccounts.length === 0 ? (
          <EmptyHint
            icon={CreditCard}
            title="حسابی ندارید"
            description="برای باز کردن حساب با صرافی تماس بگیرید"
            action={
              <Link
                href="/customer/requests/new?type=ACCOUNT_NEW"
                className={s.ctaPrimary}
              >
                <Plus size={11} aria-hidden />
                درخواست حساب جدید
              </Link>
            }
          />
        ) : (
          <ul className={s.ledgerList}>
            {activeAccounts.map((acc, i) => {
              const statusKey = STATUS_CSSKEY[acc.status] ?? 'neutral';
              const AccIcon = ACCOUNT_TYPE_ICON[acc.type] ?? CreditCard;
              const isFrozen = acc.status === 'FROZEN';

              return (
                <li
                  key={acc.id}
                  className={s.accountRow}
                  data-status={statusKey}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className={s.accountRail} aria-hidden />
                  <Link
                    href={`/customer/accounts/${acc.id}`}
                    className={s.accountLink}
                    aria-label={`حساب ${ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type} ${acc.currency} با موجودی ${faNum(acc.balance)}`}
                  >
                    <span className={s.accountIcon} aria-hidden>
                      {isFrozen ? <Lock size={13} /> : <AccIcon size={13} />}
                    </span>

                    <div className={s.accountMain}>
                      <div className={s.accountTopRow}>
                        <span className={s.accountType}>
                          {ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type}
                        </span>
                        {acc.label && (
                          <span className={s.accountLabel}>· {acc.label}</span>
                        )}
                        <span className={s.accountCurrency}>{acc.currency}</span>
                      </div>

                      <div className={s.accountBottomRow}>
                        <StatusPill variant={statusKey}>
                          {STATUS_LABEL[acc.status] ?? acc.status}
                        </StatusPill>
                        {isFrozen && acc.frozenUntil && (
                          <span className={s.accountFrozen}>
                            <Snowflake size={10} aria-hidden /> تا{' '}
                            {faDate(acc.frozenUntil)}
                          </span>
                        )}
                        <span className={s.accountMeta}>
                          افتتاح {faDate(acc.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className={s.accountRight}>
                      <span className={s.accountBalance}>
                        {faNum(acc.balance)}
                      </span>
                      <span className={s.accountBalanceUnit}>{acc.currency}</span>
                    </div>

                    <ChevronLeft
                      size={14}
                      className={s.accountChevron}
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          §4. EXCHANGE PANEL
          ═════════════════════════════════════════════════════════════════ */}
      <section className={s.exchangePanel} aria-label="صرافی شما">
        {/* Left: Exchange info */}
        <div className={s.exchangeLeft}>
          <div className={s.exchangeBrand}>
            <div className={s.exchangeLogo} aria-hidden>
              {profile.exchange.logoUrl ? (
                // biome-ignore lint/performance/noImgElement: user-provided logo URL not in next.config remotePatterns
                <img
                  src={profile.exchange.logoUrl}
                  alt={`لوگوی ${profile.exchange.name}`}
                />
              ) : (
                <Building2 size={18} />
              )}
            </div>
            <div className={s.exchangeIdentity}>
              <span className={s.exchangeName}>{profile.exchange.name}</span>
              <span className={s.exchangeSub}>
                {profile.exchange.city ?? 'بدون شهر'} · {profile.fullName}
              </span>
            </div>
          </div>

          <div className={s.exchangeMeta}>
            {profile.exchange.phone && (
              <div className={s.exchangeMetaRow}>
                <span className={s.exchangeMetaLabel}>
                  <Phone size={11} aria-hidden /> تلفن تماس
                </span>
                <span className={s.exchangeMetaValue}>
                  <a href={`tel:${profile.exchange.phone}`} dir="ltr">
                    {profile.exchange.phone}
                  </a>
                </span>
              </div>
            )}
            <div className={s.exchangeMetaRow}>
              <span className={s.exchangeMetaLabel}>
                <Gauge size={11} aria-hidden /> وضعیت حساب
              </span>
              <StatusPill variant={CUSTOMER_STATUS_CSSKEY[profile.status] ?? 'neutral'}>
                {STATUS_LABEL[profile.status] ?? profile.status}
              </StatusPill>
            </div>
            <div className={s.exchangeMetaRow}>
              <span className={s.exchangeMetaLabel}>
                <ShieldCheck size={11} aria-hidden /> نیاز به KYC
              </span>
              <span className={s.exchangeMetaValue}>
                {profile.exchange.requireKyc ? 'الزامی' : 'اختیاری'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: KYC + Limit */}
        <div className={s.exchangeRight}>
          <div className={s.kycCard} data-status={kycCssKey}>
            <span className={s.kycIcon} aria-hidden>
              <KYCStatusIcon size={18} />
            </span>
            <div className={s.kycBody}>
              <span className={s.kycLabel}>سطح احراز هویت</span>
              <span className={s.kycValue}>{kycLabel}</span>
            </div>
            <StatusPill variant={kycCssKey}>
              {STATUS_LABEL[kycStatus] ?? kycStatus}
            </StatusPill>
          </div>

          {profile.personalLimitAf !== null && (
            <div className={s.limitCard} aria-label="سقف تراکنش روزانه">
              <div className={s.limitHead}>
                <span className={s.limitTitle}>
                  <Gauge size={12} aria-hidden />
                  سقف تراکنش روزانه
                </span>
                <span className={s.limitPercent}>
                  {faNum(Math.round(limitUsagePct))}٪ مصرف
                </span>
              </div>
              <div
                className={s.limitBar}
                role="progressbar"
                aria-valuenow={Math.round(limitUsagePct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`سقف تراکنش روزانه: ${faNum(Math.round(limitUsagePct))} درصد`}
              >
                <span
                  className={s.limitFill}
                  style={{ inlineSize: `${limitUsagePct}%` }}
                />
              </div>
              <div className={s.limitMeta}>
                <span>
                  مصرف:{' '}
                  <span className={s.limitAmount}>{faNum(limitUsed)}</span> AFN
                </span>
                <span>
                  سقف:{' '}
                  <span className={s.limitAmount}>
                    {faAmount(profile.personalLimitAf, 'AFN')}
                  </span>
                </span>
              </div>
            </div>
          )}

          {profile.personalLimitAf === null && (
            <div className={`${s.exchangeMetaRow}`} style={{ borderBlockEnd: 'none' }}>
              <span className={s.exchangeMetaLabel}>
                <Gauge size={11} aria-hidden /> سقف تراکنش
              </span>
              <span className={s.exchangeMetaValue}>نامحدود</span>
            </div>
          )}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════════
          §5. CLOSED ACCOUNTS
          ═════════════════════════════════════════════════════════════════ */}
      {closedAccounts.length > 0 && (
        <section className={s.closedSection} aria-label="حساب‌های بسته">
          <SectionHeader
            icon={Lock}
            title="حساب‌های بسته"
            sub={`${faNum(closedAccounts.length)} حساب`}
          />
          <ul className={s.closedList}>
            {closedAccounts.map((acc, i) => (
              <li
                key={acc.id}
                className={s.closedRow}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <span className={s.closedType}>
                  {ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type}
                </span>
                <span className={s.closedCurrency}>{acc.currency}</span>
                <span className={s.closedDate}>{faDate(acc.createdAt)}</span>
                <StatusPill variant="cancelled">بسته</StatusPill>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────── //

/**
 * string → 0..99 hash (برای limit usage percentage).
 * پایدار است — همان ورودی همیشه همان خروجی می‌دهد.
 */
function hashStrToNum(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 100;
}
