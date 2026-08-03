'use client';

/**
 * HelpdeskHub — orchestrator اصلی صفحه‌ی helpdesk.
 * -----------------------------------------------------------------
 *  چیدمان (mobile-first):
 *   1. Hero (PriorityOrbit signature) + headline stats (right rail)
 *   2. Toolbar: search + filter pills + primary CTA "تیکت جدید"
 *   3. Workspace (2 ستونه از md:):
 *        - left: TicketList
 *        - right: rail (status mix donut-style + recent activity)
 *   4. Footer/empty
 *   5. Drawers: TicketDetail + NewTicketForm (mounted در root)
 *
 *  داده: initialTickets از server، بعد از هر تغییر fetch خودکار.
 *  polling: هر ۳۰ ثانیه snapshot جدید.
 */

import { PillTabs } from '@/components/Dashboard/PlatformHub';
import { ActivityStream } from '@/components/Dashboard/PlatformHub/ActivityStream';
import { MetricWall, type MetricWallTile } from '@/components/Dashboard/PlatformHub/MetricWall';
import { PageHeader } from '@/components/Dashboard/primitives';
import type { TicketPriority, TicketStatus, TicketSummary } from '@/lib/tickets';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './HelpdeskHub.module.css';
import { NewTicketForm } from './NewTicketForm';
import {
  type OrbitPriority,
  type OrbitStatus,
  type OrbitTicket,
  PriorityOrbit,
} from './PriorityOrbit';
import { TicketDetail } from './TicketDetail';
import { TicketList } from './TicketList';

interface HelpdeskHubProps {
  initialTickets: TicketSummary[];
}

const PRIORITY_FILTERS: Array<{ id: 'all' | TicketPriority; label: string }> = [
  { id: 'all', label: 'همه' },
  { id: 'urgent', label: 'فوری' },
  { id: 'high', label: 'بالا' },
  { id: 'normal', label: 'معمولی' },
  { id: 'low', label: 'کم' },
];

const STATUS_FILTERS: Array<{ id: 'all' | TicketStatus; label: string }> = [
  { id: 'all', label: 'همه وضعیت‌ها' },
  { id: 'open', label: 'باز' },
  { id: 'pending', label: 'منتظر' },
  { id: 'in_progress', label: 'در حال بررسی' },
  { id: 'resolved', label: 'حل شده' },
  { id: 'closed', label: 'بسته' },
];

