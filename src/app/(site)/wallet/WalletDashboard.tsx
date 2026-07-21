/**
 * WalletDashboard — داشبورد واقعی کیف پول مشتری لاگین‌شده
 *
 * Server Component: موجودی FintechAccount و آخرین LedgerEntries را مستقیم
 * از DB می‌گیرد. بدون useEffect/client fetch برای initial load.
 */

import prisma from '@/lib/db';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import s from './WalletDashboard.module.css';

const CURRENCY_LABELS: Record<string, string> = {
  AFN: 'افغانی',
  USD: 'دلار',
  EUR: 'یورو',
  IRR: 'ریال',
  AED: 'درهم',
};

interface Props {
  userId: string;
}

export default async function WalletDashboard({ userId }: Props) {
  // پیدا کردن customer مرتبط با این user (ممکن است در چند صرافی باشد)
  const customer = await prisma.customer.findFirst({
    where: { userId },
    select: { id: true, exchangeId: true, fullName: true },
  });

  if (!customer) {
    return (
      <div className={s.empty}>
        <Wallet size={32} strokeWidth={1.5} className={s.emptyIcon} aria-hidden />
        <h2 className={s.emptyTitle}>کیف پول فعال نیست</h2>
        <p className={s.emptyDesc}>برای فعال‌سازی کیف پول با یکی از صرافی‌های عضو تماس بگیرید.</p>
      </div>
    );
  }

  const [accounts, ledgerEntries] = await Promise.all([
    prisma.fintechAccount.findMany({
      where: { customerId: customer.id, status: 'ACTIVE' },
      select: { id: true, currency: true, balance: true },
      orderBy: { currency: 'asc' },
    }),
    prisma.ledgerEntry.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        direction: true,
        amount: true,
        currency: true,
        description: true,
        createdAt: true,
        runningBalance: true,
      },
    }),
  ]);

  const totalAfn = accounts.find((a) => a.currency === 'AFN')?.balance ?? BigInt(0);

  return (
    <div className={s.root}>
      {/* موجودی‌ها */}
      <section className={s.balances} aria-label="موجودی حساب‌ها">
        <h2 className={s.sectionTitle}>موجودی‌های من</h2>
        {accounts.length === 0 ? (
          <p className={s.noAccount}>هنوز حسابی ایجاد نشده است.</p>
        ) : (
          <div className={s.accountGrid}>
            {accounts.map((acc) => (
              <div key={acc.id} className={s.accountCard}>
                <div className={s.accountCurrency}>
                  {CURRENCY_LABELS[acc.currency] ?? acc.currency}
                </div>
                <div className={s.accountBalance}>
                  {new Intl.NumberFormat('fa-IR').format(Number(acc.balance) / 100)}
                  <span className={s.accountUnit}>{acc.currency}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* آخرین تراکنش‌ها */}
      <section className={s.transactions} aria-label="آخرین تراکنش‌ها">
        <h2 className={s.sectionTitle}>
          آخرین تراکنش‌ها
          <span className={s.sectionBadge}>
            {new Intl.NumberFormat('fa-IR').format(Number(totalAfn) / 100)} AFN
          </span>
        </h2>

        {ledgerEntries.length === 0 ? (
          <p className={s.noTx}>هنوز تراکنشی ثبت نشده است.</p>
        ) : (
          <ul className={s.txList}>
            {ledgerEntries.map((entry) => {
              const isCredit = entry.direction === 'CREDIT';
              return (
                <li key={entry.id} className={s.txRow}>
                  <span
                    className={`${s.txIcon} ${isCredit ? s.txIconCredit : s.txIconDebit}`}
                    aria-hidden
                  >
                    {isCredit ? (
                      <ArrowDownLeft size={14} strokeWidth={2.5} />
                    ) : (
                      <ArrowUpRight size={14} strokeWidth={2.5} />
                    )}
                  </span>
                  <span className={s.txDesc}>
                    {entry.description ?? (isCredit ? 'واریز' : 'برداشت')}
                  </span>
                  <span
                    className={`${s.txAmount} ${isCredit ? s.txAmountCredit : s.txAmountDebit}`}
                  >
                    {isCredit ? '+' : '−'}
                    {new Intl.NumberFormat('fa-IR').format(Number(entry.amount) / 100)}{' '}
                    {entry.currency}
                  </span>
                  <time className={s.txDate} dateTime={entry.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(
                      entry.createdAt,
                    )}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
