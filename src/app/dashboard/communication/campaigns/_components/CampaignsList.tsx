'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Mail,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  ChannelRing,
  type ChannelRingSegment,
  FilterPills,
  type FilterPillItem,
  HubShell,
  LiveDot,
  type PillTabItem,
} from '@/components/Dashboard/PlatformHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ConfirmDialog,
  EmptyState,
} from '@/components/Dashboard/primitives';
import s from './Campaigns.module.css';

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  channel: 'email' | 'sms' | 'push';
  subject: string | null;
  body: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
  audience: 'all' | 'role' | 'segment';
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  stats: { sent: number; opened: number; clicked: number; bounced: number };
  createdAt: string;
};

interface CampaignsListProps {
  items: Campaign[];
}

const STATUS_LABELS: Record<Campaign['status'], string> = {
  draft: 'پیش‌نویس',
  scheduled: 'زمان‌بندی',
  sending: 'در حال ارسال',
  completed: 'تکمیل شده',
  paused: 'متوقف',
};

const STATUS_TONES: Record<Campaign['status'], 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'neutral'> = {
  completed: 'emerald',
  sending: 'indigo',
  scheduled: 'cyan',
  paused: 'amber',
  draft: 'rose',
};

const CHANNEL_ICON = { email: Mail, sms: Send, push: Sparkles } as const;
const CHANNEL_LABELS: Record<Campaign['channel'], string> = {
  email: 'ایمیل',
  sms: 'پیامک',
  push: 'Push',
};

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));
const fmtPercent = (n: number) =>
  n >= 0 && n <= 1 ? `${PERSIAN_NUM((n * 100).toFixed(1))}٪` : `${PERSIAN_NUM(n.toFixed(1))}٪`;

