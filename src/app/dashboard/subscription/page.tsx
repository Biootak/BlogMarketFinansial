import getCurrentUser from '@/lib/current-user';
import db from '@/lib/db';
import { persianMonths, toPersianDate } from '@/lib/persian-date';
import { getUserSubscription } from '@/actions/subscription';
import {
  ActivitySquare,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Monitor,
  ShieldCheck,
  TriangleAlert,
  User,
} from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import s from './subscription.module.css';
import BillingHistory from './_components/BillingHistory';
import PlanPicker from './_components/PlanPicker';

export const metadata: Metadata = {
  title: 'حساب کاربری | داشبورد',
};

const ROLE_CONFIG: Record<
  string,
  { label: string; variant: 'gold' | 'brand' | 'info' | 'muted'; desc: string }
> = {
  USER:       { label: 'کاربر عادی',   variant: 'muted',  desc: 'دسترسی پایه به پلتفرم'   },
  AUTHOR:     { label: 'نویسنده',      variant: 'brand',  desc: 'انتشار و مدیریت محتوا'   },
  SUPPORT:    { label: 'پشتیبانی',     variant: 'info',   desc: 'مدیریت درخواست‌های کاربران' },
  ADMIN:      { label: 'مدیر',         variant: 'info',   desc: 'مدیریت کامل پلتفرم'      },
  OWNER:      { label: 'مالک',         variant: 'gold',   desc: 'دسترسی سوپراَدمین'       },
  SUPERADMIN: { label: 'سوپراَدمین',   variant: 'gold',   desc: 'دسترسی سوپراَدمین'       },
};

const ACTION_FA: Record<string, string> = {
  PERMISSION_MATRIX_UPDATED: 'به‌روزرسانی ماتریس مجوزها',
  USER_ROLE_CHANGED:         'تغییر نقش کاربر',
  POST_PUBLISHED:            'انتشار مطلب',
  POST_DELETED:              'حذف مطلب',
  KYC_APPROVED:              'تأیید هویت',
  EXCHANGE_APPROVED:         'تأیید صرافی',
  LOGIN:                     'ورود به سیستم',
  PROFILE_UPDATED:           'به‌روزرسانی پروفایل',
};

