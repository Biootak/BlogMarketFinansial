'use client';

/**
 * StaffDirectory — grid کارت‌های اعضای تیم به‌همراه toolbar (search + role filter).
 *
 * client component: state محلی برای query و role filter.
 */

import type { ExchangeStaffRow } from '@/actions/exchanges';
import { Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { STAFF_ROLE_FA, type StaffRole, rankRole } from '../_lib/staff-format';
import { StaffCard } from './StaffCard';
import s from './StaffCockpit.module.css';

type RoleFilter = 'ALL' | StaffRole;

interface Props {
  members: ExchangeStaffRow[];
  currentUserId: string;
  canWrite: boolean;
  canRevoke: boolean;
  onRoleChange: (id: string, role: 'OWNER' | 'MANAGER' | 'STAFF' | 'VIEWER') => void;
  onRevoke: (member: ExchangeStaffRow) => void;
  updatingId?: string | null;
}

const FILTERS: ReadonlyArray<{ value: RoleFilter; label: string }> = [
  { value: 'ALL', label: 'همه' },
  { value: 'OWNER', label: STAFF_ROLE_FA.OWNER },
  { value: 'MANAGER', label: STAFF_ROLE_FA.MANAGER },
  { value: 'STAFF', label: STAFF_ROLE_FA.STAFF },
  { value: 'VIEWER', label: STAFF_ROLE_FA.VIEWER },
];

export function StaffDirectory({
  members,
  currentUserId,
  canWrite,
  canRevoke,
  onRoleChange,
  onRevoke,
  updatingId,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RoleFilter>('ALL');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => {
        if (filter !== 'ALL' && m.role !== filter) return false;
        if (!q) return true;
        return (
          m.user.email.toLowerCase().includes(q) ||
          (m.user.name ?? '').toLowerCase().includes(q) ||
          (m.title ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // همیشه self اول، سپس بر اساس rank
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        const r = rankRole(a.role) - rankRole(b.role);
        if (r !== 0) return r;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });
  }, [members, query, filter, currentUserId]);

  return (
    <section className={s.directory} aria-label="فهرست اعضا">
      <header className={s.directoryHead}>
        <div>
          <h2 className={s.directoryTitle}>اعضای تیم</h2>
          <p className={s.directorySub}>
            {members.length.toLocaleString('fa-IR')} عضو · {filtered.length.toLocaleString('fa-IR')}{' '}
            نمایش داده‌شده
          </p>
        </div>
      </header>

      <div className={s.toolbar}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon} aria-hidden>
            <Search size={14} strokeWidth={2} />
          </span>
          <input
            className={s.searchInput}
            type="search"
            placeholder="جست‌وجوی نام، ایمیل یا عنوان…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            dir="rtl"
            aria-label="جست‌وجو"
          />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={s.filterPill}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon} aria-hidden>
            <Users size={22} strokeWidth={1.75} />
          </span>
          <p className={s.emptyTitle}>
            {query || filter !== 'ALL' ? 'نتیجه‌ای پیدا نشد' : 'تیم فعلاً فقط شما هستید'}
          </p>
          <p className={s.emptySub}>
            {query || filter !== 'ALL'
              ? 'فیلتر یا جست‌وجو را تغییر دهید.'
              : 'اولین هم‌تیمی خود را از پنل بالا دعوت کنید.'}
          </p>
        </div>
      ) : (
        <div className={s.grid}>
          {filtered.map((m) => (
            <StaffCard
              key={m.id}
              member={m}
              currentUserId={currentUserId}
              canWrite={canWrite}
              canRevoke={canRevoke}
              onRoleChange={onRoleChange}
              onRevoke={onRevoke}
              updatingId={updatingId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
