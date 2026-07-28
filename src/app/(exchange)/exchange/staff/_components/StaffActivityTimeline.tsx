'use client';

/**
 * StaffActivityTimeline — timeline فعالیت‌های اخیر تیم.
 *
 * داده‌ها از getStaffActivity (AuditLog). هر آیتم:
 *  - icon با tone (emerald=افزودن/موفق، rose=حذف/خطا، gold=ویرایش، info=…)
 *  - عنوان + actor + entity
 *  - زمان نسبی فارسی (۲ دقیقه پیش)
 */

import {
  Activity,
  LogIn,
  LogOut,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { StaffActivityItem } from '@/actions/exchanges';
import { getActionLabel, getActionTone, formatRelativeFa } from '../_lib/staff-format';
import s from './StaffCockpit.module.css';

interface Props {
  items: StaffActivityItem[];
  limit?: number;
}

const ICON_MAP: Record<string, typeof Activity> = {
  'staff.invited': UserPlus,
  'staff.revoked': UserMinus,
  'staff.role.updated': ShieldCheck,
  'customer.created': UserPlus,
  'customer.updated': Users,
  'customer.deleted': UserMinus,
  'transaction.created': Activity,
  'transaction.updated': Activity,
  'transaction.completed': ShieldCheck,
  'transaction.cancelled': ShieldAlert,
  'rate.created': Settings,
  'rate.updated': Settings,
  'settings.updated': Settings,
  'login': LogIn,
  'logout': LogOut,
};

function iconFor(action: string) {
  return ICON_MAP[action] ?? Activity;
}

export function StaffActivityTimeline({ items, limit = 10 }: Props) {
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className={s.empty}>
        <span className={s.emptyIcon} aria-hidden>
          <Activity size={22} strokeWidth={1.75} />
        </span>
        <p className={s.emptyTitle}>فعلاً فعالیتی ثبت نشده</p>
        <p className={s.emptySub}>
          به‌محض اولین اقدام روی تیم یا صرافی، اینجا نمایش داده می‌شود.
        </p>
      </div>
    );
  }

  return (
    <ol className={s.timeline} aria-label="فعالیت‌های اخیر تیم">
      {visible.map((item, i) => {
        const Icon = iconFor(item.action);
        const tone = getActionTone(item.action);
        const actor =
          item.actorName ??
          (item.actorEmail ? item.actorEmail.split('@')[0] : 'سیستم');
        return (
          <li
            key={item.id}
            className={s.timelineItem}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className={s.timelineDot} data-tone={tone} aria-hidden>
              <Icon size={14} strokeWidth={2} />
            </span>
            <div className={s.timelineBody}>
              <span className={s.timelineTitle}>
                {getActionLabel(item.action)}
              </span>
              <span className={s.timelineMeta}>
                <span className={s.timelineActor}>{actor}</span>
                {item.entityType && (
                  <>
                    <span className={s.timelineMetaSep}>·</span>
                    <span>{item.entityType}</span>
                  </>
                )}
              </span>
            </div>
            <time
              className={s.timelineTime}
              dateTime={new Date(item.createdAt).toISOString()}
              title={new Date(item.createdAt).toLocaleString('fa-IR')}
            >
              {formatRelativeFa(item.createdAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
