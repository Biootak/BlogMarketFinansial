'use client';

/**
 * HelpdeskHub — orchestrator اصلی صفحه‌ی helpdesk.
 * -----------------------------------------------------------------
 *  چیدمان (mobile-first):
 *   1. Hero (PriorityOrbit signature + headline stats + SLA meter)
 *   2. Toolbar: search + filter pills (با شمارنده) + primary CTA "تیکت جدید"
 *   3. Workspace (۲ ستونه از md:):
 *        - left: TicketList
 *        - right: rail (status mix + recent activity)
 *   4. Drawers: TicketDetail + NewTicketForm (mounted در root)
 *
 *  داده: initialTickets از server، بعد از هر تغییر fetch خودکار.
 *  polling: هر ۳۰ ثانیه snapshot جدید.
 */

import { PillTabs } from '@/components/Dashboard/PlatformHub';
import { ActivityStream } from '@/components/Dashboard/PlatformHub/ActivityStream';
import { Sparkline } from '@/components/Dashboard/PlatformHub/Sparkline';
import { PageHeader, SearchInput } from '@/components/Dashboard/primitives';
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

/** SLA target per priority (hours) — منطبق با فرم تیکت جدید */
const SLA_HOURS: Record<TicketPriority, number> = {
  urgent: 2,
  high: 8,
  normal: 24,
  low: 48,
};

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

/** درصد برآورده‌شدن SLA — تیکت‌هایی که اولین پاسخ در بازه‌ی وعده‌داده‌شده بوده */
function slaAdherence(tickets: TicketSummary[]): number | null {
  const responded = tickets.filter((t) => t.firstResponseAt);
  if (responded.length === 0) return null;
  let met = 0;
  for (const t of responded) {
    const target = SLA_HOURS[t.priority] * 3_600_000;
    const diff = new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime();
    if (Number.isFinite(diff) && diff <= target) met++;
  }
  return Math.round((met / responded.length) * 100);
}

/** تعداد تیکت‌های فعالِ در معرض خطر SLA (از بازه گذشته) */
function atRiskCount(tickets: TicketSummary[]): number {
  const now = Date.now();
  return tickets.filter((t) => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    if (t.firstResponseAt) return false; // پاسخ داده شده — دیگر بحرانی نیست
    const target = SLA_HOURS[t.priority] * 3_600_000;
    const age = now - new Date(t.createdAt).getTime();
    return Number.isFinite(age) && age > target;
  }).length;
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
  const sla = useMemo(() => slaAdherence(tickets), [tickets]);
  const atRisk = useMemo(() => atRiskCount(tickets), [tickets]);

  const priorityCounts = useMemo(() => {
    const c: Record<'all' | TicketPriority, number> = {
      all: tickets.length,
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    };
    for (const t of tickets) c[t.priority]++;
    return c;
  }, [tickets]);

  // sparkline ساختگی اما پایدار بر اساس توزیع وضعیت‌ها (نمایش روند نسبی)
  const sparkValues = useMemo(
    () => [stats.pending, stats.open, stats.inProgress, stats.resolved].map((v) => Math.max(v, 1)),
    [stats],
  );

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
        <div className={s.heroHead}>
          <div>
            <PageHeader
              variant="minimal"
              eyebrow="مرکز پشتیبانی"
              title="صندوق اولویت"
              description="نمای پروازی تیکت‌ها بر اساس اولویت و وضعیت — با رصد زنده‌ی SLA و فعالیت تیم."
            />
          </div>
          <span className={s.livePill} aria-hidden>
            <span className={s.liveDot} />
            رصد زنده · هر ۳۰ ثانیه
          </span>
        </div>
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
            <div className={s.statsGrid}>
              <div className={s.stat}>
                <div className={s.statHead}>
                  <span className={s.statLabel}>میانگین اولین پاسخ</span>
                  <span className={s.statIco} data-tone="indigo" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                </div>
                <div className={s.statValue}>{avgFR}</div>
                <Sparkline
                  values={sparkValues}
                  tone="indigo"
                  height={30}
                  className={s.spark}
                  ariaLabel="روند وضعیت‌ها"
                />
              </div>
              <div className={s.stat}>
                <div className={s.statHead}>
                  <span className={s.statLabel}>فوری باز</span>
                  <span className={s.statIco} data-tone="rose" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </span>
                </div>
                <div className={s.statValue}>
                  {toPersianNumber(stats.urgent)} <small>تیکت</small>
                </div>
                <div className={s.statFoot}>
                  {atRisk > 0 ? (
                    <span className={s.atRisk}>⏳ {toPersianNumber(atRisk)} در معرض SLA</span>
                  ) : (
                    <span>همه در بازه‌ی SLA</span>
                  )}
                </div>
              </div>
              <div className={s.stat}>
                <div className={s.statHead}>
                  <span className={s.statLabel}>در جریان</span>
                  <span className={s.statIco} data-tone="amber" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 12a9 9 0 1 1-9-9" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </span>
                </div>
                <div className={s.statValue}>
                  {toPersianNumber(stats.open + stats.inProgress)} <small>تیکت</small>
                </div>
                <div className={s.statFoot}>باز + در حال بررسی</div>
              </div>
              <div className={s.stat}>
                <div className={s.statHead}>
                  <span className={s.statLabel}>کل تیکت‌ها</span>
                  <span className={s.statIco} data-tone="emerald" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </span>
                </div>
                <div className={s.statValue}>{toPersianNumber(stats.total)}</div>
                <div className={s.statFoot}>{toPersianNumber(stats.resolved)} حل شده</div>
              </div>
            </div>

            <div className={s.sla}>
              <div className={s.slaHead}>
                <span>تعهد پاسخ به تیکت‌های فوری (SLA &lt; ۲ ساعت)</span>
                <b>{sla === null ? '—' : `${toPersianNumber(sla)}٪ برآورده شده`}</b>
              </div>
              <div className={s.slaBar} aria-hidden>
                <div className={s.slaFill} style={{ width: `${sla ?? 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Toolbar zone ───────────────────────────────── */}
      <section className={s.toolbar} aria-label="ابزار">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="جستجو در تیکت‌ها… (موضوع، شرح، دسته)"
          ariaLabel="جستجو در تیکت‌ها"
        />
        <div className={s.pillsWrap}>
          <PillTabs
            tabs={PRIORITY_FILTERS.map((f) => ({
              id: f.id,
              label: f.label,
              count: toPersianNumber(priorityCounts[f.id]),
            }))}
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
