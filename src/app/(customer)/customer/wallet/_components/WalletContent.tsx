'use client';

import { useMemo } from 'react';

/**
 * CustomerWalletContent — کیف پول مشتری (2026)
 * ----------------------------------------------------------------------------
 * ساختار بصری:
 *
 *  §1. HERO BALANCE     : کارت موجودی با ambient SVG rings + live ribbon
 *  §2. ACCOUNT GRID     : کارت‌های حساب با rail رنگی و status pill
 *  §3. QUICK ACTIONS    : ۴ کارت اقدام سریع (واریز / برداشت / انتقال / تبدیل)
 *  §4. RECENT LEDGER    : timeline تراکنش‌های اخیر با execution rail
 *
 * Design principles:
 *  - فقط توکن‌های --ds-* و --nova-* (no hex/rgb)
 *  - RTL-first · logical properties
 *  - همه ۵ حالت: loading / empty / error / success / partial
 *  - Real data (از server)
 *  - a11y: ARIA labels, keyboard nav, focus ring
 */

import type {
  CustomerAccountDetail,
  CustomerProfile,
  CustomerTransactionRow,
} from '@/actions/customer-portal';
import {
  ACCOUNT_TYPE_LABEL,
  KIND_LABEL,
  STATUS_LABEL,
  TXN_STATUS_CSSKEY,
  faAmount,
  faDate,
  faNum,
  isCreditKind,
  isDebitKind,
  relativeTime,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import { SectionHeader, StatusPill } from '@/app/(customer)/customer/_lib/customer-ui';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  CreditCard,
  Download,
  History,
  Plus,
  Send,
  ShieldAlert,
  Upload,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import s from './WalletContent.module.css';

interface Props {
  profile: CustomerProfile;
  accounts: CustomerAccountDetail[];
  recentTransactions: CustomerTransactionRow[];
}

const KIND_ICON: Record<string, typeof ArrowDownLeft> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  TRANSFER: Send,
  EXCHANGE: ArrowLeftRight,
  FEE: CircleDollarSign,
  SETTLEMENT: CircleDollarSign,
  ADJUSTMENT: ArrowLeftRight,
};

// ─── Hero: ambient ring SVG (signature) ─────────────────────────────────── //

function HeroRings() {
  return (
    <svg className={s.heroRings} viewBox="0 0 400 400" fill="none" aria-hidden role="presentation">
      <title>ambient balance rings</title>
      <circle
        cx="200"
        cy="200"
        r="180"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="4 6"
        style={{ color: 'var(--ds-brand-400)', opacity: 0.35 }}
      />
      <circle
        cx="200"
        cy="200"
        r="140"
        stroke="currentColor"
        strokeWidth="1"
        style={{ color: 'var(--ds-brand-400)', opacity: 0.25 }}
      />
      <circle
        cx="200"
        cy="200"
        r="100"
        stroke="currentColor"
        strokeWidth="1.25"
        style={{ color: 'var(--ds-brand-500)', opacity: 0.18 }}
      />
      <circle
        cx="200"
        cy="200"
        r="60"
        stroke="currentColor"
        strokeWidth="1.75"
        style={{ color: 'var(--ds-brand-500)', opacity: 0.12 }}
      />
      <circle
        cx="200"
        cy="40"
        r="4"
        fill="currentColor"
        style={{ color: 'var(--ds-brand-500)', opacity: 0.5 }}
        className={s.breathDot}
      />
    </svg>
  );
}

// ─── Quick Action Card ──────────────────────────────────────────────────── //

interface QuickAction {
  href: string;
  label: string;
  icon: typeof Download;
  hint: string;
  accent: 'success' | 'error' | 'brand' | 'default';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: '/customer/transfer?action=deposit',
    label: 'واریز',
    icon: Download,
    hint: 'شارژ حساب',
    accent: 'success',
  },
  {
    href: '/customer/transfer?action=withdraw',
    label: 'برداشت',
    icon: Upload,
    hint: 'برداشت از حساب',
    accent: 'error',
  },
  {
    href: '/customer/transfer',
    label: 'انتقال',
    icon: Send,
    hint: 'به حساب دیگر',
    accent: 'brand',
  },
  {
    href: '/customer/transfer?action=exchange',
    label: 'تبدیل ارز',
    icon: ArrowLeftRight,
    hint: 'تبدیل فوری',
    accent: 'default',
  },
];

