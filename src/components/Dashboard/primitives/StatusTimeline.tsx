'use client';

/**
 * StatusTimeline — compact activity/status feed for any dashboard.
 *
 * Shows a vertical list of timeline items with icon, label, description,
 * and relative timestamp. Supports grouping by date header.
 *
 * Usage:
 *   <StatusTimeline items={[{ icon: 'activity', label: 'تراکنش جدید', ... }]} />
 */

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  type LucideIcon,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import s from './StatusTimeline.module.css';

// ─── Types ──────────────────────────────────────────────────────────────

export type TimelineTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  alert: AlertCircle,
  alertTriangle: AlertTriangle,
  arrowUpRight: ArrowUpRight,
  check: CheckCircle,
  clock: Clock,
  creditCard: CreditCard,
  externalLink: ExternalLink,
  file: FileText,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  userPlus: UserPlus,
  wallet: Wallet,
  xCircle: XCircle,
};

export interface TimelineItem {
  /** Icon name key or custom ReactNode */
  icon?: string | ReactNode;
  /** Primary label */
  label: string;
  /** Secondary description */
  description?: string;
  /** Timestamp (ISO string or Date) */
  timestamp?: string | Date;
  /** Tone for icon coloring */
  tone?: TimelineTone;
  /** Optional link */
  href?: string;
}

export interface TimelineGroup {
  /** Group header (e.g. "امروز", "دیروز") */
  header: string;
  items: TimelineItem[];
}

export interface StatusTimelineProps {
  /** Flat list of items (groups will be auto-computed from timestamps) */
  items?: TimelineItem[];
  /** Pre-grouped items (overrides `items`) */
  groups?: TimelineGroup[];
  /** Max items to show before "show more" */
  maxItems?: number;
  /** "Show more" link */
  moreHref?: string;
  /** Empty state message */
  emptyMessage?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function formatRelative(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'هم‌اکنون';
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  if (diffH < 24) return `${diffH} ساعت پیش`;
  if (diffD < 7) return `${diffD} روز پیش`;
  return date.toLocaleDateString('fa-IR');
}

function resolveIcon(icon: string | ReactNode | undefined): {
  icon: LucideIcon | null;
  node: ReactNode | null;
} {
  if (!icon) return { icon: null, node: null };
  if (typeof icon === 'string') {
    const found = ICON_MAP[icon];
    return { icon: found ?? null, node: null };
  }
  return { icon: null, node: icon };
}

const TONE_CLASS: Record<TimelineTone, string> = {
  default: s.toneDefault,
  success: s.toneSuccess,
  warning: s.toneWarning,
  danger: s.toneDanger,
  info: s.toneInfo,
};

// ─── Subcomponents ──────────────────────────────────────────────────────

function TimelineRow({ item }: { item: TimelineItem }) {
  const { icon: IconComp, node: IconNode } = resolveIcon(item.icon);

  const iconContent = IconNode ?? (IconComp ? <IconComp size={14} /> : <Clock size={14} />);

  const content = (
    <>
      <span className={`${s.iconWrap} ${TONE_CLASS[item.tone ?? 'default']}`} aria-hidden>
        {iconContent}
      </span>
      <div className={s.content}>
        <span className={s.label}>{item.label}</span>
        {item.description && <span className={s.desc}>{item.description}</span>}
      </div>
      <span className={s.time}>{item.timestamp ? formatRelative(item.timestamp) : ''}</span>
      {item.href && <ArrowUpRight size={12} className={s.externalIcon} aria-hidden />}
    </>
  );

  if (item.href) {
    return (
      <li className={s.row}>
        <Link href={item.href} className={s.rowLink}>
          {content}
        </Link>
      </li>
    );
  }

  return <li className={s.row}>{content}</li>;
}

function GroupBlock({ group, maxItems }: { group: TimelineGroup; maxItems?: number }) {
  const displayItems = maxItems ? group.items.slice(0, maxItems) : group.items;

  return (
    <div className={s.group}>
      <h3 className={s.groupHeader}>{group.header}</h3>
      <ul className={s.list}>
        {displayItems.map((item, i) => (
          <TimelineRow key={`${item.label}-${i}`} item={item} />
        ))}
      </ul>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export function StatusTimeline({
  items,
  groups,
  maxItems,
  moreHref,
  emptyMessage = 'فعلاً فعالیتی ثبت نشده',
}: StatusTimelineProps) {
  // Auto-group items by "today" / "older" if flat list provided
  const computedGroups = useMemo(() => {
    if (groups) return groups;
    if (!items || items.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayItems: TimelineItem[] = [];
    const olderItems: TimelineItem[] = [];

    for (const item of items) {
      if (!item.timestamp) {
        todayItems.push(item);
        continue;
      }
      const ts = new Date(item.timestamp);
      if (ts >= today) {
        todayItems.push(item);
      } else {
        olderItems.push(item);
      }
    }

    const result: TimelineGroup[] = [];
    if (todayItems.length > 0) {
      result.push({ header: 'امروز', items: todayItems });
    }
    if (olderItems.length > 0) {
      result.push({ header: 'قبلی', items: olderItems });
    }
    return result;
  }, [items, groups]);

  if (computedGroups.length === 0) {
    return (
      <div className={s.empty}>
        <Clock size={20} className={s.emptyIcon} aria-hidden />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className={s.root}>
      {computedGroups.map((group) => (
        <GroupBlock key={group.header} group={group} maxItems={maxItems} />
      ))}
      {moreHref && (
        <Link href={moreHref} className={s.moreLink}>
          مشاهده همه
        </Link>
      )}
    </div>
  );
}