const TABS: PillTabItem[] = [
  { id: 'all', label: 'همه' },
  { id: 'sending', label: 'در حال ارسال' },
  { id: 'scheduled', label: 'زمان‌بندی' },
  { id: 'completed', label: 'تکمیل شده' },
  { id: 'paused', label: 'متوقف' },
  { id: 'draft', label: 'پیش‌نویس' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CampaignsList({ items }: CampaignsListProps) {
  const router = useRouter();
  const [tab, setTab] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [channel, setChannel] = useState<string>('all');
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const runAction = async (
    id: string,
    payload: { status?: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' },
    method: 'PATCH' | 'DELETE' = 'PATCH',
  ): Promise<{ ok: boolean; message?: string }> => {
    setActionError(null);
    try {
      const res = await fetch(`/api/communication/campaigns/${id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        const msg = data?.error?.message ?? 'خطا در انجام عملیات';
        setActionError(msg);
        return { ok: false, message: msg };
      }
      return { ok: true };
    } catch {
      const msg = 'خطای شبکه';
      setActionError(msg);
      return { ok: false, message };
    }
  };

  const onStatusChange = (
    id: string,
    status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused',
  ) => {
    setOpenMenuId(null);
    startTransition(async () => {
      const r = await runAction(id, { status });
      if (r.ok) router.refresh();
    });
  };

  const onDelete = (id: string) => {
    setConfirmDeleteId(null);
    setOpenMenuId(null);
    startTransition(async () => {
      const r = await runAction(id, {}, 'DELETE');
      if (r.ok) router.refresh();
    });
  };

  const channelFilters: FilterPillItem[] = useMemo(() => {
    const counts: Record<string, number> = { all: 0, email: 0, sms: 0, push: 0 };
    for (const c of items) {
      counts.all += 1;
      counts[c.channel] = (counts[c.channel] ?? 0) + 1;
    }
    return [
      { id: 'all', label: 'همه کانال‌ها', count: counts.all },
      { id: 'email', label: 'ایمیل', count: counts.email, tone: 'indigo' },
      { id: 'sms', label: 'پیامک', count: counts.sms, tone: 'amber' },
      { id: 'push', label: 'Push', count: counts.push, tone: 'emerald' },
    ];
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (tab !== 'all') {
      result = result.filter((c) => c.status === tab);
    }
    if (channel !== 'all') {
      result = result.filter((c) => c.channel === channel);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.subject ?? '').toLowerCase().includes(q) ||
          c.body.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, tab, channel, query]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, c) => {
        acc.sent += c.stats.sent;
        acc.opened += c.stats.opened;
        acc.clicked += c.stats.clicked;
        acc.bounced += c.stats.bounced;
        return acc;
      },
      { sent: 0, opened: 0, clicked: 0, bounced: 0 }
    );
  }, [items]);

  const ringSegments: ChannelRingSegment[] = useMemo(() => {
    const map: Record<Campaign['channel'], number> = { email: 0, sms: 0, push: 0 };
    for (const c of items) map[c.channel] += c.stats.sent;
    return [
      { id: 'email', label: 'ایمیل', value: map.email, tone: 'indigo' },
      { id: 'sms', label: 'پیامک', value: map.sms, tone: 'amber' },
      { id: 'push', label: 'Push', value: map.push, tone: 'emerald' },
    ];
  }, [items]);

  const openRate = totals.sent > 0 ? totals.opened / totals.sent : 0;
  const clickRate = totals.sent > 0 ? totals.clicked / totals.sent : 0;

  return (
    <HubShell
      meta={{
        eyebrow: 'مرکز ارتباطات',
        title: 'کمپین‌ها',
        subtitle: 'کمپین‌های ایمیلی، پیامکی و Push را اینجا ببینید. فیلتر، جستجو و تحلیل.',
        breadcrumb: [
          { href: '/dashboard', label: 'داشبورد' },
          { href: '/dashboard/communication', label: 'مرکز ارتباطات' },
          { label: 'کمپین‌ها' },
        ],
        badges: [
          { label: `${fmtPersian(items.length)} کمپین`, tone: 'emerald' },
          { label: 'همگام', tone: 'indigo', live: true },
        ],
        actions: (
          <Button asChild size="sm">
            <Link href="/dashboard/communication/campaigns/create">
              <Plus size={14} aria-hidden />
              کمپین جدید
            </Link>
          </Button>
        ),
      }}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      <div className={s.summary}>
        <div className={s.summaryRing}>
          <ChannelRing
            segments={ringSegments}
            size={140}
            thickness={12}
            centerLabel="ارسال‌ها"
            centerValue={fmtPersian(totals.sent)}
            ariaLabel="ترکیب ارسال‌ها بر اساس کانال"
          />
        </div>
        <div className={s.summaryStats}>
          <div className={s.statRow}>
            <span className={s.statKey}>نرخ باز شدن</span>
            <span className={s.statBar}>
              <span className={s.statBarFill} data-tone="indigo" style={{ width: `${Math.min(openRate * 100, 100)}%` }} />
            </span>
            <span className={s.statVal}>{fmtPercent(openRate)}</span>
          </div>
          <div className={s.statRow}>
            <span className={s.statKey}>نرخ کلیک</span>
            <span className={s.statBar}>
              <span className={s.statBarFill} data-tone="violet" style={{ width: `${Math.min(clickRate * 100, 100)}%` }} />
            </span>
            <span className={s.statVal}>{fmtPercent(clickRate)}</span>
          </div>
          <div className={s.statRow}>
            <span className={s.statKey}>بازگشتی</span>
            <span className={s.statBar}>
              <span
                className={s.statBarFill}
                data-tone="rose"
                style={{ width: `${totals.sent > 0 ? Math.min((totals.bounced / totals.sent) * 100, 100) : 0}%` }}
              />
            </span>
            <span className={s.statVal}>{fmtPersian(totals.bounced)}</span>
          </div>
        </div>
      </div>

      <section className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={16} aria-hidden className={s.searchIcon} />
          <Input
            type="search"
            className={s.search}
            placeholder="جستجو در نام یا موضوع…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجو"
          />
        </div>
        <FilterPills
          items={channelFilters}
          active={channel}
          onChange={setChannel}
          ariaLabel="فیلتر کانال"
        />
      </section>

      {actionError ? <div className={s.error}>{actionError}</div> : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="کمپینی یافت نشد"
          description="فیلتر یا جستجوی خود را تغییر دهید."
          icon={Sparkles}
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/communication/campaigns/create">
                <Plus size={14} aria-hidden />
                کمپین جدید
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className={s.list}>
          {filtered.map((c) => {
            const Icon = CHANNEL_ICON[c.channel];
            const cOpen = c.stats.sent > 0 ? c.stats.opened / c.stats.sent : 0;
            const cClick = c.stats.sent > 0 ? c.stats.clicked / c.stats.sent : 0;
            return (
              <li key={c.id} className={s.item}>
                <div className={s.itemHead}>
                  <div className={s.itemHeadMain}>
                    <span className={s.itemGlyph} data-channel={c.channel}>
                      <Icon size={16} aria-hidden />
                    </span>
                    <div>
                      <div className={s.itemTitle}>{c.name}</div>
                      <div className={s.itemSub}>{c.subject ?? c.description ?? 'بدون توضیح'}</div>
                    </div>
                  </div>
                  <div className={s.itemHeadRight}>
                    <span className={s.status} data-tone={STATUS_TONES[c.status]}>
                      <LiveDot tone={STATUS_TONES[c.status] === 'emerald' ? 'emerald' : STATUS_TONES[c.status] === 'indigo' ? 'indigo' : STATUS_TONES[c.status] === 'cyan' ? 'cyan' : STATUS_TONES[c.status] === 'amber' ? 'amber' : 'rose'} size="xs" />
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span className={s.channel}>{CHANNEL_LABELS[c.channel]}</span>
                    <div className={s.menuWrap}>
                      <button
                        type="button"
                        className={s.menuBtn}
                        onClick={() => setOpenMenuId((v) => (v === c.id ? null : c.id))}
                        aria-label="عملیات بیشتر"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === c.id}
                      >
                        <MoreHorizontal size={16} aria-hidden />
                      </button>
                      {openMenuId === c.id ? (
                        <div className={s.menu} role="menu">
                          <Link
                            href={`/dashboard/communication/campaigns/${c.id}`}
                            className={s.menuItem}
                            role="menuitem"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <Eye size={14} aria-hidden /> مشاهده جزئیات
                          </Link>
                          {(c.status === 'draft' || c.status === 'scheduled' || c.status === 'paused') ? (
                            <button
                              type="button"
                              className={s.menuItem}
                              role="menuitem"
                              onClick={() => onStatusChange(c.id, 'sending')}
                              disabled={pending}
                            >
                              <Play size={14} aria-hidden /> ارسال کمپین
                            </button>
                          ) : null}
                          {c.status === 'sending' ? (
                            <button
                              type="button"
                              className={s.menuItem}
                              role="menuitem"
                              onClick={() => onStatusChange(c.id, 'paused')}
                              disabled={pending}
                            >
                              <Pause size={14} aria-hidden /> توقف موقت
                            </button>
                          ) : null}
                          {c.status !== 'completed' && c.status !== 'sending' ? (
                            <button
                              type="button"
                              className={s.menuItemDanger}
                              role="menuitem"
                              onClick={() => setConfirmDeleteId(c.id)}
                              disabled={pending}
                            >
                              <Trash2 size={14} aria-hidden /> حذف
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className={s.itemStats}>
                  <div>
                    <span className={s.metric}>ارسال</span>
                    <span className={s.metricVal}>{fmtPersian(c.stats.sent)}</span>
                  </div>
                  <div>
                    <span className={s.metric}>باز شدن</span>
                    <span className={s.metricVal}>{fmtPersian(c.stats.opened)}</span>
                  </div>
                  <div>
                    <span className={s.metric}>کلیک</span>
                    <span className={s.metricVal}>{fmtPersian(c.stats.clicked)}</span>
                  </div>
                  <div>
                    <span className={s.metric}>نرخ باز</span>
                    <span className={s.metricVal}>{fmtPercent(cOpen)}</span>
                  </div>
                  <div>
                    <span className={s.metric}>نرخ کلیک</span>
                    <span className={s.metricVal}>{fmtPercent(cClick)}</span>
                  </div>
                  <div>
                    <span className={s.metric}>زمان‌بندی</span>
                    <span className={s.metricVal}>
                      {c.scheduledAt
                        ? formatDate(c.scheduledAt)
                        : c.startedAt
                          ? formatDate(c.startedAt)
                          : c.completedAt
                            ? formatDate(c.completedAt)
                            : '—'}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="حذف کمپین"
        description="این کمپین به همراه تمام آمار گیرندگان آن برای همیشه حذف خواهد شد."
        confirmLabel="حذف"
        cancelLabel="انصراف"
        variant="danger"
        loading={pending}
        onConfirm={() => {
          if (confirmDeleteId) onDelete(confirmDeleteId);
        }}
      />
    </HubShell>
  );
}
