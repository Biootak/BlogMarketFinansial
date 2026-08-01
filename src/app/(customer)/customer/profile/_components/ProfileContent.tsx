'use client';

/**
 * ProfileContent — «شناسنامه دیجیتال» مشتری (2026)
 * ----------------------------------------------------------------------------
 *  ساختار بصری جدید — بازطراحی کامل (نه فقط stripping):
 *
 *    1. Identity Hero          : avatar بزرگ ۹۶px + ambient gradient + نام + ID
 *                                + status pill + CTA ویرایش
 *    2. Stats Strip            : ۴ StatCard asymmetric (سطح KYC / وضعیت / ریسک / سقف)
 *    3. Profile Completion     : progress bar + missing items pills
 *    4. Personal Info          : 2-column grid (نام، نام پدر، کد ملی، پاسپورت،
 *                                تلفن، ایمیل، شهر، آدرس) + masking برای sensitive
 *    5. Verification Band      : ۳-step KYC progress با checkpoint
 *    6. Exchange Affiliation   : card لوگو + نام صرافی + شهر + تلفن
 *    7. Quick Actions          : ۴ کارت لینک (ویرایش / KYC / حساب‌ها / خروج)
 *
 *  - فقط توکن‌های --ds-* و --nova-* (no hex/rgb)
 *  - RTL-first · logical properties · TypeScript strict
 *  - حس «Apple ID Profile + Linear Settings» — نه کپی fintech app
 *  - a11y: ARIA labels، keyboard nav، color+icon+text برای status
 *  - masking برای nationalId/phone (toggleable)
 */

import type { CustomerProfile } from '@/actions/customer-portal';
import {
  CUSTOMER_STATUS_CSSKEY,
  KYC_LEVEL_LABEL,
  KYC_STATUS_CSSKEY,
  STATUS_LABEL,
  faAmount,
  faDate,
  faNum,
} from '@/app/(customer)/customer/_lib/customer-formatters';
import {
  KycStatusIcon,
  LiveDot,
  SectionHeader,
  StatusPill,
} from '@/app/(customer)/customer/_lib/customer-ui';
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  IdCard,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ViewLink } from '@/components/ui/ViewLink';
import ProfileEditForm from './ProfileEditForm';
import s from './ProfileContent.module.css';

interface Props {
  profile: CustomerProfile;
  /** M3/M4-fix: فیلدی که باید فرم ویرایش برای آن باز شود (?field=email و ...) */
  initialEditField?: string;
}

const MASKED = '••••••••';

// ─── KYC Steps Configuration ─────────────────────────────────────────────── //

const KYC_STEPS: Array<{
  level: 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
  title: string;
  desc: string;
  icon: LucideIcon;
  reached: boolean;
}> = [
  {
    level: 'LEVEL_1',
    title: 'مدرک هویتی',
    desc: 'تذکره، کارت ملی یا پاسپورت',
    icon: IdCard,
    reached: false,
  },
  {
    level: 'LEVEL_2',
    title: 'تأیید چهره',
    desc: 'سلفی با مدرک',
    icon: ShieldCheck,
    reached: false,
  },
  {
    level: 'LEVEL_3',
    title: 'تأیید کامل',
    desc: 'آدرس + درآمد',
    icon: Shield,
    reached: false,
  },
];

