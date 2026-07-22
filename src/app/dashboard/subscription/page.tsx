import { PageHeader } from '@/components/Dashboard/primitives';
import getCurrentUser from '@/lib/current-user';
import db from '@/lib/db';
import { persianMonths, toPersianDate } from '@/lib/persian-date';
import { redirect } from 'next/navigation';
import {
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineUserCircle,
} from 'react-icons/hi2';
import s from './subscription.module.css';

const ROLE_CONFIG: Record<string, { label: string; color: string; level: number }> = {
  USER: { label: 'کاربر عادی', color: 'muted', level: 1 },
  AUTHOR: { label: 'نویسنده', color: 'accent', level: 2 },
  SUPPORT: { label: 'پشتیبانی', color: 'info', level: 2 },
  ADMIN: { label: 'مدیر', color: 'info', level: 3 },
  OWNER: { label: 'مالک', color: 'gold', level: 4 },
  // SUPERADMIN is an alias for OWNER (level=4, not 5) — treated identically across the platform
  SUPERADMIN: { label: 'سوپرادمین', color: 'gold', level: 4 },
};

export default async function DashboardSubscription() {
  const user = await getCurrentUser();
  if (!user?.id) redirect('/auth/login');

  const [publishedCount, draftCount, dbUser] = await Promise.all([
    db.post.count({ where: { authorId: user.id, status: 'PUBLISHED' } }),
    db.post.count({ where: { authorId: user.id, status: 'DRAFT' } }),
    db.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
  ]);

  const roleCfg = ROLE_CONFIG[user.role ?? 'USER'] ?? ROLE_CONFIG.USER;

  const joinedAt = dbUser?.createdAt
    ? (() => {
        const { year, month, day } = toPersianDate(dbUser.createdAt);
        return `${day} ${persianMonths[month - 1]} ${year}`;
      })()
    : '—';

  const totalActivity = publishedCount + draftCount;

  return (
    <div className={s.page} dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'حساب کاربری' }]}
        eyebrow="پروفایل"
        title="حساب کاربری"
        description="وضعیت حساب، آمار فعالیت و اطلاعات اشتراک"
        actions={
          <span className={`${s.activeBadge}`}>
            <HiOutlineCheckCircle className="size-3.5" />
            حساب فعال
          </span>
        }
      />

      {/* ── Profile Hero ── */}
      <div className={s.profileHero}>
        <div className={s.profileAvatarWrap}>
          <div className={s.profileAvatar} aria-hidden>
            {(user.name ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div className={s.profileAvatarGlow} aria-hidden />
        </div>
        <div className={s.profileInfo}>
          <h2 className={s.profileName}>{user.name ?? '—'}</h2>
          <p className={s.profileEmail} dir="ltr">
            {user.email}
          </p>
          <span className={`${s.roleBadge} ${s[`roleBadge_${roleCfg.color}`]}`}>
            <HiOutlineSparkles className="size-3" />
            {roleCfg.label}
          </span>
        </div>
        <div className={s.profileActivityBar}>
          <div
            className={s.activityFill}
            style={
              {
                '--activity-pct': `${Math.min(100, (publishedCount / Math.max(totalActivity, 1)) * 100)}%`,
              } as React.CSSProperties
            }
            aria-label={`${publishedCount} پست منتشر از ${totalActivity} کل`}
          />
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className={s.kpiStrip}>
        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color="accent">
            <HiOutlineDocumentText className="size-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiValue} aria-label={`${publishedCount} پست منتشر شده`}>
              {new Intl.NumberFormat('fa-IR').format(publishedCount)}
            </span>
            <span className={s.kpiLabel}>پست منتشر شده</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color="amber">
            <HiOutlineDocumentText className="size-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiValue}>{new Intl.NumberFormat('fa-IR').format(draftCount)}</span>
            <span className={s.kpiLabel}>پیش‌نویس</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color="info">
            <HiOutlineCalendarDays className="size-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiValue} style={{ fontSize: '0.9375rem' }}>
              {joinedAt}
            </span>
            <span className={s.kpiLabel}>تاریخ عضویت</span>
          </div>
        </div>

        <div className={s.kpiCard}>
          <div className={s.kpiIcon} data-color="violet">
            <HiOutlineUserCircle className="size-4" />
          </div>
          <div className={s.kpiBody}>
            <span className={s.kpiValue} style={{ fontSize: '0.9375rem' }}>
              {roleCfg.label}
            </span>
            <span className={s.kpiLabel}>سطح دسترسی</span>
          </div>
        </div>
      </div>

      {/* ── Plan Section ── */}
      <div className={s.planSection}>
        <div className={s.planHeader}>
          <span className={s.planEyebrow}>اشتراک فعلی</span>
          <h3 className={s.planTitle}>پلن رایگان</h3>
          <p className={s.planDesc}>
            با ارتقاء به پلن حرفه‌ای به آمارهای پیشرفته، اولویت بررسی محتوا و قابلیت‌های بیشتر دسترسی
            داشته باشید.
          </p>
        </div>

        <div className={s.planFeatures}>
          {[
            { label: 'انتشار نامحدود پست', included: true },
            { label: 'آپلود تصویر و رسانه', included: true },
            { label: 'آمار پایه بازدید', included: true },
            { label: 'آمار پیشرفته و SEO', included: false },
            { label: 'Newsletter خودکار', included: false },
            { label: 'پشتیبانی اولویت‌دار', included: false },
          ].map(({ label, included }) => (
            <div
              key={label}
              className={`${s.planFeatureRow} ${included ? s.planFeatureIncluded : s.planFeatureExcluded}`}
            >
              <div className={s.planFeatureDot} aria-hidden />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <button type="button" className={s.upgradeBtn} disabled>
          <HiOutlineSparkles className="size-4" />
          ارتقاء به پرو
          <span className={s.upgradeSoon}>به‌زودی</span>
        </button>
      </div>

      {/* ── Details Section ── */}
      <div className={s.detailSection}>
        <h3 className={s.detailTitle}>
          <HiOutlineUserCircle className="size-4" />
          اطلاعات حساب
        </h3>
        <dl className={s.detailGrid}>
          {[
            { term: 'نام کاربری', def: user.name ?? '—' },
            { term: 'ایمیل', def: user.email ?? '—', ltr: true },
            { term: 'نقش کاربری', def: roleCfg.label },
            { term: 'وضعیت حساب', def: 'فعال' },
            {
              term: 'پست‌های منتشر شده',
              def: `${new Intl.NumberFormat('fa-IR').format(publishedCount)} پست`,
            },
            { term: 'پیش‌نویس‌ها', def: `${new Intl.NumberFormat('fa-IR').format(draftCount)} پست` },
            { term: 'تاریخ عضویت', def: joinedAt },
          ].map(({ term, def, ltr }) => (
            <div key={term} className={s.detailRow}>
              <dt className={s.detailTerm}>{term}</dt>
              <dd className={s.detailDef} dir={ltr ? 'ltr' : undefined}>
                {def}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
