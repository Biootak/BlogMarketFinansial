'use client';

/**
 * StaffRoleMatrix — ماتریس دسترسی‌های هر نقش.
 * داده ایستا از STAFF_CAPABILITY_GROUPS / STAFF_CAPABILITY_LABELS / STAFF_ROLE_MATRIX.
 */

import {
  STAFF_CAPABILITY_GROUPS,
  STAFF_CAPABILITY_LABELS,
  STAFF_ROLE_FA,
  STAFF_ROLE_MATRIX,
  type StaffRole,
  type StaffRoleCapability,
} from '@/lib/staff-permissions';
import { Check } from 'lucide-react';
import s from './StaffCockpit.module.css';

const ROLES: StaffRole[] = ['OWNER', 'MANAGER', 'STAFF', 'VIEWER'];

function has(role: StaffRole, cap: StaffRoleCapability): boolean {
  return STAFF_ROLE_MATRIX[role].includes(cap);
}

export function StaffRoleMatrix() {
  return (
    <div className="overflow-x-auto">
    <div className={s.matrix} aria-label="ماتریس دسترسی نقش‌ها">
      <div className={s.matrixHeader} role="row">
        <span>قابلیت</span>
        {ROLES.map((r) => (
          <span key={r} role="columnheader">
            {STAFF_ROLE_FA[r]}
          </span>
        ))}
      </div>

      {STAFF_CAPABILITY_GROUPS.map((group) => (
        <div key={group.id} className={s.matrixGroup}>
          <div className={s.matrixGroupHead}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--at-accent)',
              }}
            />
            {group.label}
          </div>

          {group.capabilities.map((cap) => (
            <div key={cap} className={s.matrixRow} role="row">
              <span className={s.matrixCap} role="rowheader">
                {STAFF_CAPABILITY_LABELS[cap]}
              </span>
              {ROLES.map((r) => (
                <span key={r} className={s.matrixCell} role="cell">
                  {has(r, cap) ? (
                    <span className={s.matrixCheck} aria-label="دارد">
                      <Check size={12} strokeWidth={2.5} aria-hidden />
                    </span>
                  ) : (
                    <span className={s.matrixDash} aria-label="ندارد" />
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
    </div>
  );
}
