import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { StatCard } from '@/components/Dashboard/primitives/StatCard';
import { Badge } from '@/components/ui/badge';
import { type SupportedCurrency, formatCurrency } from '@/lib/afn-format';
import prisma from '@/lib/db';
import { formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  FileText,
  Headphones,
  Plus,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { EmailVerificationWatcher } from './EmailVerificationWatcher';
import styles from './UserHome.module.css';

interface UserHomeProps {
  userId: string;
  userName: string;
  userEmail: string;
  emailVerified: boolean;
  accountAgeDays?: number;
  role: string;
}

async function getUserOverview(userId: string) {
  const [
    requestsCount,
    pendingRequests,
    unreadNotifications,
    recentRequests,
    recentNotifications,
    kycStatus,
  ] = await Promise.all([
    prisma.serviceRequest.count({ where: { userId } }).catch(() => 0),
    prisma.serviceRequest.count({ where: { userId, status: 'PENDING' } }).catch(() => 0),
    prisma.notification.count({ where: { userId, isRead: false } }).catch(() => 0),
    prisma.serviceRequest
      .findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          trackingCode: true,
          serviceType: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      })
      .catch(() => []),
    prisma.notification
      .findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, message: true, isRead: true, createdAt: true },
      })
      .catch(() => []),
    prisma.kycVerification
      .findFirst({
        where: { customerId: userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      })
      .catch(() => null),
  ]);

  return {
    requestsCount,
    pendingRequests,
    unreadNotifications,
    recentRequests,
    recentNotifications,
    kycStatus: kycStatus?.status ?? 'PENDING',
  };
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  REJECTED: 'destructive',
  AWAITING_PAYMENT: 'outline',
  AWAITING_INFO: 'outline',
};
const statusLabelMap: Record<string, string> = {
  PENDING: 'در انتظار بررسی',
  IN_PROGRESS: 'در حال انجام',
  COMPLETED: 'تکمیل شده',
  CANCELLED: 'لغو شده',
  REJECTED: 'رد شده',
  AWAITING_PAYMENT: 'در انتظار پرداخت',
  AWAITING_INFO: 'در انتظار اطلاعات',
};
const serviceTypeLabelMap: Record<string, string> = {
  INTERNATIONAL_TRANSFER: 'حواله بین‌المللی',
  ONLINE_PAYMENT: 'پرداخت آنلاین',
  TUITION_PAYMENT: 'پرداخت شهریه',
  FREELANCE_INCOME: 'نقد کردن درآمد',
  SOFTWARE_PURCHASE: 'خرید نرم‌افزار',
  GIFT_CARD: 'گیفت کارت',
  CURRENCY_BUY: 'خرید ارز',
  CURRENCY_SELL: 'فروش ارز',
  CRYPTO_BUY: 'خرید ارز دیجیتال',
  CRYPTO_SELL: 'فروش ارز دیجیتال',
  PAYPAL_TRANSFER: 'انتقال پی‌پال',
  MOBILE_TOPUP: 'شارژ موبایل',
  BILL_PAYMENT: 'پرداخت قبض',
  OTHER: 'سایر',
};

