'use client';

/**
 * StaffOrbit — Signature moment.
 *
 * آواتار اعضای تیم در مدار دایره‌ای پیرامون هستهٔ صرافی. OWNER در مرکز نیست
 * بلکه در درون‌ترین حلقهٔ ممکن نمایش داده می‌شود. انیمیشن orbitBreath
 * (0.5Hz) برای حس "زنده ولی آرام".
 *
 *  - نقش‌ها به‌صورت رنگ حاشیه متمایز می‌شوند
 *  - VIEWER با حاشیهٔ خط‌چین (کم‌دسترسی)
 *  - OWNER یک pulse نرم اطراف خود دارد (active center)
 */

import type { ExchangeStaffRow } from '@/actions/exchanges';
import Image from 'next/image';
import { STAFF_ROLE_FA, type StaffRole, avatarTone, getInitialsFa } from '../_lib/staff-format';
import s from './StaffCockpit.module.css';

interface Props {
  members: ExchangeStaffRow[];
  totalCount: number;
  exchangeName: string;
}

const ROLES: StaffRole[] = ['OWNER', 'MANAGER', 'STAFF', 'VIEWER'];

function roleOf(member: ExchangeStaffRow): StaffRole {
  return (ROLES as string[]).includes(member.role) ? (member.role as StaffRole) : 'STAFF';
}

export function StaffOrbit({ members, totalCount, exchangeName }: Props) {
  // حداکثر ۸ نود برای خوانایی؛ بقیه +N
  const visible = members.slice(0, 8);
  const remaining = Math.max(0, members.length - visible.length);
  const N = visible.length;
  // شعاع نودها از ۳۰٪ تا ۴۸٪ عرض کانتینر (در یک مربع)
  // برای پخش یکنواخت از ۰..N روی دایره
  return (
    <div className={s.orbit} aria-hidden>
      {/* center core */}
      <div className={s.orbitCenter}>
        <div className={s.orbitCore}>
          <span className={s.orbitCoreNum}>{totalCount.toLocaleString('fa-IR')}</span>
          <span className={s.orbitCoreLabel}>عضو فعال</span>
        </div>
      </div>

      {/* nodes */}
      <div className={s.orbitNodes}>
        {visible.map((m, i) => {
          // پخش یکنواخت؛ شروع از بالا، چرخش ساعت‌گرد
          const angle = (i / Math.max(N, 1)) * Math.PI * 2 - Math.PI / 2;
          // شعاع تطبیقی: OWNER در ۳۰٪، بقیه ۴۰-۴۸٪
          const r = roleOf(m) === 'OWNER' ? 30 : i % 2 === 0 ? 44 : 40;
          const x = 50 + Math.cos(angle) * r;
          const y = 50 + Math.sin(angle) * r;
          const role = roleOf(m);
          const display = m.user.name ?? m.user.email;
          const initials = getInitialsFa(m.user.name, m.user.email);
          return (
            <span
              key={m.id}
              className={s.orbitNode}
              data-role={role}
              data-active={role === 'OWNER' ? 'true' : undefined}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${i * 60}ms`,
                background: m.user.image ? 'var(--at-bg-elevated)' : avatarTone(m.userId, role),
              }}
              title={`${display} · ${STAFF_ROLE_FA[role]}`}
            >
              {m.user.image ? (
                <Image
                  className={s.orbitNodeImage}
                  src={m.user.image}
                  alt={display}
                  width={38}
                  height={38}
                />
              ) : (
                initials
              )}
            </span>
          );
        })}
        {remaining > 0 &&
          (() => {
            const angle = (N / Math.max(N + 1, 1)) * Math.PI * 2 - Math.PI / 2;
            const r = 44;
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            return (
              <span
                key="__more"
                className={s.orbitNode}
                data-role="STAFF"
                style={{ left: `${x}%`, top: `${y}%`, fontSize: 10 }}
                title={`${remaining}+ عضو دیگر`}
              >
                +{remaining.toLocaleString('fa-IR')}
              </span>
            );
          })()}
      </div>

      {/* legend */}
      <div className={s.orbitLegend}>
        <span>
          <span className={s.orbitLegendDot} data-role="OWNER" />
          مالک
        </span>
        <span>
          <span className={s.orbitLegendDot} data-role="MANAGER" />
          مدیر
        </span>
        <span>
          <span className={s.orbitLegendDot} data-role="STAFF" />
          کارمند
        </span>
        <span>
          <span className={s.orbitLegendDot} data-role="VIEWER" />
          مشاهده‌گر
        </span>
        <span style={{ color: 'var(--at-fg-subtle)' }}>· {exchangeName}</span>
      </div>
    </div>
  );
}
