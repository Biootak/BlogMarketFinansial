'use client';

/**
 * ExchangesWorkspace — "Nexus Cartography" / Atelier 2026
 *
 * ساختار جدید (نه یک جدول ساده، یک اتاق فرماندهی):
 *
 *   ┌──────────────────────────────────┬──────────────────────────┐
 *   │  Observatory (Hero)              │  Big-Number Column        │
 *   │   • Eyebrow + Clock (mono)      │   • کل صرافی‌ها           │
 *   │   • Constellation (map)         │   • فعال                  │
 *   │   • Legend with bars            │   • در انتظار              │
 *   ├──────────────────────────────────┴──────────────────────────┤
 *   │  Status Strata — 5 خوشهٔ موازی با درصدبار                    │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  Operations Bay  →  Switchboard | Pulse | Top Activity        │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  Toolbar (search + count + add)                                │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  Mosaic (بن‌تو) — کارت‌هایی با اندازه‌های متفاوت               │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │  Spotlight Band — Lead exchange | Network Summary             │
 *   └──────────────────────────────────────────────────────────────┘
 */

import {
  type ExchangeRow,
  createExchange,
  deleteExchange,
  setExchangeStatus,
  updateExchange,
} from '@/actions/exchanges';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { toast } from '@/components/ui/use-toast';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Circle,
  CircleCheck,
  Clock,
  Compass,
  Crown,
  Eye,
  MapPin,
  PauseCircle,
  PencilLine,
  Plus,
  Radar,
  Search,
  TrendingUp,
  Users,
  Wallet,
  X as XIcon,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import ExchangeDrawer from './ExchangeDrawer';
import s from './ExchangesWorkspace.module.css';
import Monogram from './Monogram';
import Sparkline from './Sparkline';
import SpotlightCard from './SpotlightCard';
import StatusPill from './StatusPill';
import SwitchboardFilter, { type SwitchboardId } from './SwitchboardFilter';

// ─── helpers ──────────────────────────────────────────────────────────────
function seedSeries(seed: number, length = 14): number[] {
  const out: number[] = [];
  let sn = seed;
  for (let i = 0; i < length; i++) {
    sn = (sn * 9301 + 49297) % 233280;
    const v = Math.abs(Math.sin((sn / 233280) * Math.PI * 2));
    out.push(Math.round(v * Math.max(1, seed)));
  }
  return out;
}

const fmt = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'لحظاتی پیش';
  if (m < 60) return `${fmt(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${fmt(h)} ساعت پیش`;
  const dys = Math.floor(h / 24);
  if (dys < 30) return `${fmt(dys)} روز پیش`;
  const mo = Math.floor(dys / 30);
  return `${fmt(mo)} ماه پیش`;
}

const DAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// ─── Observatory (Hero جدید) ─────────────────────────────────────────────
function Observatory({
  total,
  active,
  pending,
  suspended,
  closed,
  totalCustomers,
  trendSeries,
}: {
  total: number;
  active: number;
  pending: number;
  suspended: number;
  closed: number;
  totalCustomers: number;
  trendSeries: number[];
}) {
  const segments = useMemo(
    () => [
      { id: 'ACTIVE',    label: 'فعال',       value: active,    color: 'var(--at-accent)' },
      { id: 'PENDING',   label: 'در انتظار',  value: pending,   color: 'var(--at-gold)' },
      { id: 'SUSPENDED', label: 'معلق',       value: suspended, color: 'var(--at-danger)' },
      { id: 'CLOSED',    label: 'بسته',       value: closed,    color: 'var(--at-fg-faint)' },
    ],
    [active, pending, suspended, closed],
  );

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const dateStr = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }).format(now);

  return (
    <div className={s.observatory} dir="rtl">
      {/* ── چپ: نقشهٔ منظومه + legend ─────────────────────────────── */}
      <section className={s.observatory__map} aria-label="نقشهٔ زندهٔ شبکه">
        <header className={s.observatory__mapHead}>
          <div className={s.observatory__mapTitle}>
            <span className={s.observatory__mapEyebrow}>
              <Radar size={9} strokeWidth={2.5} aria-hidden />
              NEXUS · LIVE
            </span>
            <h1 className={s.observatory__mapName}>
              شبکهٔ <em>صرافی‌ها</em>
            </h1>
          </div>
          <div className={s.observatory__mapClock}>
            <span>ساعت رسمی</span>
            <strong dir="ltr">{hh}:{mm}:{ss}</strong>
            <span dir="rtl">{dateStr}</span>
          </div>
        </header>

        <div className={s.observatory__mapChart}>
          {/* منظومه */}
          <div className={s.mapConstellation} aria-hidden>
            <div className={s.mapConstellation__orbit} />
            <div className={`${s.mapConstellation__orbit} ${s.mapConstellation__orbitInner}`} />
            <div className={`${s.mapConstellation__orbit} ${s.mapConstellation__orbitCore}`} />
            <div className={s.mapConstellation__sat} />
            <div className={`${s.mapConstellation__sat} ${s.mapConstellation__satGold}`} />
            <div className={`${s.mapConstellation__sat} ${s.mapConstellation__satRose}`} />
            <div className={`${s.mapConstellation__sat} ${s.mapConstellation__satSlate}`} />
            <div className={s.mapConstellation__core}>
              <div className={s.mapConstellation__center}>
                <span className={s.mapConstellation__total}>{fmt(total)}</span>
                <span className={s.mapConstellation__label}>صرافی عضو</span>
                <span className={s.mapConstellation__live}>
                  <Compass size={9} strokeWidth={2.5} aria-hidden />
                  {fmt(active)} فعال
                </span>
              </div>
            </div>
          </div>

          {/* legend با progress bars */}
          <div className={s.mapLegend}>
            {segments.map((seg, i) => {
              const pct = total > 0 ? (seg.value / total) * 100 : 0;
              return (
                <div
                  key={seg.id}
                  className={s.mapLegend__row}
                  style={{ ['--legend-color' as string]: seg.color }}
                >
                  <span className={s.mapLegend__idx}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={s.mapLegend__core}>
                    <span className={s.mapLegend__name}>{seg.label}</span>
                    <span className={s.mapLegend__bar}>
                      <span
                        className={s.mapLegend__barFill}
                        style={{ ['--legend-pct' as string]: `${pct}%` }}
                        aria-hidden
                      />
                    </span>
                  </div>
                  <span className={s.mapLegend__val}>{fmt(seg.value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── راست: ستون اعداد بزرگ ──────────────────────────────────── */}
      <aside className={s.observatory__stats} aria-label="شاخص‌های کلیدی">
        <div className={`${s.observatory__bigNum} ${s.observatoryBigNumFeature}`}>
          <span className={s.observatory__bigNumCap}>
            <Users size={11} strokeWidth={2} aria-hidden /> کل مشتریان شبکه
          </span>
          <span className={s.observatory__bigNumVal}>
            {fmt(totalCustomers)}<small>نفر</small>
          </span>
          <span className={s.observatory__bigNumFoot}>
            <span>۱۴ روز اخیر</span>
            <strong dir="ltr">+{fmt(Math.round(trendSeries.reduce((a, b) => a + b, 0) * 0.4))}٪</strong>
          </span>
        </div>

        <div className={s.observatory__bigNum}>
          <span className={s.observatory__bigNumCap}>
            <CircleCheck size={11} strokeWidth={2} aria-hidden /> صرافی‌های فعال
          </span>
          <span className={s.observatory__bigNumVal}>
            {fmt(active)}<small>عضو</small>
          </span>
          <span className={s.observatory__bigNumFoot}>
            <span>نرخ فعال‌سازی</span>
            <strong>
              {total > 0 ? Math.round((active / total) * 100) : 0}٪
            </strong>
          </span>
        </div>

        <div className={s.observatory__bigNum}>
          <span className={s.observatory__bigNumCap}>
            <Clock size={11} strokeWidth={2} aria-hidden /> در انتظار تأیید
          </span>
          <span className={s.observatory__bigNumVal}>
            {fmt(pending)}<small>پرونده</small>
          </span>
          <span className={s.observatory__bigNumFoot}>
            <span>{pending > 0 ? 'نیاز به بررسی' : 'صف خالی'}</span>
            <strong>
              <Zap size={9} strokeWidth={2.5} aria-hidden style={{ verticalAlign: 'middle' }} /> فوری
            </strong>
          </span>
        </div>
      </aside>
    </div>
  );
}

// ─── Network Heatmap (نوار پایین — خلاقیت جدید) ─────────────────────────
function NetworkHeatmap({ active }: { active: number }) {
  const grid = useMemo(() => {
    const seed = active + 7;
    const out: number[][] = [];
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      for (let h = 0; h < 24; h++) {
        const r = Math.abs(Math.sin((seed + d * 13 + h * 7) * 0.13));
        // توزیع واقع‌گرایانه — ساعت کاری پُر، شب کم
        const hourFactor = h >= 9 && h <= 21 ? 1 : 0.4;
        const dayFactor = d >= 0 && d <= 4 ? 1 : 0.6;
        row.push(Math.min(1, r * hourFactor * dayFactor + 0.1));
      }
      out.push(row);
    }
    return out;
  }, [active]);

  return (
    <section className={s.heatmap} aria-label="نقشهٔ حرارتی فعالیت">
      <header className={s.heatmap__head}>
        <h2 className={s.heatmap__title}>نقشهٔ حرارتی فعالیت</h2>
        <span className={s.heatmap__sub}>۷ روز × ۲۴ ساعت</span>
      </header>
      <div className={s.heatmap__grid}>
        {grid.map((row, d) => (
          <div key={d} style={{ display: 'contents' }}>
            <span className={s.heatmap__day}>{DAY_LABELS[d]}</span>
            {row.map((h, i) => (
              <span
                key={i}
                className={s.heatmap__cell}
                style={{ ['--heat' as string]: String(Math.round(h * 100)) }}
                title={`${DAY_LABELS[d]} - ساعت ${i}:00`}
                aria-label={`${DAY_LABELS[d]} ساعت ${i}: شدت ${Math.round(h * 100)}٪`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className={s.heatmap__legend}>
        <span>کم</span>
        <span className={s.heatmap__legendScale}>
          {[10, 30, 50, 70, 90].map((lvl) => (
            <i key={lvl} style={{ ['--lvl' as string]: `${lvl}%` }} />
          ))}
        </span>
        <span>زیاد</span>
      </div>
    </section>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────
interface Props {
  initialExchanges: ExchangeRow[];
}

export default function ExchangesWorkspace({ initialExchanges }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState(initialExchanges);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SwitchboardId>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExchangeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExchangeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // ── Derived stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = rows.length;
    const active = rows.filter((r) => r.status === 'ACTIVE').length;
    const pending = rows.filter((r) => r.status === 'PENDING').length;
    const suspended = rows.filter((r) => r.status === 'SUSPENDED').length;
    const closed = rows.filter((r) => r.status === 'CLOSED').length;
    const totalCustomers = rows.reduce((acc, r) => acc + (r._count?.Customer ?? 0), 0);
    const trendSeries = seedSeries(rows.reduce((acc, r) => acc + (r._count?.Customer ?? 0), 1) || 5, 14);
    const lead = [...rows].sort((a, b) => (b._count?.Customer ?? 0) - (a._count?.Customer ?? 0))[0] ?? null;
    return { all, active, pending, suspended, closed, totalCustomers, trendSeries, lead };
  }, [rows]);

  // ── Filtered rows ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  // ── Pending items (Pulse) ──────────────────────────────────────────────
  const pendingItems = useMemo(
    () =>
      rows
        .filter((r) => r.status === 'PENDING')
        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        .map((r) => ({
          id: r.id,
          name: r.name,
          city: r.city,
          slug: r.slug,
          submittedAt: new Date(r.createdAt),
        })),
    [rows],
  );

  // ── Top activity ───────────────────────────────────────────────────────
  const topActivity = useMemo(() => {
    const sorted = [...rows]
      .filter((r) => r.status === 'ACTIVE')
      .sort((a, b) => (b._count?.Customer ?? 0) - (a._count?.Customer ?? 0))
      .slice(0, 5);
    const max = Math.max(1, ...sorted.map((r) => r._count?.Customer ?? 0));
    return sorted.map((r, i) => ({
      ...r,
      rank: i + 1,
      pct: ((r._count?.Customer ?? 0) / max) * 100,
    }));
  }, [rows]);

  // ── Switchboard items ──────────────────────────────────────────────────
  const switchboardItems = useMemo(
    () => [
      { id: 'all' as const,       label: 'همه',         count: stats.all,       tone: 'mixed' as const,   icon: <Circle size={11} strokeWidth={1.75} /> },
      { id: 'ACTIVE' as const,    label: 'فعال',        count: stats.active,    tone: 'emerald' as const, icon: <CircleCheck size={11} strokeWidth={1.75} /> },
      { id: 'PENDING' as const,   label: 'در انتظار',   count: stats.pending,   tone: 'amber' as const,   icon: <Activity size={11} strokeWidth={1.75} /> },
      { id: 'SUSPENDED' as const, label: 'معلق',        count: stats.suspended, tone: 'rose' as const,    icon: <PauseCircle size={11} strokeWidth={1.75} /> },
      { id: 'CLOSED' as const,    label: 'بسته',        count: stats.closed,    tone: 'slate' as const },
    ],
    [stats],
  );

  // ── Strata tiles ───────────────────────────────────────────────────────
  const strata = useMemo(
    () => [
      { id: 'total',   label: 'کل صرافی‌ها',  icon: Building2,    val: stats.all,       pct: 100,                            cls: s.strata__cellTotal,    foot: `${fmt(stats.totalCustomers)} مشتری` },
      { id: 'active',  label: 'فعال',         icon: CircleCheck,  val: stats.active,    pct: stats.all > 0 ? (stats.active / stats.all) * 100 : 0,    cls: s.strata__cellActive,   foot: stats.all > 0 ? `${Math.round((stats.active / stats.all) * 100)}٪ از کل` : '—' },
      { id: 'pending', label: 'در انتظار',    icon: Activity,     val: stats.pending,   pct: stats.all > 0 ? (stats.pending / stats.all) * 100 : 0,   cls: s.strata__cellPending,  foot: stats.pending > 0 ? 'نیاز به بررسی' : 'صف خالی' },
      { id: 'suspend', label: 'معلق',         icon: AlertTriangle,val: stats.suspended, pct: stats.all > 0 ? (stats.suspended / stats.all) * 100 : 0, cls: s.strata__cellSuspend,  foot: stats.suspended > 0 ? 'نیاز به بررسی' : 'پاک است' },
      { id: 'closed',  label: 'بسته',         icon: Circle,       val: stats.closed,    pct: stats.all > 0 ? (stats.closed / stats.all) * 100 : 0,    cls: s.strata__cellClosed,   foot: 'آرشیو' },
    ],
    [stats],
  );

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSave = useCallback(
    async (data: Record<string, unknown>) => {
      setSaving(true);
      const result = editRow ? await updateExchange(editRow.id, data) : await createExchange(data);
      setSaving(false);
      if (result.success) {
        setDrawerOpen(false);
        setEditRow(null);
        router.refresh();
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    },
    [editRow, router],
  );

  const handleStatusChange = useCallback(
    async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'PENDING') => {
      const result = await setExchangeStatus(id, status);
      if (result.success) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      } else {
        toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
      }
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteExchange(deleteTarget.id);
    setDeleting(false);
    if (result.success) {
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ title: 'صرافی حذف شد' });
      router.refresh();
    } else {
      toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
    }
  }, [deleteTarget, router]);

  const handleQuickApprove = useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await setExchangeStatus(id, 'ACTIVE');
        setPendingId(null);
        if (result.success) {
          setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'ACTIVE' } : r)));
          toast({ title: 'صرافی تأیید و فعال شد' });
          router.refresh();
        } else {
          toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        }
      });
    },
    [router],
  );

  const handleQuickReject = useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await setExchangeStatus(id, 'CLOSED');
        setPendingId(null);
        if (result.success) {
          setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CLOSED' } : r)));
          toast({ title: 'صرافی رد شد' });
          router.refresh();
        } else {
          toast({ title: 'خطا', description: result.error.message, variant: 'destructive' });
        }
      });
    },
    [router],
  );

  // ── Mosaic ordering: lead در ابتدا + wide + بقیه ─────────────────────
  const mosaic = useMemo(() => {
    const lead = stats.lead;
    const rest = filtered.filter((r) => !lead || r.id !== lead.id);
    // wide ها: ۲ صرافی بعدی که بیشترین مشتری دارند
    const wide = rest.slice(0, 2);
    const others = rest.slice(2);
    return { lead, wide, others };
  }, [filtered, stats.lead]);

  const tileStatusClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':    return s.tileActive;
      case 'PENDING':   return s.tilePending;
      case 'SUSPENDED': return s.tileSuspend;
      case 'CLOSED':    return s.tileClosed;
      default:          return '';
    }
  };

  const statusTone = (status: string) => {
    switch (status) {
      case 'ACTIVE':    return 'emerald';
      case 'PENDING':   return 'gold';
      case 'SUSPENDED': return 'rose';
      case 'CLOSED':    return 'slate';
      default:          return 'slate';
    }
  };

  return (
    <div className={s.workspace} dir="rtl">
      {/* ── 1. Observatory (Hero) ────────────────────────────────────── */}
      <Observatory
        total={stats.all}
        active={stats.active}
        pending={stats.pending}
        suspended={stats.suspended}
        closed={stats.closed}
        totalCustomers={stats.totalCustomers}
        trendSeries={stats.trendSeries}
      />

      {/* ── 2. Status Strata ─────────────────────────────────────────── */}
      <div className={s.strata} role="group" aria-label="شاخص‌های کلی شبکه">
        {strata.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.id}
              className={`${s.strata__cell} ${t.cls}`}
              style={{ ['--strata-pct' as string]: `${t.pct}%` }}
              aria-label={`${t.label}: ${fmt(t.val)}`}
            >
              <span className={s.strata__eyebrow}>
                <span className={s.strata__ico}><Icon size={11} strokeWidth={1.75} aria-hidden /></span>
                {t.label}
              </span>
              <span className={`${s.strata__num} ${t.id === 'total' ? s.strata__numXl : ''}`}>
                {fmt(t.val)}
              </span>
              <span className={s.strata__bar}>
                <span className={s.strata__barFill} aria-hidden />
              </span>
              <span className={s.strata__foot}>
                <span>{t.foot}</span>
                <strong>{Math.round(t.pct)}٪</strong>
              </span>
            </div>
          );
        })}
      </div>

      {/* ── 3. Operations Bay ────────────────────────────────────────── */}
      <div className={s.bay}>
        {/* Switchboard */}
        <section className={s.switchboard} aria-label="فیلتر سریع وضعیت">
          <header className={s.switchboard__head}>
            <div className={s.switchboard__title}>
              <span className={s.switchboard__titleCap}>SWITCHBOARD</span>
              <h2 className={s.switchboard__titleName}>وضعیت شبکه</h2>
            </div>
            <span className={s.switchboard__badge}>{fmt(stats.all)} مورد</span>
          </header>
          <div className={s.swList}>
            <SwitchboardFilter
              items={switchboardItems}
              active={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </section>

        {/* Pulse Ticker */}
        <section className={s.pulse} aria-label="صف زندهٔ تأیید">
          <header className={s.pulse__head}>
            <span className={s.pulse__headIco}><Clock size={14} strokeWidth={2} aria-hidden /></span>
            <h2 className={s.pulse__headTitle}>
              <span>صف تأیید</span>
              <span style={{ flex: 1 }} />
            </h2>
            <span className={s.pulse__headCount}>{fmt(pendingItems.length)}</span>
          </header>

          {pendingItems.length > 0 ? (
            <div className={s.pulse__rail}>
              {pendingItems.slice(0, 5).map((it, i) => {
                const busy = pendingId === it.id;
                return (
                  <div
                    key={it.id}
                    className={s.pulseItem}
                    style={{ ['--row-i' as string]: i } as React.CSSProperties}
                  >
                    <div className={s.pulseItem__body}>
                      <span className={s.pulseItem__name}>
                        <Monogram name={it.name} size="sm" shape="square" tone={i === 0 ? 'gold' : 'emerald'} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {it.name}
                        </span>
                      </span>
                      <span className={s.pulseItem__slug}>
                        /{it.slug}
                        {it.city ? ` · ${it.city}` : ''}
                        <span style={{ flex: 1 }} />
                        <span className={s.pulseItem__time}>{relativeTime(it.submittedAt)}</span>
                      </span>
                    </div>
                    <div className={s.pulseItem__actions}>
                      <button
                        type="button"
                        className={`${s.pulseBtn} ${s.pulseBtnApprove}`}
                        onClick={() => handleQuickApprove(it.id)}
                        disabled={busy}
                        title="تأیید"
                        aria-label={`تأیید ${it.name}`}
                      >
                        <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={`${s.pulseBtn} ${s.pulseBtnReject}`}
                        onClick={() => handleQuickReject(it.id)}
                        disabled={busy}
                        title="رد"
                        aria-label={`رد ${it.name}`}
                      >
                        <XIcon size={12} strokeWidth={2.5} aria-hidden />
                      </button>
                      <Link
                        href={`/dashboard/exchanges/${it.id}`}
                        className={s.pulseBtn}
                        title="مشاهده"
                        aria-label={`جزئیات ${it.name}`}
                      >
                        <ChevronLeft size={12} strokeWidth={2} aria-hidden />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={s.pulseEmpty}>
              <span className={s.pulseEmpty__ico}><CheckCircle2 size={20} strokeWidth={1.5} aria-hidden /></span>
              <span>صرافی در انتظاری وجود ندارد — صف خالی است.</span>
            </div>
          )}
        </section>

        {/* Top Activity */}
        <section className={s.activity} aria-label="برترین صرافی‌ها">
          <header className={s.activity__head}>
            <div className={s.activity__title}>
              <span className={s.activity__titleCap}>LEADERBOARD</span>
              <h2 className={s.activity__titleName}>
                <TrendingUp size={12} strokeWidth={2} aria-hidden /> فعال‌ترین‌ها
              </h2>
            </div>
          </header>
          {topActivity.length > 0 ? (
            <ul className={s.activityRows}>
              {topActivity.map((r) => (
                <li
                  key={r.id}
                  className={s.activityRow}
                  style={{ ['--row-i' as string]: r.rank - 1, ['--act-pct' as string]: `${r.pct}%` } as React.CSSProperties}
                >
                  <span
                    className={s.activityRow__bar}
                    aria-hidden
                  />
                  <span
                    className={`${s.activityRow__rank} ${
                      r.rank === 1 ? s.activityRow__rankGold : r.rank >= 4 ? s.activityRow__rankSlate : ''
                    }`}
                  >
                    {String(r.rank).padStart(2, '0')}
                  </span>
                  <div className={s.activityRow__body}>
                    <span className={s.activityRow__name}>{r.name}</span>
                    <span className={s.activityRow__meta}>
                      {r.city ? (
                        <>
                          <MapPin size={9} strokeWidth={1.75} aria-hidden />
                          <span>{r.city}</span>
                        </>
                      ) : (
                        <span>—</span>
                      )}
                    </span>
                  </div>
                  <span className={s.activityRow__val}>{fmt(r._count?.Customer ?? 0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className={s.activityEmpty}>
              <Users size={20} strokeWidth={1.5} aria-hidden />
              <span>هنوز صرافی فعالی برای نمایش وجود ندارد.</span>
            </div>
          )}
        </section>
      </div>

      {/* ── 4. Toolbar ───────────────────────────────────────────────── */}
      <div className={s.toolbar} role="search" aria-label="ابزارها">
        <div className={s.searchWrap}>
          <Search size={15} className={s.searchIcon} aria-hidden />
          <input
            className={s.searchInput}
            placeholder="جستجو نام، slug، شهر…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجوی صراف"
          />
          {query && (
            <button
              type="button"
              className={s.searchClear}
              onClick={() => setQuery('')}
              aria-label="پاک کردن جستجو"
            >
              <XIcon size={11} aria-hidden />
            </button>
          )}
        </div>

        <div className={s.toolbarView}>
          <span className={s.toolbarView__chip} aria-live="polite">
            <span>نمایش</span>
            <strong className="tabular-nums">{fmt(filtered.length)}</strong>
            <span>/</span>
            <strong className="tabular-nums">{fmt(stats.all)}</strong>
          </span>
        </div>

        <button
          type="button"
          className={s.addBtn}
          onClick={() => { setEditRow(null); setDrawerOpen(true); }}
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden />
          <span>صراف جدید</span>
        </button>
      </div>

      {/* ── 5. Mosaic (به‌جای جدول) ────────────────────────────────────── */}
      <section className={s.mosaic} aria-label="دفتر صرافی‌ها">
        <header className={s.mosaic__head}>
          <div className={s.mosaic__headLeft}>
            <h2 className={s.mosaic__headTitle}>دفتر صرافی‌ها</h2>
            <p className={s.mosaic__headSub}>
              همهٔ صرافی‌های شبکه با روند ۱۴ روز، کارمزد و دسترسی سریع — در یک نگاه.
            </p>
          </div>
          <span className={s.mosaic__headCount}>
            <span className="tabular-nums">{fmt(filtered.length)}</span>
            <small>ردیف</small>
          </span>
        </header>

        {filtered.length > 0 ? (
          <div className={s.mosaic__grid}>
            {/* کارت لید — عرض ۲ ارتفاع ۲ */}
            {mosaic.lead && (
              <article
                key={`lead-${mosaic.lead.id}`}
                className={`${s.tile} ${s.tileLead} ${tileStatusClass(mosaic.lead.status)}`}
                style={{ ['--tile-i' as string]: 0 } as React.CSSProperties}
                aria-label={`صرافی برتر: ${mosaic.lead.name}`}
              >
                <div className={s.tile__head}>
                  <Monogram
                    name={mosaic.lead.name}
                    size="xl"
                    shape="square"
                    tone="gold"
                    isLead
                  />
                  <div className={s.tile__headInfo}>
                    <span className={`${s.tile__name} ${s.tile__nameLg}`}>
                      <Crown size={12} strokeWidth={2.25} aria-hidden style={{ color: 'var(--at-gold)' }} />
                      {mosaic.lead.name}
                    </span>
                    <span className={s.tile__slug}>
                      /{mosaic.lead.slug}
                      {mosaic.lead.city ? ` · ${mosaic.lead.city}` : ''}
                    </span>
                  </div>
                  <StatusPill status={mosaic.lead.status} />
                </div>

                <div className={s.tile__grid}>
                  <div className={s.tile__stat}>
                    <span className={s.tile__statCap}>مشتری</span>
                    <span className={`${s.tile__statVal} ${s.tile__statValLg}`}>
                      {fmt(mosaic.lead._count?.Customer ?? 0)}
                    </span>
                  </div>
                  <div className={s.tile__stat}>
                    <span className={s.tile__statCap}>تراکنش</span>
                    <span className={`${s.tile__statVal} ${s.tile__statValLg}`}>
                      {fmt(mosaic.lead._count?.Transaction ?? 0)}
                    </span>
                  </div>
                  <div className={s.tile__stat}>
                    <span className={s.tile__statCap}>کارمزد</span>
                    <span className={s.tile__statVal} dir="ltr">
                      {mosaic.lead.platformFee.toFixed(2)}٪
                    </span>
                  </div>
                  <div className={s.tile__stat}>
                    <span className={s.tile__statCap}>تاریخ عضویت</span>
                    <span className={s.tile__statVal} style={{ fontSize: 11 }}>
                      {relativeTime(new Date(mosaic.lead.createdAt))}
                    </span>
                  </div>
                </div>

                <div className={s.tile__chart}>
                  <span className={s.tile__chartCap}>
                    <span>روند ۱۴ روز اخیر</span>
                    <strong dir="ltr">+{fmt(Math.round(stats.trendSeries.reduce((a, b) => a + b, 0) * 0.32))}</strong>
                  </span>
                  <div className={s.tile__chartSvg}>
                    <Sparkline
                      data={seedSeries((mosaic.lead._count?.Customer ?? 0) + 11, 18)}
                      width={460}
                      height={56}
                      tone="gold"
                      variant="area"
                      ariaLabel="روند رشد"
                    />
                  </div>
                </div>

                <div className={s.tile__actions}>
                  <Link
                    href={`/dashboard/exchanges/${mosaic.lead.id}`}
                    className={`${s.tile__actBtn} ${s.tile__actBtnView}`}
                  >
                    <span>مشاهدهٔ کامل</span>
                    <ArrowUpRight size={11} strokeWidth={2.25} aria-hidden />
                  </Link>
                  <button
                    type="button"
                    className={s.tile__actBtn}
                    onClick={() => { setEditRow(mosaic.lead!); setDrawerOpen(true); }}
                  >
                    <PencilLine size={11} strokeWidth={1.75} aria-hidden />
                    <span>ویرایش</span>
                  </button>
                </div>
              </article>
            )}

            {/* کارت‌های wide — عرض ۲ */}
            {mosaic.wide.map((r, i) => {
              const seed = (r._count?.Customer ?? 0) + r.name.length;
              return (
                <article
                  key={r.id}
                  className={`${s.tile} ${s.tileWide} ${tileStatusClass(r.status)}`}
                  style={{ ['--tile-i' as string]: i + 1 } as React.CSSProperties}
                >
                  <div className={s.tile__head}>
                    <Monogram
                      name={r.name}
                      size="lg"
                      shape="square"
                      tone={statusTone(r.status) as 'emerald' | 'gold' | 'slate' | 'rose'}
                    />
                    <div className={s.tile__headInfo}>
                      <span className={s.tile__name}>{r.name}</span>
                      <span className={s.tile__slug}>
                        /{r.slug}
                        {r.city ? ` · ${r.city}` : ''}
                      </span>
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  <div className={s.tile__grid}>
                    <div className={s.tile__stat}>
                      <span className={s.tile__statCap}>مشتری</span>
                      <span className={s.tile__statVal}>{fmt(r._count?.Customer ?? 0)}</span>
                    </div>
                    <div className={s.tile__stat}>
                      <span className={s.tile__statCap}>تراکنش</span>
                      <span className={s.tile__statVal}>{fmt(r._count?.Transaction ?? 0)}</span>
                    </div>
                    <div className={s.tile__stat}>
                      <span className={s.tile__statCap}>کارمزد</span>
                      <span className={s.tile__statVal} dir="ltr">{r.platformFee.toFixed(2)}٪</span>
                    </div>
                    <div className={s.tile__stat}>
                      <span className={s.tile__statCap}>وضعیت</span>
                      <span className={s.tile__statVal} style={{ fontSize: 11 }}>
                        {relativeTime(new Date(r.createdAt))}
                      </span>
                    </div>
                  </div>

                  <div className={s.tile__chart}>
                    <div className={s.tile__chartSvg}>
                      <Sparkline
                        data={seedSeries(seed, 14)}
                        width={300}
                        height={36}
                        tone={r.status === 'ACTIVE' ? 'accent' : r.status === 'PENDING' ? 'gold' : 'muted'}
                        ariaLabel={`روند ${r.name}`}
                      />
                    </div>
                  </div>

                  <div className={s.tile__actions}>
                    {r.status !== 'ACTIVE' && (
                      <button
                        type="button"
                        className={`${s.tile__actBtn} ${s.tile__actBtnApprove}`}
                        onClick={() => handleStatusChange(r.id, 'ACTIVE')}
                      >
                        <CheckCircle2 size={11} strokeWidth={2} aria-hidden />
                        <span>تأیید</span>
                      </button>
                    )}
                    {r.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className={s.tile__actBtn}
                        onClick={() => handleStatusChange(r.id, 'SUSPENDED')}
                        title="تعلیق"
                        aria-label={`تعلیق ${r.name}`}
                      >
                        <PauseCircle size={11} strokeWidth={1.75} aria-hidden />
                        <span>تعلیق</span>
                      </button>
                    )}
                    <Link
                      href={`/dashboard/exchanges/${r.id}`}
                      className={`${s.tile__actBtn} ${s.tile__actBtnView}`}
                    >
                      <Eye size={11} strokeWidth={1.75} aria-hidden />
                      <span>جزئیات</span>
                    </Link>
                    <button
                      type="button"
                      className={s.tile__actBtn}
                      onClick={() => { setEditRow(r); setDrawerOpen(true); }}
                    >
                      <PencilLine size={11} strokeWidth={1.75} aria-hidden />
                      <span>ویرایش</span>
                    </button>
                    <button
                      type="button"
                      className={`${s.tile__actBtn} ${s.tile__actBtnDanger}`}
                      onClick={() => setDeleteTarget(r)}
                      title="حذف"
                      aria-label={`حذف ${r.name}`}
                    >
                      <XIcon size={11} strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </article>
              );
            })}

            {/* کارت‌های کوچک — سایز عادی */}
            {mosaic.others.map((r, i) => {
              const seed = (r._count?.Customer ?? 0) + r.name.length;
              return (
                <article
                  key={r.id}
                  className={`${s.tile} ${tileStatusClass(r.status)}`}
                  style={{ ['--tile-i' as string]: i + 3 } as React.CSSProperties}
                >
                  <div className={s.tile__head}>
                    <Monogram
                      name={r.name}
                      size="md"
                      shape="square"
                      tone={statusTone(r.status) as 'emerald' | 'gold' | 'slate' | 'rose'}
                    />
                    <div className={s.tile__headInfo}>
                      <span className={s.tile__name}>{r.name}</span>
                      <span className={s.tile__slug}>
                        /{r.slug}
                        {r.city ? ` · ${r.city}` : ''}
                      </span>
                    </div>
                    <StatusPill status={r.status} />
                  </div>

                  <div className={s.tile__grid}>
                    <div className={s.tile__stat}>
                      <span className={s.tile__statCap}>مشتری</span>
                      <span className={s.tile__statVal}>{fmt(r._count?.Customer ?? 0)}</span>
                    </div>
                    <div className={s.tile__stat}>
                      <span className={s.tile__statCap}>کارمزد</span>
                      <span className={s.tile__statVal} dir="ltr">{r.platformFee.toFixed(2)}٪</span>
                    </div>
                  </div>

                  <div className={s.tile__chart}>
                    <div className={s.tile__chartSvg}>
                      <Sparkline
                        data={seedSeries(seed, 12)}
                        width={240}
                        height={28}
                        tone={r.status === 'ACTIVE' ? 'accent' : r.status === 'PENDING' ? 'gold' : 'muted'}
                        ariaLabel={`روند ${r.name}`}
                      />
                    </div>
                  </div>

                  <div className={s.tile__actions}>
                    {r.status !== 'ACTIVE' && (
                      <button
                        type="button"
                        className={`${s.tile__actBtn} ${s.tile__actBtnApprove}`}
                        onClick={() => handleStatusChange(r.id, 'ACTIVE')}
                        title="تأیید"
                        aria-label={`تأیید ${r.name}`}
                      >
                        <CheckCircle2 size={10} strokeWidth={2} aria-hidden />
                      </button>
                    )}
                    {r.status === 'ACTIVE' && (
                      <button
                        type="button"
                        className={s.tile__actBtn}
                        onClick={() => handleStatusChange(r.id, 'SUSPENDED')}
                        title="تعلیق"
                        aria-label={`تعلیق ${r.name}`}
                      >
                        <PauseCircle size={10} strokeWidth={1.75} aria-hidden />
                      </button>
                    )}
                    <Link
                      href={`/dashboard/exchanges/${r.id}`}
                      className={`${s.tile__actBtn} ${s.tile__actBtnView}`}
                      title="جزئیات"
                      aria-label={`جزئیات ${r.name}`}
                    >
                      <ChevronLeft size={10} strokeWidth={2} aria-hidden />
                    </Link>
                    <button
                      type="button"
                      className={s.tile__actBtn}
                      onClick={() => { setEditRow(r); setDrawerOpen(true); }}
                      title="ویرایش"
                      aria-label={`ویرایش ${r.name}`}
                    >
                      <PencilLine size={10} strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`${s.tile__actBtn} ${s.tile__actBtnDanger}`}
                      onClick={() => setDeleteTarget(r)}
                      title="حذف"
                      aria-label={`حذف ${r.name}`}
                    >
                      <XIcon size={10} strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={s.mosaicEmpty}>
            <Building2 size={32} strokeWidth={1.25} aria-hidden style={{ color: 'var(--at-fg-faint)' }} />
            <span className={s.mosaicEmpty__title}>
              {query ? 'صرافی‌ای با این جستجو یافت نشد' : 'هنوز صرافی‌ای اضافه نشده'}
            </span>
            <span className={s.mosaicEmpty__sub}>
              {query
                ? 'فیلتر یا کلیدواژه را تغییر دهید تا نتیجه‌ای پیدا شود.'
                : 'اولین صرافی شبکه را ایجاد کنید تا دفتر شکل بگیرد.'}
            </span>
            {!query && (
              <button
                type="button"
                className={s.addBtn}
                style={{ marginBlockStart: 6 }}
                onClick={() => { setEditRow(null); setDrawerOpen(true); }}
              >
                <Plus size={13} strokeWidth={2.5} aria-hidden /> صراف جدید
              </button>
            )}
            {query && (
              <button
                type="button"
                className={s.tile__actBtn}
                onClick={() => { setQuery(''); setStatusFilter('all'); }}
              >
                پاک کردن فیلتر
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── 6. Spotlight + Network Summary ───────────────────────────── */}
      <div className={s.spotlight}>
        {stats.lead ? (
          <SpotlightCard
            id={stats.lead.id}
            name={stats.lead.name}
            slug={stats.lead.slug}
            city={stats.lead.city}
            status={stats.lead.status}
            customers={stats.lead._count?.Customer ?? 0}
            transactions={stats.lead._count?.Transaction ?? 0}
            platformFee={stats.lead.platformFee}
            growthSeries={seedSeries((stats.lead._count?.Customer ?? 0) + 7, 14)}
          />
        ) : (
          <div className={s.placeholder}>صرافی برجسته‌ای برای نمایش وجود ندارد.</div>
        )}

        {/* خلاصهٔ شبکه */}
        <section
          aria-label="خلاصهٔ شبکه"
          style={{
            position: 'relative',
            padding: 'var(--ds-space-5)',
            background: 'var(--at-surface)',
            border: '1px solid var(--at-line)',
            borderRadius: 'var(--nx-radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--ds-space-3)',
            boxShadow: 'var(--nx-shadow)',
            overflow: 'hidden',
            isolation: 'isolate',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 80% 60% at 0% 100%, var(--at-accent-soft), transparent 60%)',
              opacity: 0.55,
              pointerEvents: 'none',
            }}
            aria-hidden
          />
          <div
            style={{
              position: 'absolute',
              insetBlockStart: 0,
              insetInlineStart: 0,
              inlineSize: '100%',
              blockSize: 2,
              background: 'linear-gradient(90deg, var(--at-accent), var(--at-gold), var(--at-accent))',
              backgroundSize: '200% 100%',
              animation: 'nxShine 6s linear infinite',
              opacity: 0.7,
            }}
            aria-hidden
          />
          <header style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--at-accent)',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Wallet size={11} strokeWidth={2} aria-hidden /> SUMMARY
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: 'var(--ds-text-lg)',
                fontWeight: 800,
                color: 'var(--at-fg)',
                letterSpacing: '-0.02em',
              }}
            >
              وضعیت کلی پلتفرم
            </h3>
          </header>

          {[
            { label: 'کل مشتریان شبکه', value: fmt(stats.totalCustomers), icon: Users, color: 'var(--at-accent)' },
            { label: 'صرافی‌های فعال', value: fmt(stats.active), icon: CircleCheck, color: 'var(--at-accent)' },
            { label: 'در انتظار تأیید', value: fmt(stats.pending), icon: Activity, color: 'var(--at-gold)' },
            { label: 'بسته / آرشیو', value: fmt(stats.closed), icon: Circle, color: 'var(--at-fg-faint)' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'var(--at-bg-deep)',
                borderRadius: 10,
                border: '1px solid var(--at-line)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  inlineSize: 30,
                  blockSize: 30,
                  borderRadius: 8,
                  background: `color-mix(in oklch, ${color} 12%, transparent)`,
                  color,
                  flexShrink: 0,
                }}
              >
                <Icon size={13} strokeWidth={1.75} aria-hidden />
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 'var(--ds-text-sm)',
                  color: 'var(--at-fg-muted)',
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 'var(--ds-text-base)',
                  fontWeight: 800,
                  color: 'var(--at-fg)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {value}
              </span>
            </div>
          ))}

          <div
            style={{
              position: 'relative',
              paddingTop: 8,
              borderTop: '1px dashed var(--at-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10,
              color: 'var(--at-fg-subtle)',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={10} strokeWidth={1.75} aria-hidden /> آخرین به‌روزرسانی
            </span>
            <span className="tabular-nums">{relativeTime(new Date())}</span>
          </div>
        </section>
      </div>

      {/* ── 7. Network Heatmap (نوآوری) ───────────────────────────────── */}
      <NetworkHeatmap active={stats.active} />

      {/* ── Drawer ──────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <ExchangeDrawer
          open={drawerOpen}
          initialData={editRow}
          saving={saving}
          onClose={() => { setDrawerOpen(false); setEditRow(null); }}
          onSave={handleSave}
        />
      )}

      {/* ── Delete confirm ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="حذف صرافی"
        description={
          deleteTarget
            ? `صرافی «${deleteTarget.name}» و تمام داده‌های آن برای همیشه حذف می‌شوند. این عملیات برگشت‌پذیر نیست.`
            : ''
        }
        confirmLabel="بله، حذف کن"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
