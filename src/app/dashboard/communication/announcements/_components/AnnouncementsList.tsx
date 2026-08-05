'use client';

/**
 * AnnouncementsList v2 — Editorial List
 * ─────────────────────────────────────────────────────────────────
 * فهرست اعلان‌ها با ساختار editorial:
 *   1. HEADER strip (eyebrow + title + primary action)
 *   2. CONTROL row (tabs + search + filter)
 *   3. STAT row (3 stat blocks)
 *   4. LIST — هر اعلان = افقی: index/title/eyebrow/...
 *
 * تک‌zone، max ۳ tone، ۲ motion (LiveDot + CountUp).
 */

import {
  type FilterPillItem,
  FilterPills,
  LiveDot,
  type PillTabItem,
  TimeRibbon,
  type TimeRibbonPoint,
} from '@/components/Dashboard/PlatformHub';
import { ConfirmDialog, CountUp, EmptyState, SearchInput } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { MouseEvent } from 'react';
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

const STATUS_TONES: Record<Announcement['status'], 'emerald' | 'indigo' | 'amber' | 'rose'> = {
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
const fmt = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

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

  // ── counts ──────────────────────────────────────────────
  const counts = useMemo(() => {
    return {
      all: items.length,
      published: items.filter((a) => a.status === 'published').length,
      scheduled: items.filter((a) => a.status === 'scheduled').length,
      draft: items.filter((a) => a.status === 'draft').length,
      archived: items.filter((a) => a.status === 'archived').length,
    };
  }, [items]);

  const channelFilters: FilterPillItem[] = useMemo(() => {
    const map: Record<string, number> = { all: 0, push: 0, email: 0, sms: 0, inapp: 0 };
    for (const a of items) {
      map.all += 1;
      for (const c of a.channels) map[c] = (map[c] ?? 0) + 1;
    }
    return [
      { id: 'all', label: 'همه کانال‌ها', count: map.all },
      { id: 'push', label: 'Push', count: map.push, tone: 'emerald' },
      { id: 'email', label: 'Email', count: map.email, tone: 'indigo' },
      { id: 'sms', label: 'SMS', count: map.sms, tone: 'amber' },
      { id: 'inapp', label: 'In-app', count: map.inapp, tone: 'violet' },
    ];
  }, [items]);

  // ── filter ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = items;
    if (tab !== 'all') {
      result = result.filter((a) => a.status === tab);
    }
    if (channel !== 'all') {
      result = result.filter((a) =>
        a.channels.includes(channel as 'inapp' | 'email' | 'push' | 'sms'),
      );
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, tab, channel, query]);

  // ── distribution (7d) ──────────────────────────────────
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

  // ── actions ─────────────────────────────────────────────
  const runAction = async (
    _id: string,
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
      return { ok: false, message: msg };
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
    <div className={s.page} dir="rtl">
      {/* ═══ HEADER STRIP ═══════════════════════════════════ */}
      <header className={s.header}>
        <nav className={s.crumbs} aria-label="مسیر">
          <Link href="/dashboard" className={s.crumbLink}>
            داشبورد
          </Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication" className={s.crumbLink}>
            مرکز ارتباطات
          </Link>
          <span className={s.crumbSep}>/</span>
          <span className={s.crumbCurrent} aria-current="page">
            اعلان‌ها
          </span>
        </nav>

        <div className={s.headerMain}>
          <div className={s.headerMainLeft}>
            <span className={s.eyebrow}>
              <LiveDot tone="emerald" size="sm" />
              فهرست اعلان‌ها
            </span>
            <h1 className={s.title}>صدای پلتفرم، در یک نما.</h1>
            <p className={s.lead}>
              {fmt(items.length)} اعلان — از پیش‌نویس تا آرشیو. فیلتر، جستجو، و اقدام سریع.
            </p>
          </div>
          <div className={s.headerMainRight}>
            <Button variant="outline" asChild>
              <Link href="/dashboard/communication">
                <ChevronLeft size={14} aria-hidden />
                مرکز
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/communication/announcements/new">
                <Plus size={14} aria-hidden />
                اعلان جدید
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ STAT STRIP (3 stat blocks) ════════════════════════ */}
      <div className={s.statStrip}>
        <div className={s.statBlock} data-tone="emerald">
          <span className={s.statLabel}>منتشر شده</span>
          <span className={s.statValue}>
            <CountUp value={counts.published} duration={600} locale="fa-IR" />
          </span>
        </div>
        <div className={s.statBlock} data-tone="indigo">
          <span className={s.statLabel}>زمان‌بندی‌شده</span>
          <span className={s.statValue}>
            <CountUp value={counts.scheduled} duration={600} locale="fa-IR" />
          </span>
        </div>
        <div className={s.statBlock} data-tone="amber">
          <span className={s.statLabel}>پیش‌نویس</span>
          <span className={s.statValue}>
            <CountUp value={counts.draft} duration={600} locale="fa-IR" />
          </span>
        </div>
        <div className={s.statBlock} data-tone="rose">
          <span className={s.statLabel}>آرشیو</span>
          <span className={s.statValue}>
            <CountUp value={counts.archived} duration={600} locale="fa-IR" />
          </span>
        </div>
      </div>

      {/* ═══ CONTROL ROW ═══════════════════════════════════ */}
      <div className={s.controls}>
        <div className={s.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={s.tab}
              data-active={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="جستجو در عنوان یا متن…"
          ariaLabel="جستجو در اعلان‌ها"
        />
        <FilterPills
          items={channelFilters}
          active={channel}
          onChange={setChannel}
          ariaLabel="فیلتر کانال"
        />
      </div>

      {/* ═══ RIBBON (7d trend) ═══════════════════════════════ */}
      {ribbonPoints.some((p) => p.value > 0) ? (
        <div className={s.ribbon}>
          <div className={s.ribbonHead}>
            <span className={s.ribbonTitle}>روند انتشار ۷ روز اخیر</span>
            <span className={s.ribbonTotal}>
              {fmt(distribution.reduce((a, b) => a + b, 0))} اعلان
            </span>
          </div>
          <TimeRibbon points={ribbonPoints} height={72} tone="emerald" />
        </div>
      ) : null}

      {actionError ? <div className={s.error}>{actionError}</div> : null}

      {/* ═══ LIST ═════════════════════════════════════════ */}
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
          {filtered.map((a, idx) => {
            const tone = STATUS_TONES[a.status];
            const dateIso = a.publishedAt ?? a.scheduledAt ?? a.createdAt;
            return (
              <li key={a.id} className={s.item} data-status={a.status}>
                <Link
                  href={`/dashboard/communication/announcements/${a.id}`}
                  className={s.itemLink}
                  aria-label={`مشاهده جزئیات ${a.title}`}
                />
                <div className={s.itemIndex} aria-hidden>
                  <span className={s.itemIndexNum}>{fmt(idx + 1)}</span>
                  <span className={s.itemIndexLine} />
                </div>
                <div className={s.itemBody}>
                  <div className={s.itemHead}>
                    <div className={s.itemTitleBlock}>
                      <h2 className={s.itemTitle}>{a.title}</h2>
                      <p className={s.itemSub}>{a.body}</p>
                    </div>
                    <div className={s.itemHeadRight}>
                      <span className={s.status} data-tone={tone}>
                        <LiveDot tone={tone} size="xs" />
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
                              onClick={(e: MouseEvent) => {
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
                  <div className={s.itemFoot}>
                    <div className={s.itemMeta}>
                      <div className={s.metaItem}>
                        <span className={s.metaKey}>کانال‌ها</span>
                        <div className={s.channels} aria-label="کانال‌ها">
                          {a.channels.map((c) => (
                            <span key={c} className={s.channelChip} data-channel={c}>
                              {CHANNEL_LABELS[c]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={s.metaItem}>
                        <span className={s.metaKey}>مخاطب</span>
                        <span className={s.metaVal}>{AUDIENCE_LABELS[a.audience]}</span>
                      </div>
                      <div className={s.metaItem}>
                        <span className={s.metaKey}>تاریخ</span>
                        <span className={s.metaVal}>{formatDate(dateIso)}</span>
                      </div>
                      <div className={s.metaItem}>
                        <span className={s.metaKey}>ساعت</span>
                        <span className={s.metaVal}>{formatTime(dateIso)}</span>
                      </div>
                    </div>
                    {a.scheduledAt && !a.publishedAt ? (
                      <span className={s.metaScheduled}>
                        <LiveDot tone="indigo" size="xs" /> زمان‌بندی شده
                      </span>
                    ) : null}
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
    </div>
  );
}
