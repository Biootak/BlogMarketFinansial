'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  Eye,
  Filter,
  Flame,
  Inbox,
  Megaphone,
  MousePointerClick,
  PencilLine,
  Plus,
  Radio,
  Send,
  Sparkles,
  Target,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';
import {
  type ActivityStreamItem,
  ActivityStream,
  type BroadcastChannel,
  BroadcastPulse,
  type ChannelRingSegment,
  ChannelRing,
  type FilterPillItem,
  FilterPills,
  HUB_PALETTES,
  HubShell,
  LiveDot,
  type PillTabItem,
  ThroughputBars,
  toOklch,
} from '@/components/Dashboard/PlatformHub';
import { Section, EmptyState, Spotlight, StatCard, StatGrid, GeometricAccent } from '@/components/Dashboard/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import s from './CommunicationHub.module.css';

type Announcement = {
  id: string;
  title: string;
  body: string;
  channels: ('inapp' | 'email' | 'push' | 'sms')[];
  audience: 'all' | 'role' | 'segment';
  audienceFilter: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

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
  createdById: string;
  createdAt: string;
};

export interface ChannelMixData {
  channels: Array<{
    id: 'push' | 'email' | 'sms' | 'inapp';
    label: string;
    tone: 'emerald' | 'indigo' | 'amber' | 'violet';
    announcementCount: number;
    campaignCount: number;
    sent: number;
    recipients: number;
  }>;
  total: { sent: number; recipients: number; announcements: number; campaigns: number };
}

export interface CommunicationHubData {
  generatedAt: string;
  announcements: Announcement[];
  campaigns: Campaign[];
  metrics: {
    publishedAnnouncements: number;
    scheduledAnnouncements: number;
    draftAnnouncements: number;
    activeCampaigns: number;
    totalRecipients: number;
    totalSent: number;
    openRate: number;
    clickRate: number;
  };
  series24h: number[];
  recentActivity: Array<{
    id: string;
    at: string;
    title: string;
    detail?: string;
    tone?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'violet';
  }>;
  channelMix: ChannelMixData;
  /** تعداد واقعی سگمنت‌های تعریف‌شده (برای نمایش در quick nav) */
  audienceCount?: number;
  /** تعداد کل کاربران فعال پلتفرم */
  totalUsers?: number;
}

interface CommunicationHubProps {
  initialData: CommunicationHubData;
}

const TABS: PillTabItem[] = [
  { id: 'overview', label: 'نمای کلی' },
  { id: 'announcements', label: 'اعلان‌ها', icon: <Megaphone size={14} aria-hidden /> },
  { id: 'campaigns', label: 'کمپین‌ها', icon: <Sparkles size={14} aria-hidden /> },
];

const STATUS_TONES: Record<Announcement['status'], 'emerald' | 'indigo' | 'amber' | 'rose' | 'neutral'> = {
  published: 'emerald',
  scheduled: 'indigo',
  draft: 'amber',
  archived: 'neutral',
};

const STATUS_LABELS: Record<Announcement['status'], string> = {
  published: 'منتشر شده',
  scheduled: 'زمان‌بندی شده',
  draft: 'پیش‌نویس',
  archived: 'آرشیو',
};

const AUDIENCE_LABELS: Record<Announcement['audience'], string> = {
  all: 'همه',
  role: 'بر اساس نقش',
  segment: 'سگمنت',
};

const CHANNEL_LABELS: Record<'inapp' | 'email' | 'push' | 'sms', string> = {
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  inapp: 'In-app',
};

const CHANNEL_TONE: Record<'inapp' | 'email' | 'push' | 'sms', 'emerald' | 'indigo' | 'amber' | 'violet'> = {
  push: 'emerald',
  email: 'indigo',
  sms: 'amber',
  inapp: 'violet',
};

const CHANNEL_GLYPH: Record<'inapp' | 'email' | 'push' | 'sms', typeof Megaphone> = {
  push: Radio,
  email: Send,
  sms: Zap,
  inapp: Eye,
};

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

function buildActivity(items: CommunicationHubData['recentActivity']): ActivityStreamItem[] {
  return items.map((a) => ({
    id: a.id,
    at: a.at,
    title: a.title,
    detail: a.detail,
    tone: a.tone,
  }));
}

function primaryChannel(a: Announcement): 'inapp' | 'email' | 'push' | 'sms' {
  return (a.channels[0] ?? 'inapp') as 'inapp' | 'email' | 'push' | 'sms';
}

