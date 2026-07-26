'use client';

import type { CustomerAccountDetail, CustomerProfile } from '@/actions/customer-portal';
import { EmptyState, Section } from '@/components/Dashboard/primitives';
import { ChevronLeft, CreditCard, Lock } from 'lucide-react';
import Link from 'next/link';
import s from './AccountsContent.module.css';

interface Props {
  accounts: CustomerAccountDetail[];
  profile: CustomerProfile;
}

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  WALLET: 'کیف پول',
  SAVINGS: 'پس‌انداز',
  CHECKING: 'جاری',
  INVESTMENT: 'سرمایه‌گذاری',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار فعال‌سازی',
  ACTIVE: 'فعال',
  FROZEN: 'منجمد',
  CLOSED: 'بسته',
};

function formatBalance(amount: number, currency: string): string {
  return new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 0 }).format(amount);
}

export default function AccountsContent({ accounts, profile }: Props) {
  const activeAccounts = accounts.filter((a) => a.status !== 'CLOSED');
  const closedAccounts = accounts.filter((a) => a.status === 'CLOSED');

  return (
    <div className={s.root}>
      {/* Summary row */}
      <div className={s.summaryRow}>
        {['AFN', 'USD', 'IRR'].map((cur) => {
          const acc = activeAccounts.find((a) => a.currency === cur && a.status === 'ACTIVE');
          return (
            <div key={cur} className={s.summaryCard} data-currency={cur}>
              <span className={s.summaryCur}>{cur}</span>
              <span className={s.summaryBal}>{acc ? formatBalance(acc.balance, cur) : '—'}</span>
              <span className={s.summaryLabel}>{acc ? 'موجودی' : 'حساب ندارید'}</span>
            </div>
          );
        })}
      </div>

      {/* Active accounts */}
      <Section title="حساب‌های فعال">
        {activeAccounts.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="حسابی ندارید"
            description="برای باز کردن حساب با صرافی تماس بگیرید"
          />
        ) : (
          <div className={s.accountsGrid}>
            {activeAccounts.map((acc) => (
              <Link
                key={acc.id}
                href={`/customer/accounts/${acc.id}`}
                className={`${s.accountCard} ${s.accountCardLink}`}
                data-status={acc.status}
              >
                <div className={s.cardTop}>
                  <div className={s.cardTypeBlock}>
                    <span className={s.cardType}>{ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type}</span>
                    {acc.label && <span className={s.cardLabel}>{acc.label}</span>}
                  </div>
                  <span className={s.cardStatus} data-status={acc.status}>
                    {acc.status === 'FROZEN' && <Lock className="w-3 h-3" aria-hidden />}
                    {STATUS_LABEL[acc.status] ?? acc.status}
                  </span>
                </div>

                <div className={s.cardBalance}>
                  <span className={s.balanceAmount}>
                    {formatBalance(acc.balance, acc.currency)}
                  </span>
                  <span className={s.balanceCurrency}>{acc.currency}</span>
                </div>

                {acc.frozenUntil && (
                  <p className={s.frozenNote}>
                    منجمد تا: {new Intl.DateTimeFormat('fa-IR').format(acc.frozenUntil)}
                  </p>
                )}

                <div className={s.cardFooter}>
                  <span className={s.cardDate}>
                    افتتاح:{' '}
                    {new Intl.DateTimeFormat('fa-IR', {
                      year: 'numeric',
                      month: 'long',
                    }).format(acc.createdAt)}
                  </span>
                  <ChevronLeft className="w-3.5 h-3.5 text-[var(--at-fg-subtle)]" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Closed accounts */}
      {closedAccounts.length > 0 && (
        <Section title="حساب‌های بسته">
          <div className={s.closedList}>
            {closedAccounts.map((acc) => (
              <div key={acc.id} className={s.closedRow}>
                <span className={s.closedType}>{ACCOUNT_TYPE_LABEL[acc.type] ?? acc.type}</span>
                <span className={s.closedCur}>{acc.currency}</span>
                <span className={s.closedDate}>
                  {new Intl.DateTimeFormat('fa-IR').format(acc.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Exchange info */}
      <Section title="صرافی">
        <div className={s.exchangeInfo}>
          <div className={s.exchangeRow}>
            <span className={s.exchangeLabel}>نام صرافی</span>
            <span className={s.exchangeValue}>{profile.exchange.name}</span>
          </div>
          {profile.exchange.phone && (
            <div className={s.exchangeRow}>
              <span className={s.exchangeLabel}>تلفن تماس</span>
              <span className={s.exchangeValue} dir="ltr">
                {profile.exchange.phone}
              </span>
            </div>
          )}
          {profile.exchange.city && (
            <div className={s.exchangeRow}>
              <span className={s.exchangeLabel}>شهر</span>
              <span className={s.exchangeValue}>{profile.exchange.city}</span>
            </div>
          )}
          {profile.personalLimitAf !== null && (
            <div className={s.exchangeRow}>
              <span className={s.exchangeLabel}>سقف تراکنش روزانه</span>
              <span className={s.exchangeValue}>
                {new Intl.NumberFormat('fa-IR').format(profile.personalLimitAf)} AFN
              </span>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
