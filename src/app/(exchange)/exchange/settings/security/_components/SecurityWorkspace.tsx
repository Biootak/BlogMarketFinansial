'use client';

/**
 * SecurityWorkspace — نمای امنیت و دسترسی.
 *
 *   شامل:
 *   - members grid (آواتار، نقش، تاریخ عضویت)
 *   - 2FA banner
 *   - active session info
 *   - لینک به staff sub-routes
 *
 *   فقط نمایش (read-only) — تغییرات از /exchange/staff انجام می‌شود.
 */

import type { ExchangeRow } from '@/actions/exchanges';
import { TwoFactorSection } from '@/components/Dashboard/Profile/TwoFactorSection';
import { SettingsSurfaceCard } from '@/components/Dashboard/primitives';
import { ChevronLeft, Clock, KeyRound, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import s from './SecurityWorkspace.module.css';

type StaffRow = {
  id: string;
  exchangeId: string;
  userId: string;
  role: string;
  title: string | null;
  joinedAt: Date;
  revokedAt: Date | null;
  user: { name: string | null; email: string; image: string | null };
};

type Props = {
  exchange: ExchangeRow;
  staff: StaffRow[];
  currentUserId: string;
  currentUserEmail?: string;
  currentRole: string;
  canEdit: boolean;
};

const ROLE_FA: Record<string, { label: string; tone: string; desc: string }> = {
  OWNER: { label: 'مالک', tone: 'gold', desc: 'دسترسی کامل — قابل ویرایش و حذف سایر اعضا' },
  MANAGER: { label: 'مدیر', tone: 'accent', desc: 'ویرایش تنظیمات — بدون حذف اعضا' },
  STAFF: { label: 'کارمند', tone: 'info', desc: 'ایجاد تراکنش و مدیریت مشتری' },
  VIEWER: { label: 'مشاهده‌گر', tone: 'neutral', desc: 'فقط خواندن' },
};

const dateFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' });

export default function SecurityWorkspace({
  exchange,
  staff,
  currentUserId,
  currentUserEmail,
  currentRole,
  canEdit,
}: Props) {
  const activeStaff = staff.filter((m) => !m.revokedAt);
  const roleStats = activeStaff.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className={s.root}>
      {/* ── 2FA banner (informational summary for the whole team) ── */}
      <div className={s.twofaBanner}>
        <span className={s.twofaIcon} aria-hidden>
          <KeyRound size={18} strokeWidth={1.85} />
        </span>
        <div className={s.twofaText}>
          <strong>تأیید دو مرحله‌ای (2FA)</strong>
          <span>برای افزایش امنیت، توصیه می‌شود همهٔ اعضای دارای نقش حساس 2FA را فعال کنند.</span>
        </div>
        <span className={s.twofaBadge}>{activeStaff.length > 1 ? 'پیشنهاد ویژه' : 'اختیاری'}</span>
      </div>

      {/* ── Personal 2FA — interactive panel for the current staff member */}
      <TwoFactorSection userEmail={currentUserEmail} />

      {/* ── Members grid ────────────────────────────────────────── */}
      <SettingsSurfaceCard
        id="security-members"
        title="اعضای فعال"
        description={`${activeStaff.length} عضو فعال از ${staff.length} کل عضو`}
        icon={Users}
        tone="info"
        headerActions={
          <Link href="/exchange/staff" className={s.cardLink}>
            <span>مدیریت اعضا</span>
            <ChevronLeft size={12} aria-hidden />
          </Link>
        }
      >
        <div className={s.roleStats}>
          {Object.entries(ROLE_FA).map(([role, info]) => {
            const count = roleStats[role] ?? 0;
            return (
              <div key={role} className={s.roleStat}>
                <span className={`${s.roleDot} ${s[`dot_${info.tone}`]}`} aria-hidden />
                <div className={s.roleInfo}>
                  <span className={s.roleLabel}>{info.label}</span>
                  <span className={s.roleDesc}>{info.desc}</span>
                </div>
                <span className={s.roleCount}>{new Intl.NumberFormat('fa-IR').format(count)}</span>
              </div>
            );
          })}
        </div>

        <ul className={s.memberList}>
          {activeStaff.map((m) => {
            const info = ROLE_FA[m.role] ?? { label: m.role, tone: 'neutral' };
            const isMe = m.userId === currentUserId;
            const initials = (m.user.name ?? m.user.email).slice(0, 2);
            return (
              <li key={m.id} className={s.memberItem}>
                <div className={s.memberAvatar}>
                  {m.user.image ? (
                    // Avatar URL
                    <img src={m.user.image} alt="" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className={s.memberInfo}>
                  <div className={s.memberNameRow}>
                    <span className={s.memberName}>{m.user.name ?? m.user.email}</span>
                    {isMe && <span className={s.youTag}>شما</span>}
                  </div>
                  <div className={s.memberMeta}>
                    <span className={s.memberEmail} dir="ltr">
                      {m.user.email}
                    </span>
                    <span className={s.metaSep}>·</span>
                    <span className={s.memberJoined}>
                      <Clock size={10} aria-hidden />
                      عضو از {dateFa.format(new Date(m.joinedAt))}
                    </span>
                  </div>
                </div>
                <span className={`${s.memberRole} ${s[`role_${info.tone}`]}`}>{info.label}</span>
              </li>
            );
          })}
        </ul>
      </SettingsSurfaceCard>

      {/* ── Access policy ───────────────────────────────────────── */}
      <SettingsSurfaceCard
        id="security-policy"
        title="سطح دسترسی شما"
        description="نقش و مجوزهای فعلی شما در این صرافی"
        icon={ShieldCheck}
        tone="accent"
      >
        <div className={s.policyGrid}>
          <PolicyRow
            label="نقش فعلی"
            value={ROLE_FA[currentRole]?.label ?? currentRole}
            tone={ROLE_FA[currentRole]?.tone ?? 'neutral'}
          />
          <PolicyRow label="صرافی" value={exchange.name} />
          <PolicyRow label="شناسه صرافی" value={exchange.id} mono dim />
          <PolicyRow
            label="نشست فعال"
            value={canEdit ? 'نقش با دسترسی کامل' : 'نقش فقط خواندنی'}
            tone={canEdit ? 'accent' : 'neutral'}
          />
        </div>

        {!canEdit && (
          <div className={s.warn}>
            <ShieldCheck size={13} aria-hidden />
            <span>
              شما به‌عنوان <strong>{ROLE_FA[currentRole]?.label ?? currentRole}</strong> دسترسی
              دارید. برای تغییر تنظیمات صرافی، با مالک یا مدیر صرافی هماهنگ کنید.
            </span>
          </div>
        )}
      </SettingsSurfaceCard>

      {/* ── Quick links to other security-related pages ─────────── */}
      <SettingsSurfaceCard
        id="security-quick"
        title="ابزارهای بیشتر"
        description="لینک‌های سریع به تنظیمات مرتبط"
        icon={KeyRound}
        tone="violet"
      >
        <div className={s.quickGrid}>
          <Link href="/exchange/staff/permissions" className={s.quickCard}>
            <ShieldCheck size={14} strokeWidth={1.85} aria-hidden />
            <div>
              <span className={s.quickTitle}>ماتریس نقش‌ها</span>
              <span className={s.quickDesc}>تعریف دقیق مجوزها برای هر نقش</span>
            </div>
            <ChevronLeft size={12} className={s.quickArrow} aria-hidden />
          </Link>
          <Link href="/exchange/staff/activity" className={s.quickCard}>
            <Clock size={14} strokeWidth={1.85} aria-hidden />
            <div>
              <span className={s.quickTitle}>لاگ ممیزی</span>
              <span className={s.quickDesc}>همهٔ اقدامات انجام‌شده توسط اعضا</span>
            </div>
            <ChevronLeft size={12} className={s.quickArrow} aria-hidden />
          </Link>
          <Link href="/exchange/profile" className={s.quickCard}>
            <KeyRound size={14} strokeWidth={1.85} aria-hidden />
            <div>
              <span className={s.quickTitle}>هویت عمومی</span>
              <span className={s.quickDesc}>تنظیم نام، لوگو و اطلاعات تماس</span>
            </div>
            <ChevronLeft size={12} className={s.quickArrow} aria-hidden />
          </Link>
        </div>
      </SettingsSurfaceCard>
    </div>
  );
}

function PolicyRow({
  label,
  value,
  tone,
  mono,
  dim,
}: {
  label: string;
  value: string;
  tone?: string;
  mono?: boolean;
  dim?: boolean;
}) {
  return (
    <div className={s.policyRow}>
      <span className={s.policyLabel}>{label}</span>
      <span
        className={`${s.policyValue} ${mono ? s.policyMono : ''} ${dim ? s.policyDim : ''} ${tone ? s[`policyTone_${tone}`] : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
