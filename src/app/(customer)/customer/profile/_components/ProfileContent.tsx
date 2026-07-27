'use client';

/**
 * ProfileContent — «کارنامه» مشتری
 * ----------------------------------------------------------------------------
 *  - Identity Hero: نام + کد مشتری + status pill
 *  - Personal info:  کلید-مقدار (نام، ایمیل، تلفن، ملیت، تاریخ تولد)
 *  - Customer Level:  سطح KYC + سقف تراکنش
 *  - Identity provider:  email/google/etc
 *  - Risk:             یادداشت‌های risk
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
import { Fingerprint, IdCard, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import s from './ProfileContent.module.css';

interface Props {
  profile: CustomerProfile;
}

export default function ProfileContent({ profile }: Props) {
  const kycKey = KYC_STATUS_CSSKEY[profile.kycStatus] ?? 'warning';
  const statusKey = CUSTOMER_STATUS_CSSKEY[profile.status] ?? 'neutral';
  const initials = profile.fullName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  return (
    <div className={s.root} dir="rtl">
      {/* ── Identity Hero ──────────────────────────────────────────── */}
      <section className={s.hero} aria-label="مشخصات هویتی">
        <div className={s.heroAvatar} aria-hidden>
          <span>{initials}</span>
          <span className={s.heroAvatarRing} />
        </div>
        <div className={s.heroMain}>
          <h1 className={s.heroName}>{profile.fullName}</h1>
          <div className={s.heroMeta}>
            <span className={s.heroMetaItem}>
              <Fingerprint size={11} aria-hidden />
              شناسه <strong dir="ltr">{profile.id.slice(0, 8)}</strong>
            </span>
            <span className={s.heroSep} aria-hidden />
            <span className={s.heroMetaItem}>
              <LiveDot size={4} tone="brand" />
              ثبت‌نام {faDate(profile.createdAt)}
            </span>
            <span className={s.heroSep} aria-hidden />
            <StatusPill variant={statusKey}>
              {STATUS_LABEL[profile.status] ?? profile.status}
            </StatusPill>
          </div>
        </div>
      </section>

      {/* ── Personal Info (KeyValue) ───────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={User} title="اطلاعات شخصی" />
        <div className={s.kvList}>
          {profile.fullName && (
            <Row label="نام کامل" value={profile.fullName} icon={User} />
          )}
          {profile.fatherName && <Row label="نام پدر" value={profile.fatherName} icon={User} />}
          {profile.email && (
            <Row
              label="ایمیل"
              value={
                <a href={`mailto:${profile.email}`} className={s.link}>
                  {profile.email}
                </a>
              }
              icon={Mail}
            />
          )}
          {profile.phone && (
            <Row
              label="تلفن"
              value={
                <a href={`tel:${profile.phone}`} className={s.link} dir="ltr">
                  {profile.phone}
                </a>
              }
              icon={Phone}
            />
          )}
          {profile.nationalId && (
            <Row
              label="کد ملی"
              value={
                <span dir="ltr" style={{ fontFeatureSettings: '"tnum" 1' }}>
                  {profile.nationalId}
                </span>
              }
              icon={IdCard}
            />
          )}
          {profile.passportNo && (
            <Row
              label="شماره پاسپورت"
              value={
                <span dir="ltr" style={{ fontFeatureSettings: '"tnum" 1' }}>
                  {profile.passportNo}
                </span>
              }
              icon={IdCard}
            />
          )}
          {profile.city && <Row label="شهر" value={profile.city} />}
          {profile.address && <Row label="آدرس" value={profile.address} />}
        </div>
      </section>

      {/* ── KYC Level ──────────────────────────────────────────────── */}
      <section className={s.section}>
        <SectionHeader icon={ShieldCheck} title="سطح احراز هویت" sub={KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel} />
        <div className={s.kycGrid}>
          <div className={s.kycCard} data-tone={kycKey}>
            <span className={s.kycIcon} aria-hidden>
              <KycStatusIcon status={profile.kycStatus} />
            </span>
            <div className={s.kycBody}>
              <span className={s.kycLabel}>وضعیت تأیید</span>
              <span className={s.kycValue}>{STATUS_LABEL[profile.kycStatus] ?? profile.kycStatus}</span>
            </div>
          </div>
          <div className={s.kycCard}>
            <span className={s.kycIcon} aria-hidden>
              <ShieldCheck size={13} />
            </span>
            <div className={s.kycBody}>
              <span className={s.kycLabel}>سطح</span>
              <span className={s.kycValue}>{KYC_LEVEL_LABEL[profile.kycLevel] ?? profile.kycLevel}</span>
            </div>
          </div>
          {profile.personalLimitAf !== null && (
            <div className={s.kycCard}>
              <span className={s.kycIcon} aria-hidden>
                <span style={{ fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>$</span>
              </span>
              <div className={s.kycBody}>
                <span className={s.kycLabel}>سقف تراکنش</span>
                <span className={s.kycValue}>
                  {faAmount(profile.personalLimitAf, 'AFN')}
                </span>
              </div>
            </div>
          )}
          {profile.riskScore !== null && (
            <div className={s.kycCard} data-tone={profile.riskScore > 70 ? 'danger' : profile.riskScore > 40 ? 'warning' : 'success'}>
              <span className={s.kycIcon} aria-hidden>
                <span style={{ fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>!</span>
              </span>
              <div className={s.kycBody}>
                <span className={s.kycLabel}>امتیاز ریسک</span>
                <span className={s.kycValue}>{faNum(profile.riskScore)}</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
  mono,
  dir,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
  mono?: boolean;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className={s.kvRow}>
      <span className={s.kvLabel}>
        {Icon && <Icon size={10} aria-hidden />}
        {label}
      </span>
      <span
        className={s.kvValue}
        data-mono={mono ? 'true' : undefined}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}