function toPersianNumber(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function avgFirstResponse(tickets: TicketSummary[]): string {
  const responded = tickets.filter((t) => t.firstResponseAt);
  if (responded.length === 0) return '—';
  const total = responded.reduce((sum, t) => {
    const diff = new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime();
    return sum + (Number.isFinite(diff) ? diff : 0);
  }, 0);
  const avg = total / responded.length;
  const minutes = Math.round(avg / 60_000);
  if (minutes < 60) return `${toPersianNumber(minutes)} دقیقه`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain === 0
    ? `${toPersianNumber(hours)} ساعت`
    : `${toPersianNumber(hours)}:۰${toPersianNumber(remain)}`;
}

export function HelpdeskHub({ initialTickets }: HelpdeskHubProps) {
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<TicketSummary[]>(initialTickets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [query, setQuery] = useState('');
  // ?new=1 از /dashboard/helpdesk/new ریدایرکت می‌کند — drawer را خودکار باز کن
  const [newTicketOpen, setNewTicketOpen] = useState(() => searchParams.get('new') === '1');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // یک‌بار پس از mount، URL را تمیز کن
  useEffect(() => {
    if (searchParams.get('new') === '1' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── polling 30s برای تازه‌سازی snapshot (از route API) ─────
  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets/snapshot', { cache: 'no-store' });
      const json = (await res.json()) as { success: boolean; data?: TicketSummary[] };
      if (json.success && Array.isArray(json.data)) {
        setTickets(json.data);
      }
    } catch {
      // silent — polling خطاپذیر است
    }
  }, []);

  useEffect(() => {
    const start = () => {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(() => void refresh(), 30_000);
    };
    const stop = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
    // بهینه‌سازی: polling وقتی tab پنهان است متوقف می‌شود
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void refresh();
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  // ── derived: orbit nodes ──────────────────────────────
  const orbitNodes = useMemo<OrbitTicket[]>(
    () =>
      tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        priority: t.priority as OrbitPriority,
        status: t.status as OrbitStatus,
      })),
    [tickets],
  );

  // ── derived: filtered list ────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return t.subject.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    });
  }, [tickets, priorityFilter, statusFilter, query]);

  // ── derived: stats ────────────────────────────────────
  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length;
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const urgent = tickets.filter(
      (t) => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved',
    ).length;
    const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    return { open, pending, inProgress, urgent, resolved, total: tickets.length };
  }, [tickets]);

  const avgFR = useMemo(() => avgFirstResponse(tickets), [tickets]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  // ── activity items (از آخرین تغییرات — اختیاری) ────────
  const activityItems = useMemo(() => {
    return [...tickets]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        title: t.subject,
        at: t.updatedAt,
        meta: `${t.messageCount} پیام`,
        tone:
          t.priority === 'urgent'
            ? ('rose' as const)
            : t.priority === 'high'
              ? ('amber' as const)
              : ('cyan' as const),
      }));
  }, [tickets]);

  // ── status mix (donut-like برای legend) ────────────────
  const statusMix = useMemo(() => {
    const total = Math.max(stats.total, 1);
    return [
      { key: 'open', label: 'باز', value: stats.open, ratio: stats.open / total, tone: 'cyan' },
      {
        key: 'pending',
        label: 'منتظر',
        value: stats.pending,
        ratio: stats.pending / total,
        tone: 'amber',
      },
      {
        key: 'in_progress',
        label: 'در حال بررسی',
        value: stats.inProgress,
        ratio: stats.inProgress / total,
        tone: 'indigo',
      },
      {
        key: 'resolved',
        label: 'حل/بسته',
        value: stats.resolved,
        ratio: stats.resolved / total,
        tone: 'emerald',
      },
    ] as const;
  }, [stats]);

  // ── handlers ──────────────────────────────────────────
  const handleOrbitSelect = useCallback((id: string) => setSelectedId(id), []);

  const handleCloseDetail = useCallback(() => setSelectedId(null), []);

  const handleChanged = useCallback(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className={s.hub}>
      {/* ── Hero zone ──────────────────────────────────── */}
      <section className={s.hero} aria-labelledby="helpdesk-hero-title">
        <PageHeader
          variant="minimal"
          eyebrow="مرکز پشتیبانی"
          title="صندوق اولویت"
          description="نمای پروازی تیکت‌ها بر اساس اولویت و وضعیت. هر ۳۰ ثانیه تازه‌سازی می‌شود."
        />
        <div className={s.heroGrid}>
          <div className={s.orbitWrap}>
            <PriorityOrbit
              tickets={orbitNodes}
              onSelect={handleOrbitSelect}
              selectedId={selectedId}
              ariaLabel="مدار اولویت تیکت‌ها"
            />
          </div>
          <div className={s.statsWrap}>
            <MetricWall
              tiles={
                [
                  {
                    id: 'avg-fr',
                    label: 'میانگین اولین پاسخ',
                    value: avgFR,
                    tone: 'violet',
                    emphasis: 'hero',
                  },
                  {
                    id: 'urgent',
                    label: 'فوری باز',
                    value: toPersianNumber(stats.urgent),
                    tone: 'rose',
                  },
                  {
                    id: 'open',
                    label: 'در جریان',
                    value: toPersianNumber(stats.open + stats.inProgress),
                    tone: 'amber',
                  },
                  {
                    id: 'total',
                    label: 'کل تیکت‌ها',
                    value: toPersianNumber(stats.total),
                    tone: 'cyan',
                  },
                ] as MetricWallTile[]
              }
            />
          </div>
        </div>
      </section>

      {/* ── Toolbar zone ───────────────────────────────── */}
      <section className={s.toolbar} aria-label="ابزار">
        <div className={s.searchWrap}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در تیکت‌ها..."
            className={s.search}
            dir="rtl"
            aria-label="جستجو"
          />
        </div>
        <div className={s.pillsWrap}>
          <PillTabs
            tabs={PRIORITY_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
            active={priorityFilter}
            onChange={(v) => setPriorityFilter(v as 'all' | TicketPriority)}
            size="sm"
            ariaLabel="فیلتر اولویت"
          />
          <PillTabs
            tabs={STATUS_FILTERS.map((f) => ({ id: f.id, label: f.label }))}
            active={statusFilter}
            onChange={(v) => setStatusFilter(v as 'all' | TicketStatus)}
            size="sm"
            ariaLabel="فیلتر وضعیت"
          />
        </div>
        <div className={s.ctaWrap}>
          <button
            type="button"
            onClick={() => setNewTicketOpen(true)}
            className={s.cta}
            aria-label="تیکت جدید"
          >
            <span className={s.ctaIcon} aria-hidden>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            تیکت جدید
          </button>
        </div>
      </section>

      {/* ── Workspace zone ─────────────────────────────── */}
      <section className={s.workspace} aria-label="صندوق">
        <div className={s.workspaceList}>
          <header className={s.workspaceHeader}>
            <h2 className={s.workspaceTitle}>
              فهرست تیکت‌ها
              <span className={s.workspaceCount}>({toPersianNumber(filtered.length)})</span>
            </h2>
            {selectedId ? (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className={s.workspaceClear}
              >
                پاک کردن انتخاب
              </button>
            ) : null}
          </header>
          <TicketList
            tickets={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyHint={query ? 'نتیجه‌ای برای جستجوی شما یافت نشد.' : 'تیکتی با این فیلتر یافت نشد.'}
          />
        </div>
        <aside className={s.workspaceRail} aria-label="نوار کناری">
          <div className={s.railCard}>
            <h3 className={s.railTitle}>ترکیب وضعیت</h3>
            <ul className={s.statusMix}>
              {statusMix.map((m) => (
                <li key={m.key} className={s.statusMixItem}>
                  <div className={s.statusMixHead}>
                    <span className={s.statusMixLabel}>
                      <span className={s.statusMixDot} data-tone={m.tone} aria-hidden />
                      {m.label}
                    </span>
                    <span className={s.statusMixValue}>{toPersianNumber(m.value)}</span>
                  </div>
                  <div className={s.statusMixBar} aria-hidden>
                    <div
                      className={s.statusMixFill}
                      data-tone={m.tone}
                      style={{ width: `${Math.max(2, m.ratio * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className={s.railCard}>
            <h3 className={s.railTitle}>آخرین تغییرات</h3>
            <ActivityStream items={activityItems} />
          </div>
        </aside>
      </section>

      {/* ── Drawers ────────────────────────────────────── */}
      <TicketDetail ticket={selectedTicket} onClose={handleCloseDetail} onChanged={handleChanged} />
      <NewTicketForm
        open={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        onCreated={handleChanged}
      />
    </div>
  );
}
