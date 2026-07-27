'use client';

/**
 * AccountsContent — «دفتر کل» مشتری
 * ----------------------------------------------------------------------------
 *  - Currency summary: ۳ کارت ارز (موجودی هر ارز) — Pattern: Token Block
 *  - Account Ledger: grid از کارت‌های حساب با rail رنگی + ledger pattern
 *  - Exchange info: لیست تنظیمات صرافی
 *  - Closed accounts: لیست کم‌رنگ
 */

import type { CustomerAccountDetail, CustomerProfile } from '@/actions/customer-portal';
import {
  ACCOUNT_TYPE_LABEL,
  CUSTOMER_STATUS_CSSKEY,
  STATUS_LABEL,
  faAmount,
  faDate,
  faNum,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  EmptyHint,
  SectionHeader,
  StatusDot,
  StatusPill,
  StatusRail,
  ViewAllLink,
} from '@/app/(customer)/customer/_lib/customer-ui';
import { Building2, ChevronLeft, CreditCard, Lock, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import s from './AccountsContent.module.css';

interface Props {
  accounts: CustomerAccountDetail[];
  profile: CustomerProfile;
}

const STATUS_CSSKEY: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'neutral',
  ACTIVE: 'success',
  FROZEN: 'warning',
  CLOSED: 'danger',
};

