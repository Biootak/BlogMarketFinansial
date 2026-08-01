/**
 * UserHome — خانه کاربر معمولی (USER role)
 *
 * 2026-07-29: اضافه شد تا کاربران USER (نه ادمین/نویسنده) وقتی وارد
 * /dashboard می‌شوند، صفحه خالی یا ریدایرکت به خانه نبینند. این کامپوننت
 * داده‌های کاربر را جمع می‌کند و یک خلاصهٔ سریع + لینک‌های پرکاربرد
 * نمایش می‌دهد.
 *
 * ساختار:
 *  - Header با نام و وضعیت احراز هویت
 *  - Welcome banner (برای کاربران جدید < ۷ روز)
 *  - KYC banner (همیشه — اهمیت احراز هویت)
 *  - Stats سریع (درخواست‌ها، اعلان‌ها)
 *  - Quick actions (KYC، درخواست جدید، انتقال)
 *  - Recent requests (۵ مورد آخر)
 *  - Activity feed (۵ اعلان اخیر)
 *  - Empty states با CTA
 */

import { EmptyState } from '@/components/Dashboard/primitives/EmptyState';
import { StatCard } from '@/components/Dashboard/primitives/StatCard';
import { Badge } from '@/components/ui/badge';
import { type SupportedCurrency, formatCurrency } from '@/lib/afn-format';
import prisma from '@/lib/db';
import { formatRelativeTime } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  FileText,
  Plus,
  Shield,
  Sparkles,
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
  /** سن حساب به روز — برای تشخیص «کاربر جدید» و نمایش welcome banner */
  accountAgeDays?: number;
  role: string;
}

// ─── data fetch ────────────────────────────────────────────────────────────

async function getUserOverview(userId: string) {
  const [requestsCount, pendingRequests, unreadNotifications, recentRequests, recentNotifications] =
    await Promise.all([
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
          select: {
            id: true,
            message: true,
            isRead: true,
            createdAt: true,
          },
        })
        .catch(() => []),
    ]);

  return {
    requestsCount,
    pendingRequests,
    unreadNotifications,
    recentRequests,
    recentNotifications,
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
  OTHER: 'سایر',
};

// ─── component ─────────────────────────────────────────────────────────────

