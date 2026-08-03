'use client';

/**
 * CampaignsList v2 — Campaign Launchpad
 * ساختار: HEADER (eyebrow + title + CTA) → CHANNEL STATS (3 row) → FILTERS → GRID
 * هر کمپین یک کارت با progress visual.
 */

import { LiveDot } from '@/components/Dashboard/PlatformHub';
import { ConfirmDialog, CountUp, EmptyState } from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { MouseEvent } from 'react';
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

const STATUS_TONES: Record<Campaign['status'], 'emerald' | 'indigo' | 'amber' | 'rose' | 'violet'> =
  {
    completed: 'emerald',
    sending: 'indigo',
    scheduled: 'violet',
    paused: 'amber',
    draft: 'rose',
  };

const CHANNEL_META: Record<
  Campaign['channel'],
  { label: string; tone: 'emerald' | 'indigo' | 'amber' | 'violet'; icon: LucideIcon }
> = {
  email: { label: 'ایمیل', tone: 'indigo', icon: Mail },
  sms: { label: 'پیامک', tone: 'amber', icon: Send },
  push: { label: 'Push', tone: 'emerald', icon: Sparkles },
};

const AUDIENCE_LABELS: Record<Campaign['audience'], string> = {
  all: 'همه کاربران',
  role: 'بر اساس نقش',
  segment: 'سگمنت سفارشی',
};

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));
const fmtPercent = (n: number) =>
  n >= 0 && n <= 1 ? `${PERSIAN_NUM((n * 100).toFixed(1))}٪` : `${PERSIAN_NUM(n.toFixed(1))}٪`;

const TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'sending', label: 'در حال ارسال' },
  { id: 'scheduled', label: 'زمان‌بندی' },
  { id: 'completed', label: 'تکمیل شده' },
  { id: 'paused', label: 'متوقف' },
  { id: 'draft', label: 'پیش‌نویس' },
];

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const min = Math.floor((Date.now() - t) / 60_000);
  if (min < 1) return 'همین لحظه';
  if (min < 60) return `${fmtPersian(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${fmtPersian(hr)} ساعت پیش`;
  return `${fmtPersian(Math.floor(hr / 24))} روز پیش`;
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
    payload: { status?: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' } = {},
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
      return { ok: false, message: msg };
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

  // ── stats ──
  const totals = useMemo(() => {
    const acc = {
      sent: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      sending: 0,
      scheduled: 0,
      completed: 0,
      draft: 0,
    };
    for (const c of items) {
      acc.sent += c.stats.sent;
      acc.opened += c.stats.opened;
      acc.clicked += c.stats.clicked;
      acc.bounced += c.stats.bounced;
      if (c.status === 'sending') acc.sending += 1;
      if (c.status === 'scheduled') acc.scheduled += 1;
      if (c.status === 'completed') acc.completed += 1;
      if (c.status === 'draft') acc.draft += 1;
    }
    return acc;
  }, [items]);

  const openRate = totals.sent > 0 ? totals.opened / totals.sent : 0;
  const clickRate = totals.sent > 0 ? totals.clicked / totals.sent : 0;

  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, email: 0, sms: 0, push: 0 };
    for (const c of items) {
      counts.all += 1;
      counts[c.channel] = (counts[c.channel] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  // ── filter ──
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
          c.body.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, tab, channel, query]);

  return (
    <div className={s.page} dir="rtl">
      {/* ═══ HEADER ═══════════════════════════════════════ */}
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
            کمپین‌ها
          </span>
        </nav>

        <div className={s.headerMain}>
          <div className={s.headerMainLeft}>
            <span className={s.eyebrow}>
              <LiveDot tone="emerald" size="sm" />
              سکوی پرتاب کمپین
            </span>
            <h1 className={s.title}>کمپین‌ها، در گردش.</h1>
            <p className={s.lead}>
              ایمیل، پیامک، Push — هر کمپین یک پرتاب. پیشرفت، نرخ باز شدن، کلیک.
            </p>
          </div>
          <div className={s.headerMainRight}>
            <Button variant="outline" asChild>
              <Link href="/dashboard/communication">
                <Zap size={14} aria-hidden />
                مرکز
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/communication/campaigns/new">
                <Plus size={14} aria-hidden />
                کمپین جدید
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ TOP STATS (4 stat blocks horizontal) ═════════ */}
      <div className={s.statStrip}>
        <div className={s.statBlock} data-tone="emerald">
          <span className={s.statLabel}>ارسال‌های کل</span>
          <span className={s.statValue}>
            <CountUp value={totals.sent} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>{fmtPercent(openRate)} نرخ باز شدن</span>
        </div>
        <div className={s.statBlock} data-tone="indigo">
          <span className={s.statLabel}>در حال ارسال</span>
          <span className={s.statValue}>
            <CountUp value={totals.sending} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>{fmtPersian(totals.scheduled)} در صف</span>
        </div>
        <div className={s.statBlock} data-tone="violet">
          <span className={s.statLabel}>کلیک‌ها</span>
          <span className={s.statValue}>
            <CountUp value={totals.clicked} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>{fmtPercent(clickRate)} نرخ کلیک</span>
        </div>
        <div className={s.statBlock} data-tone="rose">
          <span className={s.statLabel}>بازگشتی</span>
          <span className={s.statValue}>
            <CountUp value={totals.bounced} duration={700} locale="fa-IR" />
          </span>
          <span className={s.statMeta}>از کل ارسال‌ها</span>
        </div>
      </div>

      {/* ═══ CHANNEL TOWERS (3 vertical) ═══════════════════ */}
      <div className={s.channelStrip}>
        {(Object.keys(CHANNEL_META) as Array<keyof typeof CHANNEL_META>).map((key) => {
          const ch = CHANNEL_META[key];
          const Icon = ch.icon;
          const sentByChannel = items
            .filter((c) => c.channel === key)
            .reduce((sum, c) => sum + c.stats.sent, 0);
          const maxSent = Math.max(
            ...(Object.keys(CHANNEL_META) as Array<keyof typeof CHANNEL_META>).map((k) =>
              items.filter((c) => c.channel === k).reduce((s, c) => s + c.stats.sent, 0),
            ),
            1,
          );
          const ratio = Math.max(0.04, Math.min(1, sentByChannel / maxSent));
          return (
            <button
              key={key}
              type="button"
              className={s.channelBlock}
              data-tone={ch.tone}
              data-active={channel === key}
              onClick={() => setChannel(channel === key ? 'all' : key)}
              aria-pressed={channel === key}
            >
              <div className={s.channelHead}>
                <span className={s.channelIcon} aria-hidden>
                  <Icon size={14} />
                </span>
                <div className={s.channelBody}>
                  <span className={s.channelLabel}>{ch.label}</span>
                  <span className={s.channelCount}>
                    {fmtPersian(channelCounts[key] ?? 0)} کمپین
                  </span>
                </div>
              </div>
              <div className={s.channelBar} aria-hidden>
                <span className={s.channelBarFill} style={{ width: `${ratio * 100}%` }} />
              </div>
              <div className={s.channelFooter}>
                <span className={s.channelSent}>{fmtPersian(sentByChannel)}</span>
                <span className={s.channelSentUnit}>ارسال</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ CONTROLS ═══════════════════════════════════ */}
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
      </div>

      {actionError ? <div className={s.error}>{actionError}</div> : null}

      {/* ═══ GRID ═══════════════════════════════════════ */}
      {filtered.length === 0 ? (
        <EmptyState
          title="کمپینی یافت نشد"
          description="فیلتر یا جستجوی خود را تغییر دهید."
          icon={Sparkles}
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/communication/campaigns/new">
                <Plus size={14} aria-hidden />
                کمپین جدید
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className={s.grid}>
          {filtered.map((c) => {
            const meta = CHANNEL_META[c.channel];
            const Icon = meta.icon;
            const tone = STATUS_TONES[c.status];
            const cOpen = c.stats.sent > 0 ? c.stats.opened / c.stats.sent : 0;
            const cClick = c.stats.sent > 0 ? c.stats.clicked / c.stats.sent : 0;
            return (
              <li key={c.id} className={s.card} data-tone={meta.tone}>
                <Link
                  href={`/dashboard/communication/campaigns/${c.id}`}
                  className={s.cardLink}
                  aria-label={`جزئیات ${c.name}`}
                />
                <header className={s.cardHead}>
                  <div className={s.cardHeadMain}>
                    <span className={s.cardGlyph} data-channel={c.channel}>
                      <Icon size={14} aria-hidden />
                    </span>
                    <div className={s.cardTitleBlock}>
                      <h2 className={s.cardTitle}>{c.name}</h2>
                      <p className={s.cardSub}>{c.subject ?? c.description ?? meta.label}</p>
                    </div>
                  </div>
                  <div className={s.cardHeadRight}>
                    <span className={s.status} data-tone={tone}>
                      <LiveDot tone={tone} size="xs" />
                      {STATUS_LABELS[c.status]}
                    </span>
                    <div className={s.menuWrap}>
                      <button
                        type="button"
                        className={s.menuBtn}
                        onClick={(e: MouseEvent) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId((v) => (v === c.id ? null : c.id));
                        }}
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
                            onClick={(e: MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(null);
                            }}
                          >
                            <Eye size={14} aria-hidden /> مشاهده جزئیات
                          </Link>
                          {c.status === 'draft' ||
                          c.status === 'scheduled' ||
                          c.status === 'paused' ? (
                            <button
                              type="button"
                              className={s.menuItem}
                              role="menuitem"
                              onClick={(e: MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onStatusChange(c.id, 'sending');
                              }}
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
                              onClick={(e: MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onStatusChange(c.id, 'paused');
                              }}
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
                              onClick={(e: MouseEvent) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmDeleteId(c.id);
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
                </header>

                {/* progress bar — visual differentiator */}
                <div className={s.progress} aria-hidden>
                  <span
                    className={s.progressFill}
                    style={{
                      width: c.stats.sent > 0 ? `${Math.min(cOpen * 100, 100)}%` : '0%',
                    }}
                  />
                </div>

                <div className={s.metrics}>
                  <div className={s.metric}>
                    <span className={s.metricKey}>ارسال</span>
                    <span className={s.metricVal}>{fmtPersian(c.stats.sent)}</span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricKey}>باز شدن</span>
                    <span className={s.metricVal}>{fmtPercent(cOpen)}</span>
                  </div>
                  <div className={s.metric}>
                    <span className={s.metricKey}>کلیک</span>
                    <span className={s.metricVal}>{fmtPercent(cClick)}</span>
                  </div>
                </div>

                <footer className={s.cardFoot}>
                  <span className={s.footItem}>
                    <Users size={10} aria-hidden />
                    {AUDIENCE_LABELS[c.audience]}
                  </span>
                  <span className={s.footTime}>
                    {formatRelative(c.completedAt ?? c.startedAt ?? c.scheduledAt ?? c.createdAt)}
                  </span>
                </footer>
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
    </div>
  );
}
