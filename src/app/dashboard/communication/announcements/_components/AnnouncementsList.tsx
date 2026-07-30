'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ChevronLeft,
  Eye,
  Megaphone,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import {
  FilterPills,
  type FilterPillItem,
  HubShell,
  LiveDot,
  type PillTabItem,
  type TimeRibbonPoint,
  TimeRibbon,
} from '@/components/Dashboard/PlatformHub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ConfirmDialog,
  EmptyState,
} from '@/components/Dashboard/primitives';
import s from './Announcements.module.css';

type Announcement = {
  id: string;
  title: string;
  body: string;
  channels: ('inapp' | 'email' | 'push' | 'sms')[];
  audience: 'all' | 'role' | 'segment';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

interface AnnouncementsListProps {
  items: Announcement[];
}

const STATUS_LABELS: Record<Announcement['status'], string> = {
  published: 'منتشر شده',
  scheduled: 'زمان‌بندی',
  draft: 'پیش‌نویس',
  archived: 'آرشیو',
};

const STATUS_TONES: Record<Announcement['status'], 'emerald' | 'indigo' | 'amber' | 'rose' | 'neutral'> = {
  published: 'emerald',
  scheduled: 'indigo',
  draft: 'amber',
  archived: 'rose',
};

const AUDIENCE_LABELS: Record<Announcement['audience'], string> = {
  all: 'همه کاربران',
  role: 'بر اساس نقش',
  segment: 'سگمنت سفارشی',
};

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

const TABS: PillTabItem[] = [
  { id: 'all', label: 'همه' },
  { id: 'published', label: 'منتشر شده' },
  { id: 'scheduled', label: 'زمان‌بندی' },
  { id: 'draft', label: 'پیش‌نویس' },
  { id: 'archived', label: 'آرشیو' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const CHANNEL_LABELS: Record<'inapp' | 'email' | 'push' | 'sms', string> = {
  inapp: 'In-app',
  email: 'Email',
  push: 'Push',
  sms: 'SMS',
};

export function AnnouncementsList({ items }: AnnouncementsListProps) {
  const router = useRouter();
  const [tab, setTab] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [channel, setChannel] = useState<string>('all');
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const channelFilters: FilterPillItem[] = useMemo(() => {
    const counts: Record<string, number> = { all: 0, push: 0, email: 0, sms: 0, inapp: 0 };
    for (const a of items) {
      counts.all += 1;
      for (const c of a.channels) counts[c] = (counts[c] ?? 0) + 1;
    }
    return [
      { id: 'all', label: 'همه کانال‌ها', count: counts.all },
      { id: 'push', label: 'Push', count: counts.push, tone: 'emerald' },
      { id: 'email', label: 'Email', count: counts.email, tone: 'indigo' },
      { id: 'sms', label: 'SMS', count: counts.sms, tone: 'amber' },
      { id: 'inapp', label: 'In-app', count: counts.inapp, tone: 'violet' },
    ];
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (tab !== 'all') {
      result = result.filter((a) => a.status === tab);
    }
    if (channel !== 'all') {
      result = result.filter((a) => a.channels.includes(channel as 'inapp' | 'email' | 'push' | 'sms'));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, tab, channel, query]);

  const distribution = useMemo(() => {
    const days = 7;
    const result: number[] = new Array(days).fill(0);
    for (const a of items) {
      if (a.publishedAt) {
        const daysAgo = Math.floor((Date.now() - new Date(a.publishedAt).getTime()) / 86_400_000);
        if (daysAgo >= 0 && daysAgo < days) {
          result[days - 1 - daysAgo] += 1;
        }
      }
    }
    return result;
  }, [items]);

  const ribbonPoints: TimeRibbonPoint[] = distribution.map((value, i) => ({
    t: Date.now() - (distribution.length - 1 - i) * 86_400_000,
    value,
  }));

  const runAction = async (
    id: string,
    path: string,
    method: 'POST' | 'DELETE' = 'POST',
  ): Promise<{ ok: boolean; message?: string }> => {
    setActionError(null);
    try {
      const res = await fetch(path, { method });
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

  const onPublish = (id: string) => {
    setOpenMenuId(null);
    startTransition(async () => {
      const r = await runAction(id, `/api/communication/announcements/${id}/publish`);
      if (r.ok) router.refresh();
    });
  };

  const onArchive = (id: string) => {
    setOpenMenuId(null);
    startTransition(async () => {
      const r = await runAction(id, `/api/communication/announcements/${id}/archive`);
      if (r.ok) router.refresh();
    });
  };

  const onDelete = (id: string) => {
    setConfirmDeleteId(null);
    setOpenMenuId(null);
    startTransition(async () => {
      const r = await runAction(id, `/api/communication/announcements/${id}`, 'DELETE');
      if (r.ok) router.refresh();
    });
  };

  return (
    <HubShell
      meta={{
        eyebrow: 'مرکز ارتباطات',
        title: 'اعلان‌ها',
        subtitle: 'همه اعلان‌های پلتفرم در یک نما. فیلتر بر اساس وضعیت، کانال و جستجو.',
        breadcrumb: [
          { href: '/dashboard', label: 'داشبورد' },
          { href: '/dashboard/communication', label: 'مرکز ارتباطات' },
          { label: 'اعلان‌ها' },
        ],
        badges: [
          { label: `${fmtPersian(items.length)} اعلان`, tone: 'emerald' },
        ],
        actions: (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/communication">
                <ChevronLeft size={14} aria-hidden />
                مرکز
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/communication/announcements/new">
                <Plus size={14} aria-hidden />
                اعلان جدید
              </Link>
            </Button>
          </>
        ),
      }}
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      <section className={s.toolbar}>
        <div className={s.searchWrap}>
          <Search size={16} aria-hidden className={s.searchIcon} />
          <Input
            type="search"
            className={s.search}
            placeholder="جستجو در عنوان یا متن…"
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

      {ribbonPoints.some((p) => p.value > 0) ? (
        <div className={s.ribbon}>
          <div className={s.ribbonHead}>
            <span className={s.ribbonTitle}>روند انتشار ۷ روز اخیر</span>
            <span className={s.ribbonTotal}>{fmtPersian(distribution.reduce((a, b) => a + b, 0))} اعلان</span>
          </div>
          <TimeRibbon points={ribbonPoints} height={80} tone="emerald" />
        </div>
      ) : null}

      {actionError ? <div className={s.error}>{actionError}</div> : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="اعلانی یافت نشد"
          description="فیلتر یا جستجوی خود را تغییر دهید."
          icon={Megaphone}
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/communication/announcements/new">
                <Plus size={14} aria-hidden />
                اعلان جدید
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className={s.list}>
          {filtered.map((a) => {
            const tone = STATUS_TONES[a.status];
            const dateIso = a.publishedAt ?? a.scheduledAt ?? a.createdAt;
            return (
              <li key={a.id} className={s.item} data-status={a.status}>
                <Link
                  href={`/dashboard/communication/announcements/${a.id}`}
                  className={s.itemLink}
                  aria-label={`مشاهده جزئیات ${a.title}`}
                />
                <div className={s.itemHead}>
                  <div className={s.itemTitleBlock}>
                    <div className={s.itemTitle}>{a.title}</div>
                    <div className={s.itemChannels} aria-label="کانال‌ها">
                      {a.channels.map((c) => (
                        <span key={c} className={s.channelChip}>
                          {CHANNEL_LABELS[c]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={s.itemHeadRight}>
                    <span className={s.status} data-tone={tone}>
                      {STATUS_LABELS[a.status]}
                    </span>
                    <div className={s.menuWrap}>
                      <button
                        type="button"
                        className={s.menuBtn}
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenMenuId((v) => (v === a.id ? null : a.id));
                        }}
                        aria-label="عملیات بیشتر"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === a.id}
                      >
                        <MoreHorizontal size={16} aria-hidden />
                      </button>
                      {openMenuId === a.id ? (
                        <div className={s.menu} role="menu">
                          <Link
                            href={`/dashboard/communication/announcements/${a.id}`}
                            className={s.menuItem}
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                            }}
                          >
                            <Eye size={14} aria-hidden /> مشاهده جزئیات
                          </Link>
                          {a.status === 'draft' || a.status === 'scheduled' ? (
                            <button
                              type="button"
                              className={s.menuItem}
                              role="menuitem"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onPublish(a.id);
                              }}
                              disabled={pending}
                            >
                              <Send size={14} aria-hidden /> انتشار فوری
                            </button>
                          ) : null}
                          {a.status !== 'archived' ? (
                            <button
                              type="button"
                              className={s.menuItem}
                              role="menuitem"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onArchive(a.id);
                              }}
                              disabled={pending}
                            >
                              <Archive size={14} aria-hidden /> بایگانی
                            </button>
                          ) : null}
                          {a.status === 'draft' || a.status === 'archived' ? (
                            <button
                              type="button"
                              className={s.menuItemDanger}
                              role="menuitem"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmDeleteId(a.id);
                              }}
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
                <p className={s.itemBody}>{a.body}</p>
                <div className={s.itemMeta}>
                  <span>
                    <span className={s.metaKey}>مخاطب</span>
                    <span className={s.metaVal}>{AUDIENCE_LABELS[a.audience]}</span>
                  </span>
                  <span>
                    <span className={s.metaKey}>تاریخ</span>
                    <span className={s.metaVal}>{formatDate(dateIso)}</span>
                  </span>
                  <span>
                    <span className={s.metaKey}>ساعت</span>
                    <span className={s.metaVal}>{formatTime(dateIso)}</span>
                  </span>
                  {a.scheduledAt && !a.publishedAt ? (
                    <span className={s.metaScheduled}>
                      <LiveDot tone="indigo" size="xs" /> زمان‌بندی شده
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="حذف اعلان"
        description="این اعلان برای همیشه حذف خواهد شد. این عملیات برگشت‌پذیر نیست."
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