export async function UserHome({
  userId,
  userName,
  userEmail,
  emailVerified,
  accountAgeDays = 999,
}: UserHomeProps) {
  const overview = await getUserOverview(userId);
  // اگر کاربر کمتر از ۷ روز از ساخت حسابش گذشته و هنوز ایمیل تأیید نشده
  // یا درخواستی ندارد، welcome banner نمایش داده می‌شود.
  const showWelcome = accountAgeDays < 7 && (overview.requestsCount === 0 || !emailVerified);

  return (
    <div className={styles.root} dir="rtl">
      {/* R17-fix (2026-07-29): وقتی session تغییر کند و emailVerified →
          true شود، router.refresh() خودکار فراخوانی می‌شود. */}
      <EmailVerificationWatcher initialVerified={emailVerified} />
      {/* ─── Header strip ──────────────────────────────────────────────── */}
      <section className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={styles.greeting}>سلام،</span>
          <h1 className={styles.name}>{userName || 'کاربر گرامی'}</h1>
          <p className={styles.subtitle}>
            <span>{userEmail}</span>
            {!emailVerified ? (
              <Badge variant="destructive" className={styles.badge}>
                ایمیل تأیید نشده
              </Badge>
            ) : (
              <Badge variant="secondary" className={styles.badge}>
                ایمیل تأیید شده
              </Badge>
            )}
          </p>
        </div>
        <div className={styles.headerAction}>
          <Link href="/dashboard/my-requests" className={styles.primaryCta}>
            <Plus aria-hidden />
            <span>ثبت درخواست جدید</span>
          </Link>
        </div>
      </section>

      {/* ─── Welcome banner (کاربر جدید، کمتر از ۷ روز) ────────────── */}
      {showWelcome ? (
        <section className={styles.welcome} aria-label="خوش‌آمدگویی">
          <div className={styles.welcomeIcon}>
            <Sparkles aria-hidden />
          </div>
          <div className={styles.welcomeText}>
            <h2 className={styles.welcomeTitle}>به {userName || 'پلتفرم'} خوش آمدید</h2>
            <p className={styles.welcomeDesc}>
              برای شروع، سه گام ساده را طی کنید: تأیید ایمیل، احراز هویت و ثبت اولین درخواست.
            </p>
          </div>
          <div className={styles.welcomeSteps}>
            {!emailVerified ? (
              <Link href="/dashboard/edit-profile" className={styles.welcomeStep}>
                <span className={styles.welcomeStepIndex}>۱</span>
                <span>تأیید ایمیل</span>
              </Link>
            ) : null}
            <Link href="/dashboard/kyc" className={styles.welcomeStep}>
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

      {/* ─── KYC banner (encourage verification) ──────────────────────── */}
      <section className={styles.kycBanner}>
        <div className={styles.kycIcon}>
          <Shield aria-hidden />
        </div>
        <div className={styles.kycText}>
          <h2 className={styles.kycTitle}>احراز هویت، کلید خدمات مالی</h2>
          <p className={styles.kycDesc}>
            برای استفاده از خدمات کامل، لطفاً احراز هویت را تکمیل کنید. این فرایند فقط چند دقیقه طول
            می‌کشد.
          </p>
        </div>
        <Link href="/dashboard/kyc" className={styles.kycCta}>
          <span>شروع احراز هویت</span>
          <ArrowLeft aria-hidden />
        </Link>
      </section>

      {/* ─── Stats grid ────────────────────────────────────────────────── */}
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

      {/* ─── Quick actions ────────────────────────────────────────────── */}
      <section className={styles.quickActions} aria-label="اقدامات سریع">
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>اقدامات سریع</h2>
          <span className={styles.sectionMeta}>۴ میان‌بر</span>
        </header>
        <div className={styles.actionsGrid}>
          <Link href="/dashboard/my-requests" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <Plus aria-hidden />
            </span>
            <span className={styles.actionLabel}>درخواست جدید</span>
          </Link>
          <Link href="/dashboard/transfer" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <ArrowRight aria-hidden />
            </span>
            <span className={styles.actionLabel}>انتقال وجه</span>
          </Link>
          <Link href="/dashboard/wallet" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <Wallet aria-hidden />
            </span>
            <span className={styles.actionLabel}>کیف پول</span>
          </Link>
          <Link href="/dashboard/kyc" className={styles.actionCard}>
            <span className={styles.actionIcon}>
              <Shield aria-hidden />
            </span>
            <span className={styles.actionLabel}>احراز هویت</span>
          </Link>
        </div>
      </section>

      {/* ─── Recent requests ─────────────────────────────────────────── */}
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
            description="با اولین درخواست، سفر مالی خود را شروع کنید."
            action={
              <Link href="/dashboard/my-requests" className={styles.emptyCta}>
                <Plus aria-hidden />
                <span>ثبت اولین درخواست</span>
              </Link>
            }
          />
        ) : (
          <ul className={styles.requestsList}>
            {overview.recentRequests.map((r: (typeof overview.recentRequests)[number]) => (
              <li key={r.id} className={styles.requestItem}>
                <Link href={`/dashboard/my-requests/${r.id}`} className={styles.requestLink}>
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

      {/* ─── Activity feed (اعلان‌های اخیر) ──────────────────────────── */}
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
            {overview.recentNotifications.map(
              (n: (typeof overview.recentNotifications)[number]) => (
                <li
                  key={n.id}
                  className={`${styles.activityItem} ${!n.isRead ? styles.activityItemUnread : ''}`}
                >
                  <span className={styles.activityDot} aria-hidden />
                  <span className={styles.activityMessage}>{n.message}</span>
                  <span className={styles.activityTime}>{formatRelativeTime(n.createdAt)}</span>
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