export function CommunicationHub({ initialData }: CommunicationHubProps) {
  const [tab, setTab] = useState<string>('overview');
  const [filter, setFilter] = useState<string>('all');
  const data = initialData;
  const palette = HUB_PALETTES.communication;

  // ── KPI strip — فقط ۴ عدد (نه ۶ کارت تکراری) ─────────────────────
  const queueDepth = data.metrics.scheduledAnnouncements + data.metrics.draftAnnouncements;

  // ── Filter pills ─────────────────────────────────────────────
  const filters: FilterPillItem[] = useMemo(() => {
    const counts: Record<string, number> = {
      all: data.announcements.length,
      published: data.announcements.filter((a) => a.status === 'published').length,
      scheduled: data.announcements.filter((a) => a.status === 'scheduled').length,
      draft: data.announcements.filter((a) => a.status === 'draft').length,
      archived: data.announcements.filter((a) => a.status === 'archived').length,
    };
    return [
      { id: 'all', label: 'همه', count: counts.all },
      { id: 'published', label: 'منتشر شده', count: counts.published, tone: 'emerald' },
      { id: 'scheduled', label: 'زمان‌بندی', count: counts.scheduled, tone: 'indigo' },
      { id: 'draft', label: 'پیش‌نویس', count: counts.draft, tone: 'amber' },
      { id: 'archived', label: 'آرشیو', count: counts.archived },
    ];
  }, [data]);

  const filtered = useMemo(() => {
    if (filter === 'all') return data.announcements;
    return data.announcements.filter((a) => a.status === filter);
  }, [filter, data]);

  // ── Broadcast channels (4 nodes) ─────────────────────────────
  const broadcastChannels: BroadcastChannel[] = useMemo(() => {
    return data.channelMix.channels.map((c) => {
      // استفاده از `sent` اگر موجود، در غیر این صورت `announcementCount * 10` (تخمین)
      const value = c.sent > 0 ? c.sent : c.announcementCount * 10 + c.campaignCount * 5;
      const unit = c.sent > 0 ? 'ارسال' : 'پیام';
      return {
        id: c.id,
        label: c.label,
        value,
        unit,
        tone: c.tone,
      };
    });
  }, [data]);

  // ── Channel ring segments ───────────────────────────────────
  const ringSegments: ChannelRingSegment[] = useMemo(() => {
    return data.channelMix.channels
      .filter((c) => c.sent > 0)
      .map((c) => ({
        id: c.id,
        label: c.label,
        value: c.sent,
        tone: c.tone,
      }));
  }, [data]);

  // ── Funnel: sent → opened → clicked → bounced ───────────────
  const funnel = useMemo(() => {
    const sent = data.metrics.totalSent;
    const opened = Math.round((data.metrics.openRate / 100) * sent);
    const clicked = Math.round((data.metrics.clickRate / 100) * sent);
    const bounced = data.campaigns.reduce((s, c) => s + c.stats.bounced, 0);
    return { sent, opened, clicked, bounced };
  }, [data]);

  // ── Throughput 24h (بازنویسی برای استفاده از campaign stats واقعی) ──
  const series24h = data.series24h;

  return (
    <HubShell
      meta={{
        eyebrow: 'مرکز ارتباطات پلتفرم',
        title: 'مرکز ارتباطات',
        subtitle:
          'صدای پلتفرم، هدایت‌شده. اعلان‌ها، کمپین‌ها و کانال‌های ارتباطی را از یک نقطه کنترل کنید. هر پیام، هر مخاطب، هر کانال — در یک نگاه.',
        breadcrumb: [
          { href: '/dashboard', label: 'داشبورد' },
          { label: 'مرکز ارتباطات' },
        ],
        badges: [
          { label: 'سیستم فعال', tone: 'emerald', live: true },
          { label: 'همگام با صف ارسال', tone: 'indigo' },
        ],
        actions: (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/communication/announcements">
                <Megaphone size={14} aria-hidden />
                فهرست اعلان‌ها
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
      {/* ── KPI Strip: فقط ۴ عدد — کم‌حجم‌تر، شفاف‌تر ──────────────── */}
      <StatGrid className={s.kpiGrid} cols={4}>
        <StatCard
          label="دسترسی کل"
          value={data.metrics.totalRecipients}
          icon={Users}
          info="گیرندگان یکتا"
          format="persian"
        />
        <StatCard
          label="ارسال موفق"
          value={data.metrics.totalSent}
          icon={Send}
          info="در ۳۰ روز گذشته"
          format="persian"
        />
        <StatCard
          label="نرخ باز شدن"
          value={data.metrics.openRate}
          icon={MousePointerClick}
          info="میانگین کمپین‌ها"
          format="percent"
        />
        <StatCard
          label="صف انتشار"
          value={queueDepth}
          icon={CalendarClock}
          info="زمان‌بندی + پیش‌نویس"
          format="persian"
        />
      </StatGrid>

      {/* ── Signature: Broadcast Console (برج پخش + ۴ ماهواره) ────── */}
      <Section
        title="کنسول پخش"
        description="مرکز ارسال پیام — هر کانال یک ایستگاه، هر پیام یک موج. فعال‌ترین کانال بزرگ‌ترین میدان را دارد."
        actions={
          <span className={s.liveTag}>
            <LiveDot tone="emerald" size="xs" />
            همین لحظه
          </span>
        }
        icon={Radio}
      >
        <Card className={s.broadcastCard}>
          <Spotlight tone="emerald" />
          <GeometricAccent variant="qtr" position="tr" />
          <GeometricAccent variant="dot" position="bl" />
          <CardContent className={s.broadcastContent}>
            <div className={s.broadcastLayout}>
              <div className={s.broadcastLeft}>
                <BroadcastPulse
                  channels={broadcastChannels}
                  total={{ sent: data.metrics.totalSent, recipients: data.metrics.totalRecipients }}
                  centerLabel="مرکز پخش"
                  ariaLabel="نمودار برج پخش و کانال‌ها"
                />
              </div>
              <div className={s.broadcastRight}>
                {/* Quick Navigation Grid */}
                <ul className={s.quickNav}>
                  <li>
                    <Link href="/dashboard/communication/announcements" className={s.quickNavItem} data-tone="emerald">
                      <span className={s.quickNavIcon}><Megaphone size={18} aria-hidden /></span>
                      <span className={s.quickNavBody}>
                        <span className={s.quickNavLabel}>اعلان‌ها</span>
                        <span className={s.quickNavValue}>{fmtPersian(data.announcements.length)} مورد</span>
                      </span>
                      <ChevronLeft size={16} className={s.quickNavArrow} aria-hidden />
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/communication/campaigns" className={s.quickNavItem} data-tone="indigo">
                      <span className={s.quickNavIcon}><Sparkles size={18} aria-hidden /></span>
                      <span className={s.quickNavBody}>
                        <span className={s.quickNavLabel}>کمپین‌ها</span>
                        <span className={s.quickNavValue}>{fmtPersian(data.campaigns.length)} مورد</span>
                      </span>
                      <ChevronLeft size={16} className={s.quickNavArrow} aria-hidden />
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/communication/audiences" className={s.quickNavItem} data-tone="violet">
                      <span className={s.quickNavIcon}><Target size={18} aria-hidden /></span>
                      <span className={s.quickNavBody}>
                        <span className={s.quickNavLabel}>مخاطبان</span>
                        <span className={s.quickNavValue}>
                          {fmtPersian(data.audienceCount ?? 0)} سگمنت
                        </span>
                      </span>
                      <ChevronLeft size={16} className={s.quickNavArrow} aria-hidden />
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/communication/campaigns/create" className={s.quickNavItem} data-tone="amber">
                      <span className={s.quickNavIcon}><PencilLine size={18} aria-hidden /></span>
                      <span className={s.quickNavBody}>
                        <span className={s.quickNavLabel}>ساخت پیام</span>
                        <span className={s.quickNavValue}>پیش‌نویس یا انتشار</span>
                      </span>
                      <ChevronLeft size={16} className={s.quickNavArrow} aria-hidden />
                    </Link>
                  </li>
                </ul>

                {/* Channel share bar (horizontal) */}
                <div className={s.channelShare}>
                  <div className={s.channelShareHead}>
                    <span className={s.channelShareTitle}>سهم کانال‌ها</span>
                    <span className={s.channelShareSub}>از کل اعلان‌های فعال</span>
                  </div>
                  <div className={s.channelShareBar}>
                    {(() => {
                      const total = data.channelMix.channels.reduce((s, c) => s + c.announcementCount, 0) || 1;
                      return data.channelMix.channels.map((c) => {
                        const pct = (c.announcementCount / total) * 100;
                        return pct > 0 ? (
                          <span
                            key={c.id}
                            className={s.channelShareSeg}
                            data-tone={c.tone}
                            style={{ flexGrow: Math.max(0.3, pct) }}
                            title={`${c.label}: ${fmtPersian(c.announcementCount)} اعلان`}
                          />
                        ) : null;
                      });
                    })()}
                  </div>
                  <ul className={s.channelShareLegend}>
                    {data.channelMix.channels.map((c) => (
                      <li key={c.id}>
                        <span className={s.channelShareDot} data-tone={c.tone} />
                        <span className={s.channelShareLabel}>{c.label}</span>
                        <span className={s.channelShareCount}>
                          {fmtPersian(c.announcementCount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ── Two-column row: throughput + activity ───────────────────── */}
      <div className={s.dualRow}>
        {/* Throughput 24h + funnel */}
        <Section
          title="جریان ۲۴ ساعته"
          description="نمودار ارسال پیام در ۲۴ ساعت گذشته — پیک ساعتی قابل مشاهده است."
          icon={Activity}
          className={s.dualCol}
        >
          <Card className={s.throughputCard}>
            <CardContent className={s.throughputContent}>
              <div className={s.throughputChart}>
                <ThroughputBars
                  values={series24h}
                  height={120}
                  tone="emerald"
                  ariaLabel="نمودار ۲۴ ساعته ارسال"
                />
              </div>
              <div className={s.throughputStats}>
                <div className={s.throughputPeak}>
                  <span className={s.throughputPeakKey}>ساعت اوج</span>
                  <span className={s.throughputPeakVal}>
                    {(() => {
                      const peakIdx = series24h.indexOf(Math.max(...series24h));
                      const totalHrs = series24h.length;
                      const hour = (new Date().getHours() - (totalHrs - 1 - peakIdx) + 24) % 24;
                      return `${fmtPersian(hour)}:۰۰`;
                    })()}
                  </span>
                </div>
                <div className={s.throughputPeak}>
                  <span className={s.throughputPeakKey}>میانگین</span>
                  <span className={s.throughputPeakVal}>
                    {fmtPersian(Math.round(series24h.reduce((s, v) => s + v, 0) / Math.max(1, series24h.length)))}
                  </span>
                </div>
                <div className={s.throughputPeak}>
                  <span className={s.throughputPeakKey}>اوج</span>
                  <span className={s.throughputPeakVal}>
                    {fmtPersian(Math.max(...series24h, 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Activity stream */}
        <Section
          title="گزارش زنده"
          description="فعالیت اخیر سیستم ارتباطی"
          actions={
            <span className={s.liveTag}>
              <LiveDot tone="emerald" size="xs" />
              همین لحظه
            </span>
          }
          icon={Inbox}
          className={s.dualCol}
        >
          <Card className={s.activityCard}>
            <Spotlight tone="emerald" />
            <CardContent className={s.activityContent}>
              <ActivityStream items={buildActivity(data.recentActivity)} maxHeight={300} />
            </CardContent>
          </Card>
        </Section>
      </div>

      {/* ── Funnel: Sent → Opened → Clicked + Channel ring ──────────── */}
      <Section
        title="قیف تأثیر"
        description="از ارسال تا کلیک — هر مرحله یک فیلتر طبیعی."
        icon={Flame}
      >
        <Card className={s.funnelCard}>
          <CardContent className={s.funnelContent}>
            <ul className={s.funnelList}>
              <li className={s.funnelRow} data-stage="sent">
                <span className={s.funnelLabel}>
                  <Send size={14} aria-hidden /> ارسال‌شده
                </span>
                <div className={s.funnelBar}>
                  <span className={s.funnelBarFill} style={{ width: '100%' }} />
                </div>
                <span className={s.funnelVal}>{fmtPersian(funnel.sent)}</span>
              </li>
              <li className={s.funnelRow} data-stage="opened">
                <span className={s.funnelLabel}>
                  <Eye size={14} aria-hidden /> باز شده
                </span>
                <div className={s.funnelBar}>
                  <span
                    className={s.funnelBarFill}
                    style={{ width: `${data.metrics.openRate}%` }}
                  />
                </div>
                <span className={s.funnelVal}>{fmtPersian(funnel.opened)}</span>
                <span className={s.funnelPct}>{fmtPersian(data.metrics.openRate)}٪</span>
              </li>
              <li className={s.funnelRow} data-stage="clicked">
                <span className={s.funnelLabel}>
                  <MousePointerClick size={14} aria-hidden /> کلیک‌شده
                </span>
                <div className={s.funnelBar}>
                  <span
                    className={s.funnelBarFill}
                    style={{ width: `${data.metrics.clickRate}%` }}
                  />
                </div>
                <span className={s.funnelVal}>{fmtPersian(funnel.clicked)}</span>
                <span className={s.funnelPct}>{fmtPersian(data.metrics.clickRate)}٪</span>
              </li>
              <li className={s.funnelRow} data-stage="bounced">
                <span className={s.funnelLabel}>
                  <TrendingDown size={14} aria-hidden /> بازگشتی
                </span>
                <div className={s.funnelBar}>
                  <span
                    className={s.funnelBarFill}
                    data-tone="rose"
                    style={{ width: `${funnel.sent > 0 ? Math.min(100, (funnel.bounced / funnel.sent) * 100) : 0}%` }}
                  />
                </div>
                <span className={s.funnelVal}>{fmtPersian(funnel.bounced)}</span>
              </li>
            </ul>
            {ringSegments.length > 0 ? (
              <div className={s.funnelRing}>
                <ChannelRing
                  segments={ringSegments}
                  size={140}
                  thickness={12}
                  centerLabel="ارسال‌ها"
                  centerValue={fmtPersian(funnel.sent)}
                  ariaLabel="ترکیب کانال‌های ارسال"
                />
                <ul className={s.funnelRingLegend}>
                  {ringSegments.map((seg) => (
                    <li key={seg.id}>
                      <span className={s.funnelRingDot} data-tone={seg.tone} />
                      <span className={s.funnelRingLabel}>{seg.label}</span>
                      <span className={s.funnelRingVal}>{fmtPersian(seg.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </Section>

      {/* ── Filtered list section: announcements with filter pills ──────── */}
      <Section
        title="صف انتشار"
        description="اعلان‌های اخیر بر اساس وضعیت — اولویت با منتشرشده‌ها."
        actions={
          <FilterPills
            items={filters}
            active={filter}
            onChange={setFilter}
            ariaLabel="فیلتر اعلان‌ها"
          />
        }
        icon={Filter}
      >
        {filtered.length === 0 ? (
          <EmptyState
            title="اعلانی برای این فیلتر یافت نشد"
            description="وضعیت فیلتر را تغییر دهید یا اعلان جدیدی ایجاد کنید."
            icon={Megaphone}
            action={
              <Button asChild size="sm">
                <Link href="/dashboard/communication/campaigns/new">
                  <Plus size={14} aria-hidden />
                  اعلان جدید
                </Link>
              </Button>
            }
          />
        ) : (
          <ul className={s.annList}>
            {filtered.slice(0, 8).map((a) => {
              const ch = primaryChannel(a);
              const Icon = CHANNEL_GLYPH[ch];
              const tone = STATUS_TONES[a.status];
              return (
                <li
                  key={a.id}
                  className={s.annItem}
                  data-tone={tone}
                >
                  <span className={s.annGlyph} data-tone={CHANNEL_TONE[ch]}>
                    <Icon size={16} aria-hidden />
                  </span>
                  <div className={s.annBody}>
                    <div className={s.annTitle}>{a.title}</div>
                    <div className={s.annMeta}>
                      <span className={s.annStatus} data-tone={tone}>
                        {STATUS_LABELS[a.status]}
                      </span>
                      <span className={s.annAudience}>
                        {AUDIENCE_LABELS[a.audience]}
                      </span>
                      <span className={s.annChannels}>
                        {a.channels.map((c) => CHANNEL_LABELS[c]).join(' / ')}
                      </span>
                    </div>
                  </div>
                  <div className={s.annStats}>
                    <span>
                      <span className={s.annStatKey}>تاریخ</span>
                      <span className={s.annStatVal}>
                        {new Date(a.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </span>
                    <span>
                      <span className={s.annStatKey}>کانال</span>
                      <span className={s.annStatVal}>{a.channels.length}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {filtered.length > 8 ? (
          <div className={s.seeMore}>
            <Link href="/dashboard/communication/announcements" className={s.seeMoreLink}>
              مشاهده همه ({fmtPersian(filtered.length)})
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        ) : null}
      </Section>
    </HubShell>
  );
}