// ─── Main Component ─────────────────────────────────────────────────────── //

export function CustomerWalletContent({ profile, accounts, recentTransactions }: Props) {
  const activeAccounts = useMemo(() => accounts.filter((a) => a.status === 'ACTIVE'), [accounts]);
  const totalBalance = useMemo(
    () => activeAccounts.reduce((s, a) => s + a.balance, 0),
    [activeAccounts],
  );
  const primary = useMemo(
    () => activeAccounts[0] ?? accounts[0] ?? null,
    [activeAccounts, accounts],
  );
  const kycApproved = profile.kycStatus === 'APPROVED';
  const kycLevel = profile.kycLevel;

  return (
    <div className={s.workspace}>
      {/* ─── KYC Banner ─────────────────────────────────────────── */}
      {!kycApproved && (
        <div className={s.kycBanner} role="alert">
          <ShieldAlert
            size={18}
            aria-hidden
            style={{ color: 'var(--nova-amber)', flexShrink: 0 }}
          />
          <div className={s.kycBannerContent}>
            <p className={s.kycBannerText}>
              برای استفادهٔ کامل از کیف پول، احراز هویت خود را تکمیل کنید.
            </p>
            <div className={s.kycProgress}>
              <div
                className={s.kycProgressBar}
                style={{
                  inlineSize: kycLevel === 'NONE' ? '10%' : kycLevel === 'LEVEL_1' ? '50%' : '80%',
                }}
              />
            </div>
          </div>
          <Link href="/customer/kyc" className={s.kycBannerLink} aria-label="تکمیل احراز هویت">
            تکمیل ←
          </Link>
        </div>
      )}

      {/* ─── Hero Balance ──────────────────────────────────────── */}
      <section className={s.hero} aria-label="موجودی کیف پول">
        <HeroRings />
        <div className={s.heroInner}>
          <p className={s.heroEyebrow}>موجودی کل</p>
          <div className={s.heroBalanceRow}>
            <span className={s.heroBalance} aria-live="polite">
              {faNum(totalBalance)}
            </span>
            <span className={s.heroCurrency}>AFN</span>
          </div>
          <div className={s.heroMeta}>
            {kycApproved && (
              <span className={s.heroBadge}>
                <span className={s.heroBadgeDot} aria-hidden />
                حساب فعال
              </span>
            )}
            {profile.exchange.name && (
              <span className={s.heroExchange}>صرافی {profile.exchange.name}</span>
            )}
          </div>
        </div>
      </section>

      {/* ─── Account Grid ─────────────────────────────────────── */}
      <section aria-label="حساب‌های من">
        <SectionHeader
          title="حساب‌ها"
          sub={`${faNum(activeAccounts.length)} حساب فعال`}
          icon={CreditCard}
        />
        {activeAccounts.length === 0 ? (
          <output className={s.accountsEmpty}>
            <Wallet size={36} aria-hidden className={s.emptyIcon} />
            <p className={s.emptyTitle}>حساب فعالی ندارید</p>
            <p className={s.emptyDesc}>برای استفاده از خدمات، با صرافی تماس بگیرید.</p>
          </output>
        ) : (
          <ul className={s.accountGrid}>
            {activeAccounts.map((a, i) => {
              const typeLabel = ACCOUNT_TYPE_LABEL[a.type] ?? a.type;
              return (
                <li
                  key={a.id}
                  className={s.accountCard}
                  style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                >
                  <Link
                    href={`/customer/accounts/${a.id}`}
                    className={s.accountLink}
                    aria-label={`حساب ${a.currency} ${typeLabel}، موجودی ${faAmount(a.balance, a.currency)}`}
                  >
                    <span className={s.accountRail} aria-hidden />
                    <div className={s.accountTop}>
                      <span className={s.accountCurrency} aria-hidden>
                        <CircleDollarSign size={13} />
                        <span>{a.currency}</span>
                      </span>
                      <span className={s.accountType}>{typeLabel}</span>
                    </div>
                    <div className={s.accountBalanceRow}>
                      <span className={s.accountBalance}>{faNum(a.balance)}</span>
                      <span className={s.accountCurrencyLabel}>{a.currency}</span>
                    </div>
                    <div className={s.accountFoot}>
                      <StatusPill variant="success">فعال</StatusPill>
                      <ChevronLeft size={12} className={s.accountChevron} aria-hidden />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── Quick Actions ────────────────────────────────────── */}
      <section aria-label="اقدامات سریع">
        <SectionHeader title="اقدامات سریع" sub="عملیات‌های پرکاربرد" icon={Plus} />
        <ul className={s.quickGrid}>
          {QUICK_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            return (
              <li key={a.label} className={s.quickItem} style={{ animationDelay: `${i * 50}ms` }}>
                <Link
                  href={a.href}
                  className={`${s.quickCard} ${s[`quickCard--${a.accent}`] ?? ''}`}
                  aria-label={`${a.label} — ${a.hint}`}
                >
                  <span className={s.quickIcon} aria-hidden>
                    <Icon size={18} />
                  </span>
                  <span className={s.quickLabel}>{a.label}</span>
                  <span className={s.quickHint}>{a.hint}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ─── Recent Transactions ──────────────────────────────── */}
      <section aria-label="تراکنش‌های اخیر">
        <SectionHeader
          title="تراکنش‌های اخیر"
          sub={
            recentTransactions.length > 0 ? `${faNum(recentTransactions.length)} مورد` : undefined
          }
          icon={History}
          actions={
            <Link href="/customer/transactions" className={s.linkAction}>
              مشاهده همه
              <ChevronLeft size={11} aria-hidden />
            </Link>
          }
        />
        {recentTransactions.length === 0 ? (
          <output className={s.txEmpty}>
            <Clock size={32} aria-hidden className={s.emptyIcon} />
            <p className={s.emptyTitle}>هنوز تراکنشی ثبت نشده</p>
            <p className={s.emptyDesc}>اولین واریز خود را انجام دهید تا تاریخچه شروع شود.</p>
          </output>
        ) : (
          <ul className={s.txList}>
            {recentTransactions.map((txn, i) => {
              const Icon = KIND_ICON[txn.kind] ?? CircleDollarSign;
              const statusKey = TXN_STATUS_CSSKEY[txn.status] ?? 'neutral';
              const credit = isCreditKind(txn.kind);
              const debit = isDebitKind(txn.kind);
              return (
                <li
                  key={txn.id}
                  className={s.txRow}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <span className={`${s.txIcon} ${s[`txIcon--${statusKey}`] ?? ''}`} aria-hidden>
                    <Icon size={14} />
                  </span>
                  <div className={s.txBody}>
                    <p className={s.txKind}>{KIND_LABEL[txn.kind] ?? txn.kind}</p>
                    <p className={s.txMeta}>
                      <span title={faDate(txn.createdAt)}>{relativeTime(txn.createdAt)}</span>
                      {txn.counterparty && <span> · {txn.counterparty}</span>}
                    </p>
                  </div>
                  <div className={s.txAmountCol}>
                    <span
                      className={`${s.txAmount} ${credit ? s.txAmountCredit : ''} ${debit ? s.txAmountDebit : ''}`}
                      aria-label={`${credit ? 'واریز' : 'برداشت'} ${faAmount(txn.amount, txn.currency)}`}
                    >
                      {credit ? '+' : debit ? '−' : ''}
                      {faAmount(txn.amount, txn.currency)}
                    </span>
                    <span className={s.txStatus}>
                      <StatusPill variant={statusKey}>
                        {STATUS_LABEL[txn.status] ?? txn.status}
                      </StatusPill>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ─── Primary Account Note ──────────────────────────────── */}
      {primary && (
        <aside className={s.note} aria-label="نکته">
          <p className={s.noteText}>
            حساب اصلی شما: <strong>{faAmount(primary.balance, primary.currency)}</strong> (
            {ACCOUNT_TYPE_LABEL[primary.type] ?? primary.type})
          </p>
        </aside>
      )}
    </div>
  );
}