function persianDate(d: Date) {
  const { year, month, day } = toPersianDate(d);
  return `${day} ${persianMonths[month - 1]} ${year}`;
}
function persianDateTime(d: Date) {
  const base = persianDate(d);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${base}، ${h}:${m}`;
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user?.id) redirect('/auth?callbackUrl=/dashboard/subscription');

  const [published, drafts, dbUser, devices, logs, subRes] = await Promise.all([
    db.post.count({ where: { authorId: user.id, status: 'PUBLISHED' } }),
    db.post.count({ where: { authorId: user.id, status: 'DRAFT' } }),
    db.user.findUnique({
      where: { id: user.id },
      select: { createdAt: true, twoFactorEnabled: true, emailVerified: true },
    }),
    db.device.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: 'desc' },
      take: 3,
      select: { id: true, userAgent: true, ip: true, lastSeenAt: true, status: true },
    }),
    db.auditLog.findMany({
      where: { actorId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, createdAt: true, entityType: true },
    }),
    getUserSubscription(),
  ]);

  const subscription = subRes.success ? subRes.data : null;

  const roleCfg = ROLE_CONFIG[user.role ?? 'USER'] ?? ROLE_CONFIG.USER!;
  const joinedAt  = dbUser?.createdAt ? persianDate(dbUser.createdAt) : '—';
  const total     = published + drafts;
  const ratio     = total > 0 ? Math.round((published / total) * 100) : 0;

  /* امتیاز امنیت: 3 عامل × وزن */
  const secScore =
    (dbUser?.emailVerified   ? 40 : 0) +
    (dbUser?.twoFactorEnabled ? 40 : 0) +
    20; /* ثبت‌نام = ۲۰ */

  const secColor =
    secScore >= 80 ? 'var(--nova-emerald)' :
    secScore >= 50 ? 'var(--nova-amber)'   : 'var(--nova-rose)';

  /* محیط دایره SVG: 2π×16 ≈ 100.5 */
  const arcLen = (secScore / 100) * 100.5;

  return (
    <div className={s.root} dir="rtl">

      {/* ═══════════════════════════════════════════════════════════════
          HERO — identity strip
          ═══════════════════════════════════════════════════════════════ */}
      <section className={s.hero} aria-label="هویت کاربر">

        {/* Ambient kinetic SVG — system-breath at 0.5Hz */}
        <svg className={s.heroBg} aria-hidden viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice">
          <circle cx="360" cy="20"  r="80" className={s.bgBlob1} />
          <circle cx="40"  cy="100" r="60" className={s.bgBlob2} />
          {/* hairline arcs — ambient light */}
          <path d="M 360 -30 A 120 120 0 0 1 480 90" className={s.bgArc} strokeWidth="0.6" fill="none" />
          <path d="M -20 60  A 100 100 0 0 1 80 160"  className={s.bgArc} strokeWidth="0.6" fill="none" />
        </svg>

        <div className={s.heroInner}>
          {/* avatar */}
          <div className={s.avatarWrap} aria-hidden>
            <div className={s.avatar}>{(user.name ?? 'U').charAt(0).toUpperCase()}</div>
            {/* pulse ring */}
            <span className={s.avatarRing} aria-hidden />
          </div>

          {/* identity */}
          <div className={s.identity}>
            <div className={s.nameRow}>
              <h1 className={s.name}>{user.name ?? '—'}</h1>
              <span className={`${s.rolePill} ${s[`rolePill_${roleCfg.variant}`]}`}>
                {roleCfg.label}
              </span>
            </div>
            <p className={s.email} dir="ltr">{user.email}</p>
            <div className={s.metaRow}>
              <span className={s.metaItem}>
                <CalendarDays size={12} aria-hidden />
                عضویت از {joinedAt}
              </span>
              <span className={s.metaSep} aria-hidden />
              <span className={s.metaItem}>
                <ActivitySquare size={12} aria-hidden />
                {roleCfg.desc}
              </span>
            </div>
          </div>

          {/* security ring — SVG arc gauge */}
          <div className={s.secGauge} aria-label={`امتیاز امنیت ${secScore} از ۱۰۰`}>
            <svg viewBox="0 0 36 36" className={s.secSvg} aria-hidden>
              <circle cx="18" cy="18" r="16" fill="none" strokeWidth="2"
                className={s.secTrack} />
              <circle cx="18" cy="18" r="16" fill="none" strokeWidth="2"
                className={s.secArc}
                style={{ stroke: secColor, strokeDasharray: `${arcLen} 100.5`, strokeDashoffset: '25' }}
                strokeLinecap="round"
              />
            </svg>
            <span className={s.secNum}>{secScore}</span>
            <span className={s.secLabel}>امنیت</span>
          </div>
        </div>

        {/* publish-ratio progress bar */}
        <div className={s.progressBar} role="progressbar"
          aria-valuenow={ratio} aria-valuemin={0} aria-valuemax={100}
          aria-label={`${published} پست منتشر از ${total}`}>
          <div className={s.progressFill}
            style={{ '--prog': `${ratio}%` } as React.CSSProperties} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          KPI ROW
          ═══════════════════════════════════════════════════════════════ */}
      <div className={s.kpiRow} role="list" aria-label="آمار کلی">
        {[
          { icon: <FileText     size={16} />, value: new Intl.NumberFormat('fa-IR').format(published), label: 'منتشر شده',    color: 'brand'  },
          { icon: <FileText     size={16} />, value: new Intl.NumberFormat('fa-IR').format(drafts),    label: 'پیش‌نویس',     color: 'amber'  },
          { icon: <ShieldCheck  size={16} />, value: dbUser?.emailVerified ? 'تأیید ✓' : 'تأیید نشده',   label: 'ایمیل',       color: 'emerald'},
          { icon: <User         size={16} />, value: roleCfg.label,                                    label: 'سطح دسترسی',   color: 'violet' },
        ].map(({ icon, value, label, color }) => (
          <div key={label} className={s.kpiCard} role="listitem"
            style={{ '--kpi-c': `var(--nova-${color === 'brand' ? 'primary' : color})` } as React.CSSProperties}>
            <span className={s.kpiIconWrap} aria-hidden>{icon}</span>
            <span className={s.kpiVal}>{value}</span>
            <span className={s.kpiLbl}>{label}</span>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TWO-COL: Security + Details
          ═══════════════════════════════════════════════════════════════ */}
      <div className={s.twoUp}>

        {/* ─── Security checklist ─── */}
        <section className={s.panel} aria-labelledby="sec-heading">
          <header className={s.panelHead}>
            <ShieldCheck size={15} aria-hidden />
            <h2 id="sec-heading" className={s.panelTitle}>امنیت حساب</h2>
          </header>

          <ul className={s.checkList} aria-label="وضعیت امنیت">
            {[
              {
                ok: !!dbUser?.emailVerified,
                label: 'تأیید ایمیل',
                desc: dbUser?.emailVerified
                  ? `تأیید در ${persianDate(dbUser.emailVerified)}`
                  : 'ایمیل تأیید نشده — لطفاً ایمیل را تأیید کنید',
              },
              {
                ok: !!dbUser?.twoFactorEnabled,
                label: 'احراز هویت دو مرحله‌ای',
                desc: dbUser?.twoFactorEnabled
                  ? 'فعال — حساب محافظت شده است'
                  : 'غیرفعال — برای امنیت بیشتر فعال کنید',
              },
              {
                ok: true,
                label: 'رمز عبور',
                desc: 'رمز عبور تنظیم شده است',
              },
            ].map(({ ok, label, desc }) => (
              <li key={label} className={`${s.checkItem} ${ok ? s.checkOk : s.checkWarn}`}>
                <span className={s.checkDot} aria-hidden>
                  {ok
                    ? <CheckCircle2 size={15} />
                    : <TriangleAlert size={15} />}
                </span>
                <span className={s.checkBody}>
                  <span className={s.checkLabel}>{label}</span>
                  <span className={s.checkDesc}>{desc}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* score bar */}
          <div className={s.scoreBar}>
            <span className={s.scoreBarLabel}>امتیاز کلی</span>
            <span className={s.scoreBarVal}
              style={{ color: secColor }}>{secScore}/۱۰۰</span>
            <div className={s.scoreTrack}>
              <div className={s.scoreFill}
                style={{ '--sec-w': `${secScore}%`, '--sec-c': secColor } as React.CSSProperties} />
            </div>
          </div>
        </section>

        {/* ─── Account details ─── */}
        <section className={s.panel} aria-labelledby="detail-heading">
          <header className={s.panelHead}>
            <User size={15} aria-hidden />
            <h2 id="detail-heading" className={s.panelTitle}>اطلاعات حساب</h2>
          </header>
          <dl className={s.detailGrid}>
            {[
              { term: 'نام کاربری',     def: user.name ?? '—'        },
              { term: 'ایمیل',          def: user.email ?? '—', ltr: true },
              { term: 'نقش',            def: `${roleCfg.label} — ${roleCfg.desc}` },
              { term: 'وضعیت',          def: 'فعال'                  },
              { term: 'پست منتشر شده',  def: `${new Intl.NumberFormat('fa-IR').format(published)} پست` },
              { term: 'پیش‌نویس',       def: `${new Intl.NumberFormat('fa-IR').format(drafts)} پست`    },
              { term: 'تاریخ عضویت',    def: joinedAt               },
            ].map(({ term, def, ltr }) => (
              <div key={term} className={s.detailRow}>
                <dt className={s.detailTerm}>{term}</dt>
                <dd className={s.detailDef} dir={ltr ? 'ltr' : undefined}>{def}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PLAN PICKER (NEW — 3 tiers + billing)
          ═══════════════════════════════════════════════════════════════ */}
      <PlanPicker
        currentPlan={subscription?.currentPlan ?? 'free'}
        planExpiresAt={subscription?.planExpiresAt ?? null}
      />

      {/* ═══════════════════════════════════════════════════════════════
          BILLING HISTORY (NEW)
          ═══════════════════════════════════════════════════════════════ */}
      <BillingHistory events={subscription?.events ?? []} />

      {/* ═══════════════════════════════════════════════════════════════
          DEVICES (conditional — real data only)
          ═══════════════════════════════════════════════════════════════ */}
      {devices.length > 0 && (
        <section className={s.panel} aria-labelledby="dev-heading">
          <header className={s.panelHead}>
            <Monitor size={15} aria-hidden />
            <h2 id="dev-heading" className={s.panelTitle}>آخرین دستگاه‌های متصل</h2>
            <a href="/dashboard/devices" className={s.panelLink}>مشاهده همه</a>
          </header>
          <ul className={s.deviceList} aria-label="دستگاه‌ها">
            {devices.map((dev, i) => (
              <li key={dev.id} className={s.deviceItem}
                style={{ '--i': i } as React.CSSProperties}>
                <span className={s.deviceIcon} aria-hidden>
                  <Monitor size={14} />
                </span>
                <span className={s.deviceBody}>
                  <span className={s.deviceName}>
                    {dev.userAgent?.split(' ')[0] ?? 'دستگاه ناشناس'}
                  </span>
                  <span className={s.deviceIp} dir="ltr">{dev.ip ?? '—'}</span>
                </span>
                <time className={s.deviceTime} dateTime={dev.lastSeenAt.toISOString()}>
                  <Clock3 size={11} aria-hidden />
                  {persianDateTime(dev.lastSeenAt)}
                </time>
                <span className={`${s.deviceBadge} ${dev.status === 'TRUSTED' ? s.deviceOk : s.deviceWarn}`}>
                  {dev.status === 'TRUSTED' ? 'معتمد' : 'نامعتمد'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ACTIVITY TIMELINE (conditional — real data only)
          ═══════════════════════════════════════════════════════════════ */}
      {logs.length > 0 && (
        <section className={s.panel} aria-labelledby="log-heading">
          <header className={s.panelHead}>
            <Clock3 size={15} aria-hidden />
            <h2 id="log-heading" className={s.panelTitle}>آخرین فعالیت‌ها</h2>
            <a href="/dashboard/audit-log" className={s.panelLink}>مشاهده همه</a>
          </header>
          <ol className={s.timeline} aria-label="تاریخچه فعالیت">
            {logs.map((log, i) => (
              <li key={log.id} className={s.tlItem}
                style={{ '--i': i } as React.CSSProperties}>
                <span className={s.tlDot} aria-hidden />
                <span className={s.tlContent}>
                  <span className={s.tlAction}>{ACTION_FA[log.action] ?? log.action}</span>
                  {log.entityType && (
                    <span className={s.tlEntity}>{log.entityType}</span>
                  )}
                  <time className={s.tlTime} dateTime={log.createdAt.toISOString()}>
                    {persianDateTime(log.createdAt)}
                  </time>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

    </div>
  );
}
