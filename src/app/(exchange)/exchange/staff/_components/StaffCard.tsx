'use client';

/**
 * StaffCard — کارت یک عضو تیم.
 * شامل: آواتار با رنگ نقش، نام، ایمیل، نقش pill، تاریخ عضویت،
 * و اکشن‌ها (تغییر نقش / حذف).
 *
 * حالت self: کارت خود کاربر فعلی متمایز می‌شود و دکمه حذف ندارد.
 */

import Image from 'next/image';
import { Clock, Mail, Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ExchangeStaffRow } from '@/actions/exchanges';
import { formatNumber } from '@/lib/customer-format';
import { isSelf, daysSince, getInitialsFa, avatarTone, STAFF_ROLE_FA, type StaffRole } from '../_lib/staff-format';
import s from './StaffCockpit.module.css';

interface Props {
  member: ExchangeStaffRow;
  currentUserId: string;
  canWrite: boolean;
  canRevoke: boolean;
  onRoleChange: (id: string, role: 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER') => void;
  onRevoke: (member: ExchangeStaffRow) => void;
  updatingId?: string | null;
}

const ROLES: ReadonlyArray<{ value: 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER'; label: string }> = [
  { value: 'OWNER', label: 'مالک' },
  { value: 'MANAGER', label: 'مدیر' },
  { value: 'STAFF', label: 'کارمند' },
  { value: 'VIEWER', label: 'مشاهده‌گر' },
];

function roleOf(m: ExchangeStaffRow): StaffRole {
  return (ROLES.map((r) => r.value) as string[]).includes(m.role)
    ? (m.role as StaffRole)
    : 'STAFF';
}

export function StaffCard({
  member,
  currentUserId,
  canWrite,
  canRevoke,
  onRoleChange,
  onRevoke,
  updatingId,
}: Props) {
  const self = isSelf(member, currentUserId);
  const role = roleOf(member);
  const display = member.user.name ?? member.user.email;
  const initials = getInitialsFa(member.user.name, member.user.email);
  const days = daysSince(member.joinedAt);
  const isUpdating = updatingId === member.id;

  return (
    <article
      className={s.card}
      data-self={self ? 'true' : 'false'}
      style={{ '--i': 0 } as CSSProperties}
    >
      <div className={s.cardHead}>
        <span className={s.cardAvatar} data-role={role} aria-hidden>
          {member.user.image ? (
            <Image src={member.user.image} alt={display} width={44} height={44} />
          ) : (
            <span style={{ background: avatarTone(member.userId, role) }}>{initials}</span>
          )}
          {self && <span className={s.cardSelfBadge} aria-hidden />}
        </span>
        <div className={s.cardInfo}>
          <span className={s.cardName} title={display}>
            {display}
            {self && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--at-accent-fg)',
                  background: 'var(--at-accent-soft)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  letterSpacing: '0.04em',
                }}
              >
                شما
              </span>
            )}
          </span>
          <span className={s.cardEmail} dir="ltr">
            {member.user.email}
          </span>
        </div>
      </div>

      <div className={s.row} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span className={s.cardRole} data-role={role} role="status">
          {STAFF_ROLE_FA[role]}
        </span>
        <span className={s.cardMetaItem} style={{ fontSize: 11, color: 'var(--at-fg-subtle)' }}>
          <Clock size={11} aria-hidden />
          {days < 1
            ? 'امروز'
            : `${formatNumber(days)} روز پیش`}
        </span>
      </div>

      <div className={s.cardMeta}>
        <span className={s.cardMetaItem}>
          <Mail size={11} aria-hidden />
          <span dir="ltr">{member.user.email.split('@')[1] ?? ''}</span>
        </span>
        {member.title && (
          <span className={s.cardMetaItem} style={{ fontWeight: 600, color: 'var(--at-fg-muted)' }}>
            {member.title}
          </span>
        )}
      </div>

      {canWrite && (
        <div className={s.cardActions}>
          <select
            className={s.cardRoleSelect}
            value={role}
            onChange={(e) =>
              onRoleChange(member.id, e.target.value as 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER')
            }
            disabled={isUpdating}
            aria-label={`تغییر نقش ${display}`}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {canRevoke && !self && (
            <button
              type="button"
              className={`${s.cardBtn} ${s.cardBtnDanger}`}
              onClick={() => onRevoke(member)}
              disabled={isUpdating}
              aria-label={`لغو دسترسی ${display}`}
              title="لغو دسترسی"
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