export async function UserHome({
  userId,
  userName,
  userEmail,
  emailVerified,
  accountAgeDays = 999,
}: UserHomeProps) {
  const overview = await getUserOverview(userId);
  const showWelcome = accountAgeDays < 7 && (overview.requestsCount === 0 || !emailVerified);
  const kycCompleted = overview.kycStatus === 'APPROVED';
  const kycExpired = overview.kycStatus === 'EXPIRED';

  return (
    <div className={`${styles.root} dashboard-user-home`} dir="rtl">
      <EmailVerificationWatcher initialVerified={emailVerified} />
      <section className={styles.header} aria-labelledby="user-home-title">
        <div className={styles.headerMeta}>
          <span className={styles.greeting}>نمای کلی حساب</span>
          <h1 id="user-home-title" className={styles.name}>
            سلام، {userName || 'کاربر گرامی'}
          </h1>
          {/* 2026-08-09: div به‌جای p — Badge یک <div> رندر می‌کند و div داخل p
              نامعتبر است (باعث خطای hydration در داشبورد می‌شد). */}
          <div className={styles.subtitle}>
            <span dir="ltr">{userEmail}</span>
            <Badge variant={emailVerified ? 'secondary' : 'destructive'} className={styles.badge}>
              {emailVerified ? 'ایمیل تأیید شده' : 'ایمیل تأیید نشده'}
            </Badge>
          </div>
        </div>
        <div className={styles.headerAction}>
          <Link href="/dashboard/my-requests" className={styles.primaryCta}>
            <Plus aria-hidden />
            <span>درخواست جدید</span>
          </Link>
        </div>
      </section>

      {showWelcome ? (
        <section className={styles.welcome} aria-label="شروع کار">
          <div className={styles.welcomeIcon}>
            <Sparkles aria-hidden />
          </div>
          <div className={styles.welcomeText}>
            <h2 className={styles.welcomeTitle}>سه قدم تا آماده‌شدن حساب</h2>
            <p className={styles.welcomeDesc}>ایمیل، احراز هویت و اولین درخواست را کامل کنید.</p>
          </div>
          <div className={styles.welcomeSteps}>
            {!emailVerified ? (
              <Link href="/dashboard/edit-profile" className={styles.welcomeStep}>
                <span className={styles.welcomeStepIndex}>۱</span>
                <span>تأیید ایمیل</span>
              </Link>
            ) : null}
            <Link href="/customer/kyc" className={styles.welcomeStep}>
              <span className={styles.welcomeStepIndex}>۲</span>
              <span>احراز هویت</span>
            </Link>
            <Link href="/dashboard/my-requests" className={styles.welcomeStep}>
              <span className={styles.welcomeStepIndex}>۳</span>
              <span>اولین درخواست</span>
            </Link>
          </div>
        </section>
      ) : null}

      {kycCompleted ? (
        <section
          className={`${styles.kycBanner} ${styles.kycBannerCompleted}`}
          aria-label="وضعیت احراز هویت"
        >
          <div className={`${styles.kycIcon} ${styles.kycIconCompleted}`}>
            <CheckCircle aria-hidden />
          </div>
          <div className={styles.kycText}>
            <h2 className={styles.kycTitle}>احراز هویت تکمیل شده</h2>
            <p className={styles.kycDesc}>به تمام خدمات دسترسی دارید.</p>
          </div>
          <Badge variant="secondary" className={styles.kycBadge}>
            تأیید شده
          </Badge>
        </section>
      ) : kycExpired ? (
        <section
          className={`${styles.kycBanner} ${styles.kycBannerExpired}`}
          aria-label="وضعیت احراز هویت"
        >
          <div className={`${styles.kycIcon} ${styles.kycIconExpired}`}>
            <Shield aria-hidden />
          </div>
          <div className={styles.kycText}>
            <h2 className={styles.kycTitle}>احراز هویت منقضی شده</h2>
            <p className={styles.kycDesc}>برای دسترسی کامل، احراز هویت را تمدید کنید.</p>
          </div>
          <Link href="/customer/kyc" className={`${styles.kycCta} ${styles.kycCtaUrgent}`}>
            <span>تمدید احراز هویت</span>
            <ArrowLeft aria-hidden />
          </Link>
        </section>
      ) : (
        <section className={styles.kycBanner} aria-label="وضعیت احراز هویت">
          <div className={styles.kycIcon}>
            <Shield aria-hidden />
          </div>
          <div className={styles.kycText}>
            <h2 className={styles.kycTitle}>احراز هویت، مسیر خدمات مالی</h2>
            <p className={styles.kycDesc}>برای دسترسی کامل، احراز هویت را تکمیل کنید.</p>
          </div>
          <Link href="/customer/kyc" className={styles.kycCta}>
            <span>شروع احراز هویت</span>
            <ArrowLeft aria-hidden />
          </Link>
        </section>
      )}

      <section className={styles.statsGrid} aria-label="خلاصه فعالیت">
        <StatCard
          label="کل درخواست‌ها"
          value={overview.requestsCount}
          icon={<FileText aria-hidden />}
          href="/dashboard/my-requests"
        />
        <StatCard
          label="در انتظار بررسی"
          value={overview.pendingRequests}
          icon={<FileText aria-hidden />}
          href="/dashboard/my-requests"
        />
        <StatCard
          label="اعلان‌های خوانده‌نشده"
          value={overview.unreadNotifications}
          icon={<Bell aria-hidden />}
          href="/dashboard/notifications"
        />
      </section>

      <section className={styles.quickActions} aria-label="اقدامات سریع">
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>دسترسی سریع</h2>
          <span className={styles.sectionMeta}>۶ میان‌بر</span>
        </header>
        <div className={styles.actionsGrid}>
          <Link href="/dashboard/my-requests" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <Plus aria-hidden />
            </span>
            <span className={styles.actionLabel}>درخواست جدید</span>
          </Link>
          <Link href="/dashboard/transfer" className={styles.actionCard}>
            {/* RTL: forward/action arrows point LEFT. ArrowRight would read as
                "back" in a RTL layout (same fix as FintechCockpit). */}
            <span className={styles.actionIcon}>
              <ArrowLeft aria-hidden />
            </span>
            <span className={styles.actionLabel}>انتقال وجه</span>
          </Link>
          <Link href="/dashboard/wallet" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <Wallet aria-hidden />
            </span>
            <span className={styles.actionLabel}>کیف پول</span>
          </Link>
          <Link href="/customer/kyc" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <Shield aria-hidden />
            </span>
            <span className={styles.actionLabel}>احراز هویت</span>
          </Link>
          <Link href="/market-rates" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <TrendingUp aria-hidden />
            </span>
            <span className={styles.actionLabel}>نرخ ارز</span>
          </Link>
          <Link href="/dashboard/helpdesk" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <Headphones aria-hidden />
            </span>
            <span className={styles.actionLabel}>پشتیبانی</span>
          </Link>
        </div>
      </section>

      <section className={styles.recent} aria-label="درخواست‌های اخیر">
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <FileText aria-hidden className={styles.sectionTitleIcon} size={18} />
            <span>درخواست‌های اخیر</span>
          </h2>
          <Link href="/dashboard/my-requests" className={styles.seeAll}>
            <span>مشاهده همه</span>
            <ArrowLeft aria-hidden />
          </Link>
        </header>
        {overview.recentRequests.length === 0 ? (
          <EmptyState
            title="هنوز درخواستی ثبت نکرده‌اید"
            description="اولین درخواست را ثبت کنید تا پیگیری آن همین‌جا نمایش داده شود."
            action={
              <Link href="/dashboard/my-requests" className={styles.emptyCta}>
                <Plus aria-hidden />
                <span>ثبت اولین درخواست</span>
              </Link>
            }
          />
        ) : (
          <ul className={styles.requestsList}>
            {overview.recentRequests.map((r) => (
              <li key={r.id} className={styles.requestItem}>
                <Link
                  href={`/track/${encodeURIComponent(r.trackingCode)}`}
                  className={styles.requestLink}
                >
                  <div className={styles.requestMeta}>
                    <span className={styles.requestType}>
                      {serviceTypeLabelMap[r.serviceType] ?? r.serviceType}
                    </span>
                    <span className={styles.requestCode}>{r.trackingCode}</span>
                  </div>
                  <div className={styles.requestBody}>
                    <span className={styles.requestAmount}>
                      {formatCurrency(Number(r.amount), (r.currency as SupportedCurrency) ?? 'USD')}
                    </span>
                    <Badge variant={statusVariantMap[r.status] ?? 'secondary'}>
                      {statusLabelMap[r.status] ?? r.status}
                    </Badge>
                    <span className={styles.requestDate}>{formatRelativeTime(r.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {overview.recentNotifications.length > 0 ? (
        <section className={styles.activity} aria-label="اعلان‌های اخیر">
          <header className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <Bell aria-hidden className={styles.sectionTitleIcon} size={18} />
              <span>آخرین اعلان‌ها</span>
            </h2>
            <Link href="/dashboard/notifications" className={styles.seeAll}>
              <span>مرکز اعلان‌ها</span>
              <ArrowLeft aria-hidden />
            </Link>
          </header>
          <ul className={styles.activityList}>
            {overview.recentNotifications.map((n) => (
              <li
                key={n.id}
                className={`${styles.activityItem} ${!n.isRead ? styles.activityItemUnread : ''}`}
              >
                <span className={styles.activityDot} aria-hidden />
                <span className={styles.activityMessage}>{n.message}</span>
                <span className={styles.activityTime}>{formatRelativeTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