export default function ProfileContent({ profile, initialEditField }: Props) {
  // ── Derived state ──────────────────────────────────────────
  const kycKey = KYC_STATUS_CSSKEY[profile.kycStatus] ?? 'warning';
  const statusKey = CUSTOMER_STATUS_CSSKEY[profile.status] ?? 'neutral';
  const initials = profile.fullName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  // Masking برای فیلدهای حساس (nationalId, phone)
  const [showSensitive, setShowSensitive] = useState(false);

  // M3/M4-fix: فرم ویرایش باز — وقتی از settings با ?field= آمده باشیم
  const [editOpen, setEditOpen] = useState<'email' | 'city' | 'address' | null>(
    initialEditField === 'email' || initialEditField === 'city' || initialEditField === 'address'
      ? initialEditField
      : null,
  );

  // Profile completion % — بر اساس فیلدهای اختیاری پرشده
  const completion = useMemo(() => {
    const fields: Array<{ key: string; label: string; href: string; filled: boolean }> = [
      { key: 'email', label: 'ایمیل', href: '/customer/settings', filled: Boolean(profile.email) },
      { key: 'fatherName', label: 'نام پدر', href: '/customer/settings', filled: Boolean(profile.fatherName) },
      { key: 'nationalId', label: 'شناسه هویتی', href: '/customer/settings', filled: Boolean(profile.nationalId) },
      { key: 'city', label: 'شهر', href: '/customer/settings', filled: Boolean(profile.city) },
      { key: 'address', label: 'آدرس', href: '/customer/settings', filled: Boolean(profile.address) },
    ];
    const filled = fields.filter((f) => f.filled).length;
    const total = fields.length;
    return {
      percent: Math.round((filled / total) * 100),
      missing: fields.filter((f) => !f.filled),
      filled,
      total,
    };
  }, [profile]);

  // KYC steps with reached state
  const kycSteps = useMemo(() => {
    const reachedLevels: Record<string, number> = {
      NONE: 0,
      LEVEL_1: 1,
      LEVEL_2: 2,
      LEVEL_3: 3,
    };
    const currentLevel = reachedLevels[profile.kycLevel] ?? 0;
    return KYC_STEPS.map((step, i) => ({
      ...step,
      reached: i < currentLevel,
      current: i === currentLevel,
    }));
  }, [profile.kycLevel]);

  const riskTone =
    profile.riskScore > 70 ? 'danger' : profile.riskScore > 40 ? 'warning' : 'success';

  return (
    <div className={s.root} dir="rtl">
      {/* ═══ 1. IDENTITY HERO ════════════════════════════════════════════ */}
      <section className={s.hero} aria-label="مشخصات هویتی">
        <div className={s.heroBg} aria-hidden>
          <div className={s.heroGlow1} />
          <div className={s.heroGlow2} />
          <div className={s.heroGrid} />
        </div>

        <div className={s.heroContent}>
          <div className={s.heroAvatar} aria-hidden>
            <span className={s.heroAvatarInner}>{initials || '؟'}</span>
            <span className={s.heroAvatarRing} />
            <span className={s.heroAvatarOrbit} />
          </div>

          <div className={s.heroMain}>
            <div className={s.heroStatusRow}>
              <StatusPill variant={statusKey}>
                {STATUS_LABEL[profile.status] ?? profile.status}
              </StatusPill>
              <span className={s.heroDot} aria-hidden>
                <LiveDot size={4} tone="brand" />
                <span>عضو از {faDate(profile.createdAt)}</span>
              </span>
            </div>

            <h1 className={s.heroName}>{profile.fullName}</h1>

            <div className={s.heroIdRow}>
              <span className={s.heroIdChip}>
                <Fingerprint size={12} strokeWidth={1.9} aria-hidden />
                <span className={s.heroIdLabel}>شناسه</span>
                <strong dir="ltr">{profile.id.slice(0, 8)}</strong>
              </span>
              {profile.phone && (
                <span className={s.heroIdChip} dir="ltr">
                  <Phone size={12} strokeWidth={1.9} aria-hidden />
                  <strong>{profile.phone}</strong>
                </span>
              )}
              {profile.email && (
                <span className={s.heroIdChip}>
                  <Mail size={12} strokeWidth={1.9} aria-hidden />
                  <span>{profile.email}</span>
                </span>
              )}
            </div>
          </div>

          <div className={s.heroActions}>
            {/* M3-fix: «ویرایش اطلاعات» به فرم ویرایش inline (نه تنظیمات بدون فرم) */}
            <button
              type="button"
              onClick={() => setEditOpen(editOpen ? null : 'email')}
              className={s.heroEditBtn}
              aria-expanded={Boolean(editOpen)}
            >
              <Settings size={14} strokeWidth={2} aria-hidden />
              <span>{editOpen ? 'بستن ویرایش' : 'ویرایش اطلاعات'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSensitive((s) => !s)}
              className={s.heroRevealBtn}
              aria-pressed={showSensitive}
              aria-label={showSensitive ? 'پنهان کردن اطلاعات حساس' : 'نمایش اطلاعات حساس'}
            >
              {showSensitive ? (
                <EyeOff size={14} strokeWidth={2} aria-hidden />
              ) : (
                <Eye size={14} strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ 1.5 EDIT FORM ══════════════════════════════════════════════
          M3/M4-fix: قبلاً «ویرایش اطلاعات» به /customer/settings می‌رفت که فرم
          ویرایش ندارد (dead end). حالا فرم inline همین‌جا باز می‌شود و
          updateCustomerProfile (server action واقعی) را صدا می‌زند. */}
      {editOpen && (
        <ProfileEditForm
          field={editOpen}
          initialValue={
            editOpen === 'email'
              ? (profile.email ?? '')
              : editOpen === 'city'
                ? (profile.city ?? '')
                : (profile.address ?? '')
          }
          onDone={() => setEditOpen(null)}
          onSwitch={(f) => setEditOpen(f)}
        />
      )}

      {/* ═══ 2. STATS STRIP ══════════════════════════════════════════════ */}
      <section className={s.statsStrip} aria-label="آمار کلیدی">
        <div className={s.statsGrid}>
          <ProfileStat
            label="سطح احراز هویت"
            value={KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}
            icon={ShieldCheck}
            tone="emerald"
            hint={
              profile.kycStatus === 'APPROVED'
                ? 'تأیید شده'
                : STATUS_LABEL[profile.kycStatus] ?? profile.kycStatus
            }
            href="/customer/kyc"
          />
          <ProfileStat
            label="امتیاز ریسک"
            value={faNum(profile.riskScore)}
            icon={TrendingUp}
            tone={riskTone === 'danger' ? 'red' : riskTone === 'warning' ? 'amber' : 'emerald'}
            hint={riskTone === 'danger' ? 'بالا' : riskTone === 'warning' ? 'متوسط' : 'پایین'}
            href="/customer/kyc"
          />
          <ProfileStat
            label="سقف تراکنش"
            value={
              profile.personalLimitAf != null
                ? faAmount(profile.personalLimitAf, 'AFN')
                : '—'
            }
            icon={Wallet}
            tone="violet"
            hint="سقف شخصی"
            href="/customer/accounts"
          />
          <ProfileStat
            label="صرافی شما"
            value={profile.exchange.name}
            icon={Building2}
            tone="cyan"
            hint={profile.exchange.city ?? '—'}
            // M1-fix: صفحهٔ عمومی صرافی با slug است نه id — قبلاً به UUID لینک
            // می‌داد که 404 می‌شد. اگر slug نبود به فهرست صرافی‌ها برویم.
            href={profile.exchange.slug ? `/exchanges/${profile.exchange.slug}` : '/exchanges'}
          />
        </div>
      </section>

      {/* ═══ 3. PROFILE COMPLETION ═══════════════════════════════════════ */}
      {completion.missing.length > 0 && (
        <section className={s.completion} aria-label="تکمیل پروفایل">
          <div className={s.completionHeader}>
            <div className={s.completionText}>
              <span className={s.completionEyebrow}>
                <Sparkles size={12} strokeWidth={1.9} aria-hidden />
                <span>پروفایل شما</span>
              </span>
              <h2 className={s.completionTitle}>
                {faNum(completion.percent)}٪ تکمیل شده
              </h2>
              <p className={s.completionSub}>
                {faNum(completion.missing.length)} فیلد اختیاری برای ارتقای سطح اعتماد باقی مانده.
              </p>
            </div>
            <div className={s.completionRing} aria-hidden>
              <svg viewBox="0 0 100 100" className={s.completionRingSvg}>
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="var(--ds-border-subtle)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="var(--nova-up)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(completion.percent / 100) * 276.46} 276.46`}
                  transform="rotate(-90 50 50)"
                  className={s.completionRingFill}
                />
              </svg>
              <span className={s.completionRingLabel}>
                {faNum(completion.percent)}٪
              </span>
            </div>
          </div>

          <div className={s.completionBar} role="progressbar" aria-valuenow={completion.percent} aria-valuemin={0} aria-valuemax={100}>
            <span
              className={s.completionBarFill}
              style={{ inlineSize: `${completion.percent}%` }}
            />
          </div>

          <ul className={s.completionList} role="list">
            {completion.missing.map((m) => (
              <li key={m.key} className={s.completionItem}>
                <span className={s.completionItemDot} aria-hidden />
                <span className={s.completionItemLabel}>{m.label}</span>
                <Link href={m.href} className={s.completionItemLink}>
                  <span>تکمیل</span>
                  <ChevronLeft size={12} strokeWidth={2} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ═══ 4. PERSONAL INFO + 5. KYC BAND ══════════════════════════════ */}
      <div className={s.twoCol}>
        {/* ── 4. Personal Info ──────────────────────────────────── */}
        <section className={s.panel} aria-label="اطلاعات شخصی">
          <header className={s.panelHeader}>
            <SectionHeader icon={User} title="اطلاعات شخصی" sub="شناسنامه‌ای" />
            <button
              type="button"
              onClick={() => setShowSensitive((s) => !s)}
              className={s.panelToggle}
              aria-pressed={showSensitive}
            >
              {showSensitive ? (
                <>
                  <EyeOff size={12} strokeWidth={1.9} aria-hidden />
                  <span>پنهان‌سازی</span>
                </>
              ) : (
                <>
                  <Eye size={12} strokeWidth={1.9} aria-hidden />
                  <span>نمایش</span>
                </>
              )}
            </button>
          </header>

          <div className={s.infoGrid}>
            <InfoRow
              label="نام کامل"
              value={profile.fullName}
              icon={User}
            />
            {profile.fatherName && (
              <InfoRow label="نام پدر" value={profile.fatherName} icon={User} />
            )}
            <InfoRow
              label="شناسه هویتی"
              value={
                profile.nationalId
                  ? showSensitive
                    ? profile.nationalId
                    : profile.nationalId.slice(0, 4) + MASKED.slice(0, 4)
                  : '—'
              }
              icon={IdCard}
              mono
            />
            {profile.passportNo && (
              <InfoRow
                label="شماره پاسپورت"
                value={
                  showSensitive
                    ? profile.passportNo
                    : profile.passportNo.slice(0, 2) + '•'.repeat(6)
                }
                icon={Globe}
                mono
              />
            )}
            <InfoRow
              label="تلفن"
              value={
                <a href={`tel:${profile.phone}`} dir="ltr" className={s.link}>
                  {showSensitive
                    ? profile.phone
                    : profile.phone.slice(0, 4) + '•••' + profile.phone.slice(-3)}
                </a>
              }
              icon={Phone}
              mono
            />
            {profile.email && (
              <InfoRow
                label="ایمیل"
                value={
                  <a href={`mailto:${profile.email}`} className={s.link}>
                    {profile.email}
                  </a>
                }
                icon={Mail}
                mono
              />
            )}
            {profile.city && (
              <InfoRow label="شهر" value={profile.city} icon={MapPin} />
            )}
            {profile.address && (
              <InfoRow
                label="آدرس"
                value={profile.address}
                icon={MapPin}
                className={s.infoRowSpan}
              />
            )}
          </div>
        </section>

        {/* ── 5. KYC Band ────────────────────────────────────────── */}
        <section className={s.panel} aria-label="احراز هویت">
          <SectionHeader
            icon={ShieldCheck}
            title="احراز هویت"
            sub={KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}
          />

          <div className={s.kycCurrent} data-tone={kycKey}>
            <span className={s.kycCurrentIcon} aria-hidden>
              <KycStatusIcon status={profile.kycStatus} />
            </span>
            <div className={s.kycCurrentBody}>
              <span className={s.kycCurrentLabel}>وضعیت فعلی</span>
              <span className={s.kycCurrentValue}>
                {STATUS_LABEL[profile.kycStatus] ?? profile.kycStatus}
              </span>
            </div>
          </div>

          <ol className={s.kycSteps} role="list">
            {kycSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.level}
                  className={`${s.kycStep} ${step.reached ? s.kycStepDone : ''} ${
                    step.current ? s.kycStepCurrent : ''
                  }`}
                >
                  <span className={s.kycStepNum} aria-hidden>
                    {step.reached ? <CheckCircle2 size={14} strokeWidth={2.2} /> : i + 1}
                  </span>
                  <span className={s.kycStepIcon} aria-hidden>
                    <Icon size={14} strokeWidth={1.9} />
                  </span>
                  <div className={s.kycStepBody}>
                    <span className={s.kycStepTitle}>{step.title}</span>
                    <span className={s.kycStepDesc}>{step.desc}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          {profile.kycStatus !== 'APPROVED' && (
            <Link href="/customer/kyc" className={s.kycCta}>
              <ShieldCheck size={14} strokeWidth={2} aria-hidden />
              <span>ادامه فرایند احراز هویت</span>
              <ChevronLeft size={14} strokeWidth={2} aria-hidden />
            </Link>
          )}
        </section>
      </div>

      {/* ═══ 6. EXCHANGE AFFILIATION ════════════════════════════════════ */}
      <section className={s.exchangeCard} aria-label="صرافی طرف حساب">
        <div className={s.exchangeLeft}>
          <span className={s.exchangeLogo} aria-hidden>
            {profile.exchange.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.exchange.logoUrl} alt="" loading="lazy" />
            ) : (
              <Building2 size={20} strokeWidth={1.6} />
            )}
          </span>
          <div className={s.exchangeInfo}>
            <span className={s.exchangeEyebrow}>
              <Building2 size={11} strokeWidth={1.9} aria-hidden />
              <span>صرافی طرف حساب</span>
            </span>
            <h3 className={s.exchangeName}>{profile.exchange.name}</h3>
            <div className={s.exchangeMeta}>
              {profile.exchange.city && (
                <span className={s.exchangeMetaItem}>
                  <MapPin size={11} strokeWidth={1.9} aria-hidden />
                  <span>{profile.exchange.city}</span>
                </span>
              )}
              {profile.exchange.phone && (
                <span className={s.exchangeMetaItem} dir="ltr">
                  <Phone size={11} strokeWidth={1.9} aria-hidden />
                  <span>{profile.exchange.phone}</span>
                </span>
              )}
              <span className={s.exchangeMetaItem}>
                <StatusPill
                  variant={
                    profile.exchange.status === 'ACTIVE'
                      ? 'success'
                      : profile.exchange.status === 'FROZEN'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {profile.exchange.status === 'ACTIVE' ? 'فعال' : profile.exchange.status}
                </StatusPill>
              </span>
            </div>
          </div>
        </div>
        <Link
          href={profile.exchange.slug ? `/exchanges/${profile.exchange.slug}` : '/exchanges'}
          className={s.exchangeLink}
        >
          <span>مشاهده صرافی</span>
          <ChevronLeft size={14} strokeWidth={2} aria-hidden />
        </Link>
      </section>

      {/* ═══ 7. QUICK ACTIONS ════════════════════════════════════════════ */}
      <section className={s.quickActions} aria-label="اقدامات سریع">
        <ActionCard
          href="/customer/security"
          icon={ShieldCheck}
          title="مرکز امنیت"
          desc="رمز عبور، 2FA و دستگاه‌ها"
          tone="emerald"
        />
        <ActionCard
          href="/customer/settings"
          icon={Settings}
          title="تنظیمات"
          desc="ویرایش اطلاعات شخصی و امنیت"
          tone="violet"
        />
        <ActionCard
          href="/customer/kyc"
          icon={ShieldCheck}
          title="احراز هویت"
          desc={
            profile.kycStatus === 'APPROVED' ? 'تأیید شده' : 'تکمیل فرایند KYC'
          }
          tone="emerald"
        />
        <ActionCard
          href="/customer/accounts"
          icon={CreditCard}
          title="حساب‌ها"
          desc="مدیریت حساب‌های بانکی"
          tone="cyan"
        />
        <ActionCard
          href="/auth/signout"
          icon={LogOut}
          title="خروج"
          desc="پایان جلسه کاری"
          tone="red"
        />
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────── //

function InfoRow({
  label,
  value,
  icon: Icon,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={`${s.infoRow} ${className ?? ''}`}>
      <span className={s.infoLabel}>
        {Icon && <Icon size={11} strokeWidth={1.9} aria-hidden />}
        {label}
      </span>
      <span
        className={s.infoValue}
        data-mono={mono ? 'true' : undefined}
        dir={mono ? 'ltr' : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  desc,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  tone: 'emerald' | 'violet' | 'cyan' | 'red';
}) {
  // مسیرهای داخلی پنل → view transition
  // مسیرهای بیرونی (signout, …) → navigation ساده
  const withTransition =
    href.startsWith('/customer') || href.startsWith('/dashboard');
  return (
    <ViewLink
      href={href}
      withTransition={withTransition}
      className={`${s.action} ${s[`action-${tone}`]}`}
    >
      <span className={s.actionIcon} aria-hidden>
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <span className={s.actionBody}>
        <span className={s.actionTitle}>{title}</span>
        <span className={s.actionDesc}>{desc}</span>
      </span>
      <ChevronLeft size={14} strokeWidth={1.8} className={s.actionArrow} aria-hidden />
    </ViewLink>
  );
}

function ProfileStat({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone: 'emerald' | 'red' | 'amber' | 'violet' | 'cyan';
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className={`${s.stat} ${s[`stat-${tone}`]}`}>
      <span className={s.statIcon} aria-hidden>
        <Icon size={16} strokeWidth={1.9} />
      </span>
      <div className={s.statBody}>
        <span className={s.statLabel}>{label}</span>
        <span className={s.statValue}>{value}</span>
        {hint && <span className={s.statHint}>{hint}</span>}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className={s.statLink}>
        {inner}
      </Link>
    );
  }
  return inner;
}