export default function AccountsContent({ accounts, profile }: Props) {
  const activeAccounts = accounts.filter((a) => a.status !== 'CLOSED');
  const closedAccounts = accounts.filter((a) => a.status === 'CLOSED');

  // currency summary: max balance per currency (the primary one)
  const currencies: string[] = Array.from(new Set(activeAccounts.map((a) => a.currency))).slice(0, 4);
  const maxBalance = Math.max(1, ...activeAccounts.map((a) => a.balance));

  return (
    <div className={s.root} dir="rtl">
      {/* ── Currency Summary Strip ───────────────────────────────────── */}
      <section className={s.currencyStrip} aria-label="خلاصه موجودی ارزها">
        {currencies.length === 0 ? (
          <div className={s.currencyEmpty}>
            <Wallet size={20} aria-hidden />
            <span>هنوز حسابی برای نمایش موجودی ندارید</span>
          </div>
        ) : (
          currencies.map((cur, i) => {
            const acc = activeAccounts.find((a) => a.currency === cur && a.status === 'ACTIVE');
            const total = activeAccounts
              .filter((a) => a.currency === cur && a.status === 'ACTIVE')
              .reduce((sum, a) => sum + a.balance, 0);
            const ratio = (total / maxBalance) * 100;
            return (
              <article
                key={cur}
                className={s.currencyCard}
                style={{ animationDelay: `${i * 50}ms` }}
                data-currency={cur}
              >
                <header className={s.currencyHead}>
                  <span className={s.currencyCode}>{cur}</span>
                  <span className={s.currencyName}>
                    {cur === 'AFN' ? 'افغانی' : cur === 'USD' ? 'دلار آمریکا' : cur === 'EUR' ? 'یورو' : cur === 'IRR' ? 'ریال ایران' : 'ارز'}
                  </span>
                </header>
                <div className={s.currencyBalance}>
                  <span className={s.currencyAmount}>
                    {acc ? faNum(total) : '۰'}
                  </span>
                  <span className={s.currencyUnit}>{cur}</span>
                </div>
                <div className={s.currencyTrack} aria-hidden>
                  <span className={s.currencyFill} style={{ inlineSize: `${Math.max(2, ratio)}%` }} />
                </div>
                <footer className={s.currencyFoot}>
                  {acc ? (
                    <span className={s.currencyActive}>
                      <StatusDot variant="success" />
                      {faNum(activeAccounts.filter((a) => a.currency === cur && a.status === 'ACTIVE').length)} حساب فعال
                    </span>
                  ) : (
                    <span className={s.currencyInactive}>
                      <StatusDot variant="neutral" />
                      حساب ندارید
                    </span>
                  )}
                </footer>
              </article>
            );
          })
        )}
      </section>

      {/* ── Active Accounts Ledger ───────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={CreditCard}
          title="حساب‌های فعال"
          sub={`${faNum(activeAccounts.length)} حساب`}
          actions={
            <Link href="/customer/transfer" className={s.ctaPill}>
              <Plus size={11} aria-hidden />
              انتقال سریع
            </Link>
          }
        />
        {activeAccounts.length === 0 ? (
          <EmptyHint
            icon={CreditCard}
            title="حسابی ندارید"
            description="برای باز کردن حساب با صرافی تماس بگیرید"
            action={
              <Link href="/customer/notifications" className={s.ctaPrimary}>
                <Plus size={11} aria-hidden />
                درخواست حساب جدید
              </Link>
            }
          />
        ) : (
          <ul className={s.accountsList}>
            {activeAccounts.map((acc, i) => {
              const statusKey = STATUS_CSSKEY[acc.status] ?? 'neutral';
              return (
                <li
                  key={acc.id}
                  className={s.accountRow}
                  data-status={statusKey}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Link href={`/customer/accounts/${acc.id}`} className={s.accountLink}>
                    <StatusRail variant={statusKey} />
                    <span className={s.accountIcon} aria-hidden>
                      {acc.status === 'FROZEN' ? <Lock size={13} /> : <CreditCard size={13} />}
                    </span>
                    <div className={s.accountMain}>
                      <div className={s.accountTopRow}>
                        <span className={s.accountType}>{ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type}</span>
                        {acc.label && <span className={s.accountLabel}>{acc.label}</span>}
                        <span className={s.accountCurrency}>{acc.currency}</span>
                      </div>
                      <div className={s.accountBottomRow}>
                        <StatusPill variant={statusKey}>
                          {STATUS_LABEL[acc.status] ?? acc.status}
                        </StatusPill>
                        {acc.frozenUntil && (
                          <span className={s.accountFrozen}>
                            منجمد تا {faDate(acc.frozenUntil)}
                          </span>
                        )}
                        <span className={s.accountDate}>
                          افتتاح {faDate(acc.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className={s.accountRight}>
                      <span className={s.accountBalance}>{faNum(acc.balance)}</span>
                      <span className={s.accountBalanceUnit}>{acc.currency}</span>
                    </div>
                    <ChevronLeft size={12} className={s.accountChevron} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Exchange Info ────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader
          icon={Building2}
          title="صرافی شما"
          sub={profile.exchange.name}
        />
        <div className={s.exchangeGrid}>
          <div className={s.exchangeCell}>
            <span className={s.exchangeLabel}>نام صرافی</span>
            <span className={s.exchangeValue}>{profile.exchange.name}</span>
          </div>
          {profile.exchange.city && (
            <div className={s.exchangeCell}>
              <span className={s.exchangeLabel}>شهر</span>
              <span className={s.exchangeValue}>{profile.exchange.city}</span>
            </div>
          )}
          {profile.exchange.phone && (
            <div className={s.exchangeCell}>
              <span className={s.exchangeLabel}>تلفن تماس</span>
              <a
                href={`tel:${profile.exchange.phone}`}
                className={s.exchangeValue}
                data-mono
                dir="ltr"
              >
                {profile.exchange.phone}
              </a>
            </div>
          )}
          {profile.personalLimitAf !== null && (
            <div className={s.exchangeCell}>
              <span className={s.exchangeLabel}>سقف تراکنش روزانه</span>
              <span className={s.exchangeValue} data-mono>
                {faAmount(profile.personalLimitAf, 'AFN')}
              </span>
            </div>
          )}
          <div className={s.exchangeCell}>
            <span className={s.exchangeLabel}>وضعیت حساب</span>
            <StatusPill variant={CUSTOMER_STATUS_CSSKEY[profile.status] ?? 'neutral'}>
              {STATUS_LABEL[profile.status] ?? profile.status}
            </StatusPill>
          </div>
        </div>
      </section>

      {/* ── Closed Accounts ──────────────────────────────────────────── */}
      {closedAccounts.length > 0 && (
        <section className={s.section}>
          <SectionHeader
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
                <span className={s.closedType}>{ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type}</span>
                <span className={s.closedCurrency}>{acc.currency}</span>
                <span className={s.closedDate}>{faDate(acc.createdAt)}</span>
                <StatusPill variant="cancelled">بسته</StatusPill>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className={s.foot}>
        <ViewAllLink href="/customer/dashboard" icon={Plus}>
          بازگشت به داشبورد
        </ViewAllLink>
      </footer>
    </div>
  );
}
