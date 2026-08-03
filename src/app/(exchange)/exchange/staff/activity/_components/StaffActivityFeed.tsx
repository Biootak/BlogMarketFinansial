'use client';

/**
 * StaffActivityFeed — فید کامل فعالیت‌ها (sub-page).
 * client component با state برای tone filter و search.
 */

import type { StaffActivityItem } from '@/actions/exchanges';
import {
  Activity,
  Filter,
  LogIn,
  LogOut,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import s from '../../_components/StaffCockpit.module.css';
import {
  formatFaDate,
  formatRelativeFa,
  getActionLabel,
  getActionTone,
} from '../../_lib/staff-format';

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
  login: LogIn,
  logout: LogOut,
};

type ToneFilter = 'all' | 'emerald' | 'gold' | 'rose' | 'info' | 'muted';

interface Props {
  items: StaffActivityItem[];
  initialTone?: string;
}

const TONE_LABELS: Record<ToneFilter, string> = {
  all: 'همه',
  emerald: 'مثبت',
  gold: 'تغییر',
  rose: 'حذف/خطا',
  info: 'اطلاعاتی',
  muted: 'سیستمی',
};

export function StaffActivityFeed({ items, initialTone = 'all' }: Props) {
  const [tone, setTone] = useState<ToneFilter>(
    (initialTone in TONE_LABELS ? initialTone : 'all') as ToneFilter,
  );
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((it) => {
      if (tone !== 'all' && getActionTone(it.action) !== tone) return false;
      if (!query) return true;
      return (
        getActionLabel(it.action).toLowerCase().includes(query) ||
        (it.actorName ?? '').toLowerCase().includes(query) ||
        (it.actorEmail ?? '').toLowerCase().includes(query) ||
        (it.entityType ?? '').toLowerCase().includes(query)
      );
    });
  }, [items, tone, q]);

  // گروه‌بندی بر اساس روز
  const groups = useMemo(() => {
    const out: Array<{ key: string; items: StaffActivityItem[] }> = [];
    const map = new Map<string, StaffActivityItem[]>();
    for (const it of filtered) {
      const key = formatFaDate(it.createdAt);
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    for (const [k, v] of map) out.push({ key: k, items: v });
    return out;
  }, [filtered]);

  return (
    <div className={s.feed} aria-label="لاگ ممیزی">
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--ds-space-3)',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            color: 'var(--at-fg-muted)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Filter size={12} strokeWidth={2} aria-hidden style={{ color: 'var(--at-fg-faint)' }} />
          {(Object.keys(TONE_LABELS) as ToneFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              className={s.filterPill}
              aria-pressed={tone === t}
              onClick={() => setTone(t)}
            >
              {TONE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className={s.searchWrap} style={{ maxWidth: 280, flex: '0 1 280px' }}>
          <span className={s.searchIcon} aria-hidden>
            <Activity size={12} strokeWidth={2} />
          </span>
          <input
            className={s.searchInput}
            type="search"
            placeholder="جست‌وجوی actor یا نوع رویداد…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="جست‌وجو"
            dir="rtl"
          />
        </div>
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon} aria-hidden>
            <Activity size={22} strokeWidth={1.75} />
          </span>
          <p className={s.emptyTitle}>رویدادی پیدا نشد</p>
          <p className={s.emptySub}>فیلتر یا جست‌وجوی خود را تغییر دهید.</p>
        </div>
      ) : (
        <ul className={s.feedList}>
          {groups.map((g) => (
            <li key={g.key} style={{ listStyle: 'none' }}>
              <div
                style={{
                  padding: '6px 14px',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--at-fg-subtle)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  background: 'var(--at-bg-elevated)',
                  borderBlockEnd: '1px solid var(--at-line)',
                }}
              >
                {g.key}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {g.items.map((item) => {
                  const Icon = ICON_MAP[item.action] ?? Activity;
                  const tone = getActionTone(item.action);
                  const actor = item.actorName ?? item.actorEmail ?? 'سیستم';
                  return (
                    <li key={item.id} className={s.feedItem}>
                      <span className={s.feedDot} data-tone={tone} aria-hidden>
                        <Icon size={15} strokeWidth={2} />
                      </span>
                      <div className={s.feedBody}>
                        <span className={s.feedTitle}>{getActionLabel(item.action)}</span>
                        <span className={s.feedMeta}>
                          <span style={{ fontWeight: 600, color: 'var(--at-fg-muted)' }}>
                            {actor}
                          </span>
                          {item.entityType && (
                            <>
                              <span style={{ color: 'var(--at-fg-faint)' }}>·</span>
                              <span>{item.entityType}</span>
                            </>
                          )}
                          {item.actorRole && (
                            <>
                              <span style={{ color: 'var(--at-fg-faint)' }}>·</span>
                              <span>{item.actorRole}</span>
                            </>
                          )}
                        </span>
                      </div>
                      <time
                        className={s.feedTime}
                        dateTime={new Date(item.createdAt).toISOString()}
                        title={new Date(item.createdAt).toLocaleString('fa-IR')}
                      >
                        {formatRelativeFa(item.createdAt)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
