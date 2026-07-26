'use client';

/**
 * CustomerDashboardContent — محتوای داشبورد مشتری
 *
 * نمایش: موجودی حساب‌ها، آخرین تراکنش‌ها، وضعیت KYC و آمار خلاصه
 */

import type { CustomerDashboardData } from '@/actions/customer-portal';
import {
  EmptyState,
  PageHeader,
  Section,
  StatCard,
  StatGrid,
} from '@/components/Dashboard/primitives';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import s from './CustomerDashboardContent.module.css';

interface Props {
  data: CustomerDashboardData;
}

const KYC_CONFIG: Record<string, { label: string; icon: LucideIcon; cls: string }> = {
  NOT_STARTED: {
    label: 'احراز هویت انجام نشده — برای تراکنش‌های بالا KYC الزامی است',
    icon: AlertTriangle,
    cls: s.kycWarning,
  },
  PENDING: {
    label: 'مدارک احراز هویت در حال بررسی است',
    icon: Clock,
    cls: s.kycPending,
  },
  APPROVED: {
    label: 'احراز هویت تأیید شده',
    icon: CheckCircle2,
    cls: s.kycApproved,
  },
  REJECTED: {
    label: 'احراز هویت رد شد — برای اطلاع از دلیل با پشتیبانی تماس بگیرید',
    icon: AlertTriangle,
    cls: s.kycDanger,
  },
  EXPIRED: {
    label: 'تأییدیه احراز هویت منقضی شده — نیاز به تجدید',
    icon: AlertTriangle,
    cls: s.kycWarning,
  },
};

const KIND_LABEL: Record<string, string> = {
  DEPOSIT: 'واریز',
  WITHDRAWAL: 'برداشت',
  TRANSFER: 'انتقال',
  EXCHANGE: 'تبدیل ارز',
  FEE: 'کارمزد',
  SETTLEMENT: 'تسویه',
  ADJUSTMENT: 'اصلاح',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'در انتظار',
  PROCESSING: 'در حال پردازش',
  COMPLETED: 'انجام شده',
  FAILED: 'ناموفق',
  REVERSED: 'برگشت خورده',
  CANCELLED: 'لغو شده',
};

function formatAmount(amount: number, currency: string): string {
  return `${new Intl.NumberFormat('fa-IR').format(amount)} ${currency}`;
}

function isCredit(kind: string): boolean {
  return kind === 'DEPOSIT' || kind === 'TRANSFER';
}

export default function CustomerDashboardContent({ data }: Props) {
  const { profile, accounts, recentTransactions, stats } = data;
  const kyc = KYC_CONFIG[profile.kycStatus] ?? KYC_CONFIG.NOT_STARTED;

  return (
    <div className={s.root}>
      <PageHeader
        title={`خوش آمدید، ${profile.fullName}`}
        description={`${profile.exchange.name} · پورتال مشتری`}
        breadcrumb={[{ label: 'پورتال مشتری' }, { label: 'داشبورد' }]}
        icon="wallet"
      />

      {/* KYC alert */}
      {profile.kycStatus !== 'APPROVED' && (
        <div className={`${s.kycAlert} ${kyc.cls}`} role="alert">
          <kyc.icon className="w-4 h-4 flex-shrink-0" aria-hidden />
          <span>{kyc.label}</span>
          {(profile.kycStatus === 'NOT_STARTED' || profile.kycStatus === 'EXPIRED') && (
            <Link href="/customer/kyc" className={s.kycLink}>
              شروع احراز هویت
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <StatGrid cols={3}>
        <StatCard
          label="موجودی کل (افغانی)"
          value={stats.totalBalanceAfn}
          icon={CircleDollarSign}
          href="/customer/accounts"
          format="compact"
        />
        <StatCard
          label="کل تراکنش‌ها"
          value={stats.totalTransactions}
          icon={CreditCard}
          href="/customer/transactions"
        />
        <StatCard
          label="تراکنش‌های موفق"
          value={stats.completedTransactions}
          icon={CheckCircle2}
          href="/customer/transactions"
        />
      </StatGrid>

      {/* Accounts */}
      <Section
        title="حساب‌های من"
        actions={
          <Link href="/customer/accounts" className={s.viewAllLink}>
            مشاهده همه
          </Link>
        }
      >
        {accounts.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="حسابی یافت نشد"
            description="برای باز کردن حساب با صرافی تماس بگیرید"
          />
        ) : (
          <div className={s.accountsGrid}>
            {accounts.map((account) => (
              <Link
                key={account.id}
                href={`/customer/accounts/${account.id}`}
                className={s.accountCard}
                data-status={account.status}
              >
                <div className={s.accountHeader}>
                  <span className={s.accountCurrency}>{account.currency}</span>
                  <span className={s.accountType}>{account.type}</span>
                </div>
                <div className={s.accountBalance}>
                  {new Intl.NumberFormat('fa-IR').format(account.balance)}
                </div>
                <div className={s.accountStatus} data-status={account.status}>
                  {account.status === 'ACTIVE'
                    ? '● فعال'
                    : account.status === 'FROZEN'
                      ? '● منجمد'
                      : '○ بسته'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Recent transactions */}
      <Section
        title="آخرین تراکنش‌ها"
        actions={
          <Link href="/customer/transactions" className={s.viewAllLink}>
            مشاهده همه
          </Link>
        }
      >
        {recentTransactions.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="تراکنشی وجود ندارد"
            description="هنوز هیچ تراکنشی ثبت نشده است"
          />
        ) : (
          <div className={s.txnList}>
            {recentTransactions.map((txn) => (
              <Link key={txn.id} href={`/customer/transactions/${txn.id}`} className={s.txnRow}>
                <div className={s.txnIcon} data-credit={isCredit(txn.kind)} aria-hidden>
                  {isCredit(txn.kind) ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </div>
                <div className={s.txnInfo}>
                  <span className={s.txnKind}>{KIND_LABEL[txn.kind] ?? txn.kind}</span>
                  <span className={s.txnDate}>
                    {new Intl.DateTimeFormat('fa-IR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(txn.createdAt))}
                  </span>
                </div>
                <div className={s.txnMeta}>
                  <span className={s.txnAmount} data-credit={isCredit(txn.kind)}>
                    {isCredit(txn.kind) ? '+' : '−'}
                    {formatAmount(txn.amount, txn.currency)}
                  </span>
                  <span className={s.txnStatus} data-status={txn.status}>
                    {STATUS_LABEL[txn.status] ?? txn.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
