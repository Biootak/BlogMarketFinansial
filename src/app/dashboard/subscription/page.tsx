import { PageHeader } from '@/components/Dashboard/primitives';
import getCurrentUser from '@/lib/current-user';
import db from '@/lib/db';
import { persianMonths, toPersianDate } from '@/lib/persian-date';
import { redirect } from 'next/navigation';
import {
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineUserCircle,
} from 'react-icons/hi2';

const ROLE_LABEL: Record<string, string> = {
  USER: 'کاربر عادی',
  AUTHOR: 'نویسنده',
  ADMIN: 'مدیر',
  OWNER: 'مالک',
  SUPERADMIN: 'سوپرادمین',
};

export default async function DashboardSubscription() {
  const user = await getCurrentUser();
  if (!user?.id) redirect('/auth/login');

  const [publishedCount, draftCount, dbUser] = await Promise.all([
    db.post.count({ where: { authorId: user.id, status: 'PUBLISHED' } }),
    db.post.count({ where: { authorId: user.id, status: 'DRAFT' } }),
    db.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
  ]);

  const roleLabel = ROLE_LABEL[user.role ?? 'USER'] ?? 'کاربر';
  const joinedAt = dbUser?.createdAt
    ? (() => {
        const { year, month, day } = toPersianDate(dbUser.createdAt);
        return `${day} ${persianMonths[month - 1]} ${year}`;
      })()
    : '—';

  return (
    <div className="at-page" dir="rtl">
      <PageHeader
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'اشتراک' }]}
        eyebrow="حساب کاربری"
        title="اشتراک و پلن"
        description="وضعیت حساب کاربری و آمار تولید محتوا"
        actions={
          <span className="at-badge at-badge--published">
            <HiOutlineCheckCircle className="size-3.5" />
            حساب فعال
          </span>
        }
      />

      {/* KPI strip */}
      <div className="at-stats">
        <div className="at-stat">
          <div className="at-stat__ico">
            <HiOutlineSparkles className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">{roleLabel}</div>
            <div className="at-stat__label">نقش کاربری</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--blue">
            <HiOutlineDocumentText className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value" style={{ fontSize: '15px' }}>
              {new Intl.NumberFormat('fa-IR').format(publishedCount)}
            </div>
            <div className="at-stat__label">پست منتشر‌شده</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--amber">
            <HiOutlineCreditCard className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value">
              {new Intl.NumberFormat('fa-IR').format(draftCount)}
            </div>
            <div className="at-stat__label">پیش‌نویس</div>
          </div>
        </div>
        <div className="at-stat">
          <div className="at-stat__ico at-stat__ico--blue">
            <HiOutlineCalendarDays className="size-4" />
          </div>
          <div className="at-stat__main">
            <div className="at-stat__value" style={{ fontSize: '15px' }}>
              {joinedAt}
            </div>
            <div className="at-stat__label">تاریخ عضویت</div>
          </div>
        </div>
      </div>

      {/* Details section */}
      <div className="at-form-section">
        <div className="at-form-section__head">
          <div className="at-form-section__title">
            <span className="at-form-section__ico">
              <HiOutlineUserCircle className="size-4" />
            </span>
            <div>
              <div className="at-form-section__title-text">اطلاعات حساب</div>
              <div className="at-form-section__sub">جزئیات کاربری و آمار فعالیت شما</div>
            </div>
          </div>
          <span className="at-badge at-badge--published">فعال</span>
        </div>

        <div className="at-form-section__body">
          <dl className="grid gap-0 divide-y divide-[color:var(--at-line)]">
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">نام کاربری</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)]">
                {user.name ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">ایمیل</dt>
              <dd className="text-sm text-[color:var(--at-fg-muted)] font-mono" dir="ltr">
                {user.email ?? '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">نقش کاربری</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)]">{roleLabel}</dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">پست‌های منتشرشده</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(publishedCount)} پست
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">پیش‌نویس‌ها</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(draftCount)} پست
              </dd>
            </div>
            <div className="flex items-center justify-between py-3.5 gap-4">
              <dt className="text-sm text-[color:var(--at-fg-muted)]">تاریخ عضویت</dt>
              <dd className="text-sm font-semibold text-[color:var(--at-fg)]">{joinedAt}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
