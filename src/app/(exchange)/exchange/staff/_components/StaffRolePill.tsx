'use client';

/**
 * StaffRolePill — pill badge برای نقش (OWNER / MANAGER / STAFF / VIEWER).
 * رنگ از tone پیروی می‌کند؛ از tokens سایت استفاده می‌شود.
 */

import { Eye, ShieldAlert, ShieldCheck, UserCog } from 'lucide-react';
import { STAFF_ROLE_FA, type StaffRole } from '../_lib/staff-format';
import s from './StaffCockpit.module.css';

const ICON_MAP: Record<StaffRole, typeof ShieldCheck> = {
  OWNER: ShieldCheck,
  MANAGER: ShieldAlert,
  STAFF: UserCog,
  VIEWER: Eye,
};

interface Props {
  role: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function StaffRolePill({ role, size = 'sm', showIcon = false }: Props) {
  const r = (role in STAFF_ROLE_FA ? role : 'VIEWER') as StaffRole;
  const Icon = ICON_MAP[r];
  return (
    <span
      className={s.cardRole}
      data-role={r}
      style={size === 'md' ? { padding: '4px 12px', fontSize: 11 } : undefined}
    >
      {showIcon && <Icon size={11} strokeWidth={2} aria-hidden />}
      {STAFF_ROLE_FA[r]}
    </span>
  );
}
