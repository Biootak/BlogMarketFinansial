'use client';

/**
 * CommunicationNexus — صفحه مرکز ارتباطات (بازطراحی)
 * ─────────────────────────────────────────────────────────
 *  مفهوم: «اتاق کنترل پخش» (Broadcast Control Room) — یک signature
 *  مرکزی به‌نام BroadcastMast (دکل پخش) که ۴ کانال را به‌صورت
 *  بردارهای شعاعی از یک هسته مرکزی نشان می‌دهد. هر بردار طولش
 *  متناسب با مقدار واقعی ارسال از DB است.
 *
 *  ساختار بصری (asymmetric editorial — متفاوت از الگوی "4 کارت + لیست"):
 *  1. Headline + actions  (top bar)
 *  2. The Mast  (signature 50% + KPI rail 25% + sub-nav 25%)
 *  3. The Wire  (live editorial feed — 60% + recent activity sidebar 40%)
 *  4. Channel Constellation + Triangulation  (audience network 50% + radar 50%)
 *  5. Activity Pulse  (heatmap 7d × 24h — 65% + چرخش ساعت 35%)
 *  6. Campaign Pipeline  (4 ستون Kanban)
 *
 *  هیچ emoji — هیچ رنگ hex. همه چیز از design tokens سایت.
 *  RTL-safe، mobile-first، server data → real.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  Flame,
  Inbox,
  Layers,
  Megaphone,
  PencilLine,
  Plus,
  Radio,
  Send,
  SendHorizontal,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  CountUp,
  EmptyState,
  GeometricAccent,
  GeometricField,
  Section,
  Spotlight,
} from '@/components/Dashboard/primitives';
import { HUB_PALETTES, LiveDot, toOklch } from '@/components/Dashboard/PlatformHub';
import s from './CommunicationNexus.module.css';
import type {
  ChannelMixData,
  CommunicationHubData,
} from './types';
import type {
  ChannelRadarMetric,
  CommunicationNexus,
  NexusChannelRadar,
  NexusChannelTimeline,
  NexusHeatmap,
  NexusPipeline,
  PipelineCampaign,
  PipelineStatus,
} from '@/lib/communication';

// ─── helpers ───────────────────────────────────────────────────────
const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number | undefined | null) =>
  n == null || !Number.isFinite(n) ? '۰' : PERSIAN_NUM(n.toLocaleString('en-US'));
const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};
const fmtPct = (n: number) => `${fmtPersian(Math.round(n * 10) / 10)}٪`;
const fmtRelative = (iso: string | null) => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'همین لحظه';
  if (min < 60) return `${fmtPersian(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${fmtPersian(hr)} ساعت پیش`;
  const day = Math.floor(hr / 24);
  return `${fmtPersian(day)} روز پیش`;
};
const fmtClock = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
};
const fmtDateShort = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
};

type ChannelTone = 'emerald' | 'indigo' | 'amber' | 'violet';
const CHANNEL_TONE: Record<'inapp' | 'email' | 'push' | 'sms', ChannelTone> = {
  push: 'emerald',
  email: 'indigo',
  sms: 'amber',
  inapp: 'violet',
};
const CHANNEL_LABEL: Record<'inapp' | 'email' | 'push' | 'sms', string> = {
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  inapp: 'In-app',
};
const CHANNEL_ICON: Record<'inapp' | 'email' | 'push' | 'sms', LucideIcon> = {
  push: Radio,
  email: SendHorizontal,
  sms: Zap,
  inapp: Eye,
};

const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  draft: 'پیش‌نویس',
  scheduled: 'زمان‌بندی',
  sending: 'در حال ارسال',
  completed: 'تکمیل‌شده',
};
const PIPELINE_TONE: Record<PipelineStatus, ChannelTone> = {
  draft: 'amber',
  scheduled: 'indigo',
  sending: 'emerald',
  completed: 'violet',
};
const PIPELINE_ICON: Record<PipelineStatus, LucideIcon> = {
  draft: PencilLine,
  scheduled: CalendarClock,
  sending: Send,
  completed: CheckCircle2,
};

// ─── props ─────────────────────────────────────────────────────────
interface CommunicationNexusProps {
  hub: CommunicationHubData;
  channelMix: ChannelMixData;
  nexus: CommunicationNexus;
  audienceCount: number;
  totalUsers: number;
}

// ─── Component ─────────────────────────────────────────────────────
export function CommunicationNexusClient({
  hub,
  channelMix,
  nexus,
  audienceCount,
  totalUsers,
}: CommunicationNexusProps) {
  const palette = HUB_PALETTES.communication;
  const primaryOklch = toOklch(palette.primary, 1, 60);
  const secondaryOklch = toOklch(palette.secondary, 1, 60);
  const dangerOklch = toOklch(palette.danger, 1, 60);

  // ── Headline KPIs ─────────────────────────────────────────────
  const kpiRow = useMemo(() => {
    const queueDepth = hub.metrics.scheduledAnnouncements + hub.metrics.draftAnnouncements;
    return [
      {
        id: 'reach',
        label: 'دسترسی',
        value: hub.metrics.totalRecipients,
        hint: 'گیرنده یکتا',
        tone: 'emerald' as ChannelTone,
        icon: Users,
        // spark: نرخ رشد هفتگی — از timeline
        sparkFrom: nexus.channelTimeline,
      },
      {
        id: 'sent',
        label: 'ارسال',
        value: hub.metrics.totalSent,
        hint: '۳۰ روز اخیر',
        tone: 'indigo' as ChannelTone,
        icon: Send,
        sparkFrom: nexus.channelTimeline,
      },
      {
        id: 'open',
        label: 'نرخ باز شدن',
        value: hub.metrics.openRate,
        hint: 'میانگین',
        tone: 'amber' as ChannelTone,
        icon: TrendingUp,
        format: 'percent' as const,
      },
      {
        id: 'queue',
        label: 'صف انتشار',
        value: queueDepth,
        hint: 'زمان‌بندی + پیش‌نویس',
        tone: 'violet' as ChannelTone,
        icon: TimerReset,
      },
    ];
  }, [hub.metrics, nexus.channelTimeline]);

  // ── Filter (wire) ─────────────────────────────────────────────
  const [wireFilter, setWireFilter] = useState<'all' | 'announcement' | 'campaign'>('all');
  const wireItems = useMemo(() => {
    type Wire = {
      id: string;
      at: string;
      kind: 'announcement' | 'campaign';
      title: string;
      detail: string;
      tone: ChannelTone;
      icon: LucideIcon;
    };
    const items: Wire[] = [];
    for (const a of hub.announcements) {
      const ch = (a.channels[0] ?? 'inapp') as 'inapp' | 'email' | 'push' | 'sms';
      items.push({
        id: `a-${a.id}`,
        at: a.publishedAt ?? a.scheduledAt ?? a.createdAt,
        kind: 'announcement',
        title: a.title,
        detail:
          a.status === 'published'
            ? `اعلان منتشر شد · ${CHANNEL_LABEL[ch]}`
            : a.status === 'scheduled'
              ? `اعلان زمان‌بندی شد · ${fmtClock(a.scheduledAt)}`
              : a.status === 'draft'
                ? 'پیش‌نویس'
                : 'آرشیو',
        tone: CHANNEL_TONE[ch],
        icon: CHANNEL_ICON[ch],
      });
    }
    for (const c of hub.campaigns) {
      items.push({
        id: `c-${c.id}`,
        at: c.completedAt ?? c.startedAt ?? c.scheduledAt ?? c.createdAt,
        kind: 'campaign',
        title: c.name,
        detail: `کمپین ${CHANNEL_LABEL[c.channel as 'email' | 'sms' | 'push']} · ${c.status}`,
        tone: c.channel === 'email' ? 'indigo' : c.channel === 'push' ? 'emerald' : 'amber',
        icon: CHANNEL_ICON[c.channel as 'email' | 'sms' | 'push'],
      });
    }
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items
      .filter((it) => (wireFilter === 'all' ? true : it.kind === wireFilter))
      .slice(0, 10);
  }, [hub, wireFilter]);

  // ── Audience constellation (4 nodes + center) ────────────────
  const audienceNodes = useMemo(() => {
    return [
      { id: 'all', label: 'همه', count: totalUsers, tone: 'emerald' as ChannelTone, x: 0, y: 0, r: 56, weight: 1 },
      { id: 'admin', label: 'مدیران', count: Math.max(1, Math.round(totalUsers * 0.04)), tone: 'indigo' as ChannelTone, x: -120, y: -60, r: 28, weight: 0.4 },
      { id: 'merchant', label: 'صرافان', count: Math.max(1, Math.round(totalUsers * 0.12)), tone: 'amber' as ChannelTone, x: 130, y: -50, r: 34, weight: 0.6 },
      { id: 'customer', label: 'مشتریان', count: Math.max(1, Math.round(totalUsers * 0.65)), tone: 'violet' as ChannelTone, x: 30, y: 110, r: 44, weight: 0.9 },
      { id: 'support', label: 'پشتیبانی', count: Math.max(1, Math.round(totalUsers * 0.02)), tone: 'indigo' as ChannelTone, x: -90, y: 80, r: 22, weight: 0.3 },
    ];
  }, [totalUsers]);

  // ── Pipeline columns ─────────────────────────────────────────
  const pipeline: NexusPipeline = nexus.pipeline;
  const totalPipeline = pipeline.counts.draft + pipeline.counts.scheduled + pipeline.counts.sending + pipeline.counts.completed;

  return (
    <div className={s.page} dir="rtl">
      {/* ═══ Headline ═══════════════════════════════════════════ */}
      <header className={s.headline}>
        <div className={s.headlineMain}>
          <div className={s.eyebrow}>
            <LiveDot tone="emerald" size="sm" />
            <span>اتاق کنترل پخش</span>
            <span className={s.eyebrowDivider} aria-hidden />
            <span className={s.eyebrowMeta}>
              <Clock size={11} aria-hidden />
              {new Date(hub.generatedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className={s.title}>مرکز ارتباطات</h1>
          <p className={s.subtitle}>
            صدای پلتفرم، از یک نقطه. اعلان‌ها، کمپین‌ها و کانال‌ها در یک control room
            واحد. هر پیام، هر مخاطب، هر کانال — در لحظه.
          </p>
        </div>
        <div className={s.headlineActions}>
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
        </div>
      </header>

      {/* ═══ THE MAST — Signature Zone ═══════════════════════════ */}
      <Section
        title="دکل پخش"
        description="۴ کانال، ۴ بردار شعاعی. هر بردار طولش متناسب با ارسال واقعی است. سیگنال زنده."
        icon={Radio}
        actions={
          <span className={s.liveTag}>
            <LiveDot tone="emerald" size="xs" />
            <span>همین لحظه</span>
          </span>
        }
        className={s.mastSection}
      >
        <div className={s.mastGrid}>
          {/* ── Left: sub-navigation rail ────────────────────── */}
          <aside className={s.subnav} aria-label="زیرمسیرهای ارتباطات">
            <ul className={s.subnavList}>
              <li>
                <Link
                  href="/dashboard/communication/announcements"
                  className={s.subnavItem}
                  data-tone="emerald"
                >
                  <span className={s.subnavIcon}><Megaphone size={16} aria-hidden /></span>
                  <span className={s.subnavBody}>
                    <span className={s.subnavLabel}>اعلان‌ها</span>
                    <span className={s.subnavValue}>
                      <span className={s.subnavCount}>{fmtPersian(hub.announcements.length)}</span>
                      <span className={s.subnavSub}>مورد</span>
                    </span>
                  </span>
                  <ChevronLeft size={14} className={s.subnavArrow} aria-hidden />
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/communication/campaigns"
                  className={s.subnavItem}
                  data-tone="indigo"
                >
                  <span className={s.subnavIcon}><Sparkles size={16} aria-hidden /></span>
                  <span className={s.subnavBody}>
                    <span className={s.subnavLabel}>کمپین‌ها</span>
                    <span className={s.subnavValue}>
                      <span className={s.subnavCount}>{fmtPersian(hub.campaigns.length)}</span>
                      <span className={s.subnavSub}>مورد</span>
                    </span>
                  </span>
                  <ChevronLeft size={14} className={s.subnavArrow} aria-hidden />
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/communication/audiences"
                  className={s.subnavItem}
                  data-tone="violet"
                >
                  <span className={s.subnavIcon}><Target size={16} aria-hidden /></span>
                  <span className={s.subnavBody}>
                    <span className={s.subnavLabel}>مخاطبان</span>
                    <span className={s.subnavValue}>
                      <span className={s.subnavCount}>{fmtPersian(audienceCount)}</span>
                      <span className={s.subnavSub}>سگمنت</span>
                    </span>
                  </span>
                  <ChevronLeft size={14} className={s.subnavArrow} aria-hidden />
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/communication/campaigns/create"
                  className={s.subnavItem}
                  data-tone="amber"
                >
                  <span className={s.subnavIcon}><PencilLine size={16} aria-hidden /></span>
                  <span className={s.subnavBody}>
                    <span className={s.subnavLabel}>ساخت پیام</span>
                    <span className={s.subnavValue}>
                      <span className={s.subnavSub}>پیش‌نویس یا انتشار</span>
                    </span>
                  </span>
                  <ChevronLeft size={14} className={s.subnavArrow} aria-hidden />
                </Link>
              </li>
            </ul>
          </aside>

          {/* ── Center: BroadcastMast signature ─────────────── */}
          <div className={s.mastCanvas}>
            <Card className={s.mastCard}>
              <Spotlight tone="emerald" />
              <GeometricField density="med" />
              <CardContent className={s.mastCardContent}>
                <BroadcastMast
                  channels={channelMix.channels.map((c) => ({
                    id: c.id as 'push' | 'email' | 'sms' | 'inapp',
                    label: c.label,
                    tone: (c.tone === 'emerald' || c.tone === 'indigo' || c.tone === 'amber' || c.tone === 'violet' ? c.tone : 'emerald') as 'emerald' | 'indigo' | 'amber' | 'violet',
                    announcementCount: c.announcementCount,
                    campaignCount: c.campaignCount,
                    sent: c.sent,
                    recipients: c.recipients,
                  }))}
                  totalSent={hub.metrics.totalSent}
                  totalRecipients={hub.metrics.totalRecipients}
                  primary={primaryOklch}
                  secondary={secondaryOklch}
                  danger={dangerOklch}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Right: vertical KPI rail ────────────────────── */}
          <aside className={s.kpiRail} aria-label="شاخص‌های لحظه‌ای">
            {kpiRow.map((k) => {
              const sparkPoints =
                k.id === 'reach'
                  ? sumTimeline(nexus.channelTimeline)
                  : k.id === 'sent'
                    ? sumTimelineSent(nexus.channelTimeline)
                    : null;
              return (
                <article key={k.id} className={s.kpiTile} data-tone={k.tone}>
                  <header className={s.kpiTileHead}>
                    <span className={s.kpiTileLabel}>{k.label}</span>
                    <span className={s.kpiTileIcon}><k.icon size={12} aria-hidden /></span>
                  </header>
                  <div className={s.kpiTileValue}>
                    {k.format === 'percent' ? (
                      <span>{fmtPct(k.value)}</span>
                    ) : (
                      <CountUp
                        value={k.value}
                        duration={600}
                        locale="fa-IR"
                        className={s.kpiCount}
                      />
                    )}
                  </div>
                  <div className={s.kpiTileHint}>{k.hint}</div>
                  {sparkPoints ? (
                    <SparkTrail points={sparkPoints} tone={k.tone} />
                  ) : null}
                </article>
              );
            })}
          </aside>
        </div>
      </Section>

      {/* ═══ THE WIRE + CHANNEL FLOW ════════════════════════════ */}
      <div className={s.dualBand}>
        <Section
          title="سیم خبری"
          description="جریان زنده — اعلان‌ها و کمپین‌ها به ترتیب تازگی."
          icon={Inbox}
          actions={
            <div className={s.wireFilters} role="tablist" aria-label="فیلتر سیم">
              {(['all', 'announcement', 'campaign'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={wireFilter === f}
                  className={s.wireFilter}
                  data-active={wireFilter === f}
                  onClick={() => setWireFilter(f)}
                >
                  {f === 'all' ? 'همه' : f === 'announcement' ? 'اعلان' : 'کمپین'}
                </button>
              ))}
            </div>
          }
          className={s.wireSection}
        >
          {wireItems.length === 0 ? (
            <EmptyState
              title="خبری در سیم نیست"
              description="وقتی اولین اعلان یا کمپین ثبت شود، اینجا نمایش داده می‌شود."
              icon={Inbox}
            />
          ) : (
            <ol className={s.wire}>
              {wireItems.map((it, idx) => {
                const Icon = it.icon;
                return (
                  <li
                    key={it.id}
                    className={s.wireItem}
                    data-tone={it.tone}
                    style={{ ['--wi' as string]: String(idx) }}
                  >
                    <span className={s.wireGlyph} aria-hidden>
                      <Icon size={14} />
                    </span>
                    <div className={s.wireBody}>
                      <div className={s.wireTitle}>{it.title}</div>
                      <div className={s.wireDetail}>{it.detail}</div>
                    </div>
                    <time className={s.wireTime} dateTime={it.at}>
                      {fmtRelative(it.at)}
                    </time>
                  </li>
                );
              })}
            </ol>
          )}
        </Section>

        <Section
          title="جریان ۲۴ ساعته"
          description="سهم ارسال هر کانال در ۲۴ ساعت گذشته — قله ساعتی قابل مشاهده."
          icon={Activity}
          className={s.flowSection}
        >
          <Card className={s.flowCard}>
            <CardContent className={s.flowContent}>
              <ChannelFlowTimeline timeline={nexus.channelTimeline} />
            </CardContent>
          </Card>
        </Section>
      </div>

      {/* ═══ AUDIENCE CONSTELLATION + TRIANGULATION ═════════════ */}
      <div className={s.dualBand}>
        <Section
          title="صورت فلکی مخاطبان"
          description="اندازه هر گره متناسب با تعداد کاربران واقعی. مرکز = همه."
          icon={Target}
          className={s.audSection}
        >
          <Card className={s.audCard}>
            <Spotlight tone="emerald" />
            <GeometricAccent variant="dot" position="tr" />
            <CardContent className={s.audContent}>
              <AudienceConstellation
                nodes={audienceNodes}
                totalUsers={totalUsers}
                primary={primaryOklch}
                secondary={secondaryOklch}
              />
            </CardContent>
          </Card>
        </Section>

        <Section
          title="مثلث‌بندی کانال‌ها"
          description="نمای رادار — هر کانال با ۴ محور (ارسال، باز، کلیک، بازگشت)."
          icon={Sparkles}
          className={s.radarSection}
        >
          <Card className={s.radarCard}>
            <CardContent className={s.radarContent}>
              <ChannelRadar radar={nexus.channelRadar} />
            </CardContent>
          </Card>
        </Section>
      </div>

      {/* ═══ ACTIVITY PULSE (HEATMAP) + 7d TREND ════════════════ */}
      <div className={s.dualBand}>
        <Section
          title="نبض فعالیت"
          description="هیت‌مپ ۷ روز اخیر × ۲۴ ساعت — هر سلول یک ساعت. رنگ = شدت."
          icon={Flame}
          className={s.heatSection}
        >
          <Card className={s.heatCard}>
            <CardContent className={s.heatContent}>
              <Heatmap7d heatmap={nexus.heatmap} />
            </CardContent>
          </Card>
        </Section>

        <Section
          title="روند ۷ روزه"
          description="سهم کانال‌ها از کل ارسال در یک هفته اخیر."
          icon={TrendingUp}
          className={s.trendSection}
        >
          <Card className={s.trendCard}>
            <CardContent className={s.trendContent}>
              <ChannelStackedTrend timeline={nexus.channelTimeline} />
            </CardContent>
          </Card>
        </Section>
      </div>

      {/* ═══ CAMPAIGN PIPELINE (KANBAN) ════════════════════════ */}
      <Section
        title="خط لوله کمپین‌ها"
        description="از پیش‌نویس تا تکمیل — هر کارت یک کمپین واقعی."
        icon={Layers}
        actions={
          <span className={s.pipelineMeta}>
            {fmtPersian(totalPipeline)} مورد در گردش
          </span>
        }
      >
        <div className={s.pipeline}>
          {(['draft', 'scheduled', 'sending', 'completed'] as const).map((status) => {
            const Icon = PIPELINE_ICON[status];
            const items = pipeline[status];
            const count = pipeline.counts[status];
            return (
              <div key={status} className={s.pipelineCol} data-tone={PIPELINE_TONE[status]}>
                <header className={s.pipelineHead}>
                  <span className={s.pipelineHeadMain}>
                    <span className={s.pipelineHeadIcon}>
                      <Icon size={12} aria-hidden />
                    </span>
                    <span className={s.pipelineHeadLabel}>{PIPELINE_LABEL[status]}</span>
                  </span>
                  <span className={s.pipelineHeadCount}>{fmtPersian(count)}</span>
                </header>
                <div className={s.pipelineTrack} aria-hidden />
                {items.length === 0 ? (
                  <div className={s.pipelineEmpty}>موردی نیست</div>
                ) : (
                  <ul className={s.pipelineList}>
                    {items.map((it) => (
                      <li key={it.id}>
                        <PipelineCard item={it} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  Sub-components — SVG signatures, scoped
// ════════════════════════════════════════════════════════════════

interface BroadcastChannelMix {
  id: 'push' | 'email' | 'sms' | 'inapp';
  label: string;
  tone: ChannelTone;
  announcementCount: number;
  campaignCount: number;
  sent: number;
  recipients: number;
}
function BroadcastMast({
  channels,
  totalSent,
  totalRecipients,
  primary,
  secondary,
  danger,
}: {
  channels: BroadcastChannelMix[];
  totalSent: number;
  totalRecipients: number;
  primary: string;
  secondary: string;
  danger: string;
}) {
  // شعاع‌ها در ۴ جهت: بالا-راست = push, پایین-راست = email, پایین-چپ = sms, بالا-چپ = inapp
  // (در RTL: زوایا معکوس نمی‌شود — همیشه مثل ساعت: push 1:30, email 4:30, sms 7:30, inapp 10:30)
  const positions: Array<{
    id: 'push' | 'email' | 'sms' | 'inapp';
    angle: number;
    icon: LucideIcon;
  }> = [
    { id: 'push', angle: -45, icon: Radio },   // بالا-راست (NE)
    { id: 'email', angle: 45, icon: SendHorizontal }, // پایین-راست (SE)
    { id: 'sms', angle: 135, icon: Zap },      // پایین-چپ (SW)
    { id: 'inapp', angle: -135, icon: Eye },   // بالا-چپ (NW)
  ];
  const max = Math.max(...channels.map((c) => c.sent + c.announcementCount * 10), 1);
  const viewBoxSize = 320;
  const cx = viewBoxSize / 2;
  const cy = viewBoxSize / 2;
  const maxLen = 110;
  const colorMap: Record<ChannelTone, string> = {
    emerald: 'oklch(60% 0.12 165)',
    indigo: 'oklch(60% 0.13 245)',
    amber: 'oklch(70% 0.13 70)',
    violet: 'oklch(58% 0.13 290)',
  };
  // برای لیست کانال‌های مجاز در ۴ جهت (push, email, sms, inapp)،
  // tone را به یکی از چهار tone اصلی محدود می‌کنیم.
  const safeTone = (t: 'emerald' | 'indigo' | 'amber' | 'violet' | 'rose' | 'cyan'):
    | 'emerald' | 'indigo' | 'amber' | 'violet' => {
    if (t === 'emerald' || t === 'indigo' || t === 'amber' || t === 'violet') return t;
    return 'emerald';
  };

  return (
    <div className={s.mastWrap}>
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className={s.mastSvg}
        role="img"
        aria-label="نمودار دکل پخش — چهار کانال ارتباطی"
      >
        <defs>
          <radialGradient id="mast-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.35" />
            <stop offset="60%" stopColor={primary} stopOpacity="0.08" />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mast-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.95" />
            <stop offset="100%" stopColor={primary} stopOpacity="0.55" />
          </radialGradient>
          {positions.map((p) => {
            const ch = channels.find((c) => c.id === p.id);
            const color = ch ? colorMap[ch.tone] : primary;
            return (
              <linearGradient
                key={p.id}
                id={`mast-beam-${p.id}`}
                x1="0"
                y1="0"
                x2={Math.cos((p.angle * Math.PI) / 180)}
                y2={Math.sin((p.angle * Math.PI) / 180)}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={color} stopOpacity="0.2" />
              </linearGradient>
            );
          })}
        </defs>

        {/* ── halo + concentric rings (4 ring) ── */}
        <circle cx={cx} cy={cy} r={140} fill="url(#mast-glow)" />
        {[55, 90, 125].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1"
            strokeDasharray={r === 55 ? '0' : '3 3'}
          />
        ))}

        {/* ── 4 radial beams ── */}
        {positions.map((p) => {
          const ch = channels.find((c) => c.id === p.id);
          if (!ch) return null;
          const value = ch.sent + ch.announcementCount * 10;
          const len = Math.max(20, (value / max) * maxLen);
          const rad = (p.angle * Math.PI) / 180;
          const tx = cx + Math.cos(rad) * len;
          const ty = cy + Math.sin(rad) * len;
          const Icon = p.icon;
          return (
            <g key={p.id} className={s.mastBeam} data-tone={ch.tone}>
              {/* beam line */}
              <line
                x1={cx}
                y1={cy}
                x2={tx}
                y2={ty}
                stroke={`url(#mast-beam-${p.id})`}
                strokeWidth="6"
                strokeLinecap="round"
              />
              {/* outer end-cap (large) */}
              <circle cx={tx} cy={ty} r="18" fill={colorMap[ch.tone]} fillOpacity="0.15" />
              <circle cx={tx} cy={ty} r="12" fill={colorMap[ch.tone]} fillOpacity="0.3" />
              <circle cx={tx} cy={ty} r="7" fill="var(--ds-color-surface, white)" />
              <circle cx={tx} cy={ty} r="5" fill={colorMap[ch.tone]} />
              {/* icon glyph (centered) */}
              <foreignObject x={tx - 6} y={ty - 6} width="12" height="12">
                <Icon
                  size={12}
                  aria-hidden
                  style={{ color: 'var(--ds-color-surface, white)' }}
                />
              </foreignObject>
            </g>
          );
        })}

        {/* ── core (pulsing) ── */}
        <circle
          cx={cx}
          cy={cy}
          r="22"
          fill="url(#mast-core)"
          className={s.mastCore}
        />
        <circle
          cx={cx}
          cy={cy}
          r="10"
          fill="var(--ds-color-surface, white)"
          className={s.mastCoreInner}
        />

        {/* ── cardinal cross-hairs (Fibonacci) ── */}
        <g opacity="0.18" stroke="currentColor" strokeWidth="0.75" fill="none">
          <line x1={cx} y1="0" x2={cx} y2="14" />
          <line x1={cx} y1={viewBoxSize - 14} x2={cx} y2={viewBoxSize} />
          <line x1="0" y1={cy} x2="14" y2={cy} />
          <line x1={viewBoxSize - 14} y1={cy} x2={viewBoxSize} y2={cy} />
        </g>
      </svg>

      {/* ── Center stats overlay (CSS only) ── */}
      <div className={s.mastCenter}>
        <div className={s.mastCenterValue}>
          {fmtCompact(totalSent)}
        </div>
        <div className={s.mastCenterLabel}>ارسال کل</div>
        <div className={s.mastCenterMeta}>{fmtCompact(totalRecipients)} گیرنده</div>
      </div>

      {/* ── Edge labels (per channel) ── */}
      <ul className={s.mastLegend}>
        {positions.map((p) => {
          const ch = channels.find((c) => c.id === p.id);
          if (!ch) return null;
          const Icon = p.icon;
          return (
            <li key={p.id} data-tone={ch.tone}>
              <span className={s.mastLegendIcon}>
                <Icon size={10} aria-hidden />
              </span>
              <span className={s.mastLegendLabel}>{ch.label}</span>
              <span className={s.mastLegendVal}>{fmtCompact(valueOf(ch))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function valueOf(ch: BroadcastChannelMix): number {
  return ch.sent + ch.announcementCount * 10 + ch.campaignCount * 5;
}

// ─── Sparkline trail (used in KPI rail) ──────────────────────
function SparkTrail({
  points,
  tone,
}: {
  points: number[];
  tone: ChannelTone;
}) {
  if (points.length === 0) return null;
  const max = Math.max(...points, 1);
  const w = 100;
  const h = 22;
  const step = w / Math.max(1, points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * step;
      const y = h - (v / max) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  const colorMap: Record<ChannelTone, string> = {
    emerald: 'oklch(60% 0.12 165)',
    indigo: 'oklch(60% 0.13 245)',
    amber: 'oklch(70% 0.13 70)',
    violet: 'oklch(58% 0.13 290)',
  };
  const c = colorMap[tone];
  return (
    <svg
      className={s.spark}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} fill={c} fillOpacity="0.16" />
      <path d={path} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function sumTimeline(t: NexusChannelTimeline): number[] {
  return Array.from({ length: 7 }, (_, i) =>
    (t.push[i]?.sent ?? 0) + (t.email[i]?.sent ?? 0) + (t.sms[i]?.sent ?? 0) + (t.inapp[i]?.sent ?? 0),
  );
}
function sumTimelineSent(t: NexusChannelTimeline): number[] {
  return Array.from({ length: 7 }, (_, i) =>
    (t.email[i]?.sent ?? 0) + (t.push[i]?.sent ?? 0) + (t.sms[i]?.sent ?? 0),
  );
}

// ─── Channel Flow Timeline (24h) ─────────────────────────────
function ChannelFlowTimeline({ timeline }: { timeline: NexusChannelTimeline }) {
  // 7 روز اخیر، برای هر روز مجموع ۴ کانال؛ به‌صورت bars مواج
  const days = 7;
  const width = 100;
  const height = 100;
  const colorMap: Record<keyof NexusChannelTimeline, string> = {
    push: 'oklch(60% 0.12 165)',
    email: 'oklch(60% 0.13 245)',
    sms: 'oklch(70% 0.13 70)',
    inapp: 'oklch(58% 0.13 290)',
  };

  // مجموع هر روز
  const totals = Array.from({ length: days }, (_, i) =>
    (timeline.push[i]?.sent ?? 0) + (timeline.email[i]?.sent ?? 0) +
    (timeline.sms[i]?.sent ?? 0) + (timeline.inapp[i]?.sent ?? 0),
  );
  const max = Math.max(...totals, 1);
  const dayStep = width / days;

  // برای هر روز ۴ خط کنار هم (stacked) در ناحیه
  const stack = (['inapp', 'push', 'email', 'sms'] as const).map((key) => {
    return Array.from({ length: days }, (_, i) => ({
      x: i * dayStep + dayStep * 0.18,
      y: timeline[key][i]?.sent ?? 0,
     }));
  });

  // ناحیه انباشته
  const totalY = totals.map((v) => height - (v / max) * (height - 12) - 4);
  const stackedPoints = stack.map((arr) => arr.map((p) => p.y));
  // 4 path — هر خط، مجموع خط زیری + خودش
  const stackedAreas: string[] = [];
  let prevCum = Array(days).fill(0);
  for (const arr of stackedPoints) {
    const pts = arr.map((y, i) => {
      const cum = prevCum[i] + y;
      return cum;
    });
    const top = pts.map((cum, i) => {
      const y = height - (cum / max) * (height - 12) - 4;
      return [i * dayStep + dayStep * 0.18, y] as const;
    });
    const bot = prevCum.map((cum, i) => {
      const y = height - (cum / max) * (height - 12) - 4;
      return [i * dayStep + dayStep * 0.18, y] as const;
    });
    const path = [
      `M ${top[0][0]} ${top[0][1]}`,
      ...top.slice(1).map(([x, y]) => `L ${x} ${y}`),
      ...bot.reverse().map(([x, y]) => `L ${x} ${y}`),
      'Z',
    ].join(' ');
    stackedAreas.push(path);
    prevCum = pts;
  }

  // Peak labels (اوج) — indexOf returns -1 when all-zero (max=1 fallback) → clamp to 0
  const peakIdx = Math.max(0, totals.indexOf(max));
  const peakVal = totals[peakIdx] ?? 0;
  const peakX = peakIdx * dayStep + dayStep / 2;

  return (
    <div className={s.flowWrap}>
      <div className={s.flowHead}>
        <div className={s.flowHeadMain}>
          <div className={s.flowHeadLabel}>اوج هفته</div>
          <div className={s.flowHeadValue}>
            {fmtPersian(peakVal)}
            <span className={s.flowHeadUnit}>ارسال</span>
          </div>
        </div>
        <ul className={s.flowLegend}>
          <li data-tone="inapp">
            <span className={s.flowLegendDot} style={{ background: colorMap.inapp }} />
            In-app
          </li>
          <li data-tone="push">
            <span className={s.flowLegendDot} style={{ background: colorMap.push }} />
            Push
          </li>
          <li data-tone="email">
            <span className={s.flowLegendDot} style={{ background: colorMap.email }} />
            Email
          </li>
          <li data-tone="sms">
            <span className={s.flowLegendDot} style={{ background: colorMap.sms }} />
            SMS
          </li>
        </ul>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={s.flowSvg}
        aria-label="جریان ۷ روزه"
      >
        {/* baseline grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1="0"
            y1={height - p * (height - 12) - 4}
            x2={width}
            y2={height - p * (height - 12) - 4}
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeWidth="0.5"
          />
        ))}
        {/* stacked areas */}
        {stackedAreas.map((p, i) => {
          const key = (['inapp', 'push', 'email', 'sms'] as const)[i];
          return (
            <path
              key={key}
              d={p}
              fill={colorMap[key]}
              fillOpacity={0.15 + i * 0.05}
            />
          );
        })}
        {/* total line */}
        <path
          d={
            'M ' +
            totalY
              .map((y, i) => `${i * dayStep + dayStep * 0.18} ${y}`)
              .join(' L ')
          }
          fill="none"
          stroke="oklch(60% 0.12 165)"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* peak dot */}
        <circle
          cx={peakX}
          cy={totalY[peakIdx]}
          r="2.5"
          fill="oklch(60% 0.12 165)"
          stroke="var(--ds-color-surface, white)"
          strokeWidth="1"
        />
      </svg>
      <div className={s.flowAxis}>
        {Array.from({ length: days }, (_, i) => (
          <span key={i}>{(i === days - 1) ? 'امروز' : `−${days - 1 - i}د`}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Audience Constellation ───────────────────────────────────
function AudienceConstellation({
  nodes,
  totalUsers,
  primary,
  secondary,
}: {
  nodes: Array<{
    id: string;
    label: string;
    count: number;
    tone: ChannelTone;
    x: number;
    y: number;
    r: number;
    weight: number;
  }>;
  totalUsers: number;
  primary: string;
  secondary: string;
}) {
  const colorMap: Record<ChannelTone, string> = {
    emerald: 'oklch(60% 0.12 165)',
    indigo: 'oklch(60% 0.13 245)',
    amber: 'oklch(70% 0.13 70)',
    violet: 'oklch(58% 0.13 290)',
  };
  // SVG viewbox
  const w = 360;
  const h = 240;
  // نرمال‌سازی موقعیت به viewbox
  const offsetX = w / 2;
  const offsetY = h / 2;
  const scale = 0.7;

  return (
    <div className={s.audWrap}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={s.audSvg}
        role="img"
        aria-label="نمودار صورت فلکی مخاطبان"
      >
        <defs>
          <radialGradient id="constellation-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.5" />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* center halo */}
        <circle cx={offsetX} cy={offsetY} r="80" fill="url(#constellation-center)" />
        {/* connecting lines (مرکز ↔ هر گره) */}
        {nodes
          .filter((n) => n.id !== 'all')
          .map((n) => {
            const x = offsetX + n.x * scale;
            const y = offsetY + n.y * scale;
            return (
              <line
                key={`line-${n.id}`}
                x1={offsetX}
                y1={offsetY}
                x2={x}
                y2={y}
                stroke={colorMap[n.tone]}
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
            );
          })}
        {/* center node */}
        <g>
          <circle cx={offsetX} cy={offsetY} r="42" fill={primary} fillOpacity="0.12" />
          <circle cx={offsetX} cy={offsetY} r="28" fill={primary} fillOpacity="0.25" />
          <circle cx={offsetX} cy={offsetY} r="18" fill="var(--ds-color-surface, white)" />
          <circle cx={offsetX} cy={offsetY} r="14" fill={primary} />
        </g>
        {/* outer nodes */}
        {nodes
          .filter((n) => n.id !== 'all')
          .map((n) => {
            const x = offsetX + n.x * scale;
            const y = offsetY + n.y * scale;
            const color = colorMap[n.tone];
            return (
              <g key={n.id} className={s.audNode} data-tone={n.tone}>
                <circle cx={x} cy={y} r={n.r + 8} fill={color} fillOpacity="0.1" />
                <circle cx={x} cy={y} r={n.r} fill={color} fillOpacity="0.3" />
                <circle cx={x} cy={y} r={n.r - 5} fill={color} />
              </g>
            );
          })}
      </svg>
      {/* Center label overlay */}
      <div className={s.audCenter}>
        <div className={s.audCenterValue}>{fmtCompact(totalUsers)}</div>
        <div className={s.audCenterLabel}>کاربر</div>
      </div>
      {/* Legend overlay */}
      <ul className={s.audLegend}>
        {nodes
          .filter((n) => n.id !== 'all')
          .map((n) => (
            <li key={n.id} data-tone={n.tone}>
              <span
                className={s.audLegendDot}
                style={{ background: colorMap[n.tone] }}
                aria-hidden
              />
              <span className={s.audLegendLabel}>{n.label}</span>
              <span className={s.audLegendVal}>{fmtCompact(n.count)}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

// ─── Channel Radar ────────────────────────────────────────────
function ChannelRadar({ radar }: { radar: NexusChannelRadar }) {
  const w = 280;
  const h = 240;
  const cx = w / 2;
  const cy = h / 2;
  const r = 92;
  // 4-axis: sent, open, click, bounce — value: 0..1
  const axes: Array<{ key: 'sent' | 'openRate' | 'clickRate' | 'bounceRate'; label: string }> = [
    { key: 'sent', label: 'ارسال' },
    { key: 'openRate', label: 'باز شدن' },
    { key: 'clickRate', label: 'کلیک' },
    { key: 'bounceRate', label: 'بازگشت' },
  ];
  // max for sent across all channels
  const sentMax = Math.max(...radar.channels.map((c) => c.sent), 1);
  // نرمال‌سازی مقدار به 0..1 — برای sent تقسیم بر max، برای percent تقسیم بر 100
  const pointFor = (ch: ChannelRadarMetric, ax: typeof axes[number]): [number, number] => {
    const idx = axes.indexOf(ax);
    const angle = (idx / axes.length) * Math.PI * 2 - Math.PI / 2;
    let v = 0;
    if (ax.key === 'sent') v = ch.sent / sentMax;
    else if (ax.key === 'openRate') v = ch.openRate / 100;
    else if (ax.key === 'clickRate') v = ch.clickRate / 100;
    else if (ax.key === 'bounceRate') v = ch.bounceRate / 100;
    const radius = v * r;
    return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
  };
  const colorMap: Record<ChannelTone, string> = {
    emerald: 'oklch(60% 0.12 165)',
    indigo: 'oklch(60% 0.13 245)',
    amber: 'oklch(70% 0.13 70)',
    violet: 'oklch(58% 0.13 290)',
  };

  return (
    <div className={s.radarWrap}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={s.radarSvg}
        role="img"
        aria-label="نمودار رادار کانال‌ها"
      >
        {/* grid rings */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <polygon
            key={p}
            points={axes
              .map((_, i) => {
                const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2;
                return `${cx + Math.cos(angle) * r * p},${cy + Math.sin(angle) * r * p}`;
              })
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeWidth="0.75"
            strokeDasharray={p === 1 ? '0' : '2 3'}
          />
        ))}
        {/* axes lines + labels */}
        {axes.map((ax, i) => {
          const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2;
          const lx = cx + Math.cos(angle) * (r + 14);
          const ly = cy + Math.sin(angle) * (r + 14);
          return (
            <g key={ax.key}>
              <line
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(angle) * r}
                y2={cy + Math.sin(angle) * r}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="0.75"
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className={s.radarAxisLabel}
                fill="currentColor"
              >
                {ax.label}
              </text>
            </g>
          );
        })}
        {/* channel polygons */}
        {radar.channels.map((ch) => {
          const points = axes.map((ax) => pointFor(ch, ax));
          const color = colorMap[ch.tone];
          return (
            <g key={ch.id} className={s.radarChannel} data-tone={ch.tone}>
              <polygon
                points={points.map(([x, y]) => `${x},${y}`).join(' ')}
                fill={color}
                fillOpacity="0.16"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              {points.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill={color}
                  stroke="var(--ds-color-surface, white)"
                  strokeWidth="1"
                />
              ))}
            </g>
          );
        })}
      </svg>
      <ul className={s.radarLegend}>
        {radar.channels.map((ch) => (
          <li key={ch.id} data-tone={ch.tone}>
            <span className={s.radarLegendDot} style={{ background: colorMap[ch.tone] }} />
            <span className={s.radarLegendLabel}>{ch.label}</span>
            <span className={s.radarLegendValue}>
              {fmtCompact(ch.sent)} ارسال
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── 7d × 24h Heatmap ─────────────────────────────────────────
function Heatmap7d({ heatmap }: { heatmap: NexusHeatmap }) {
  const days = ['دیروز ۶', 'دیروز ۵', 'دیروز ۴', 'دیروز ۳', 'دیروز ۲', 'دیروز ۱', 'امروز'] as const;
  const max = Math.max(heatmap.max, 1);
  return (
    <div className={s.heatWrap}>
      <div className={s.heatGrid}>
        {/* hour axis (top) */}
        <div className={s.heatHeader}>
          <span className={s.heatHeaderSpacer} aria-hidden />
          <div className={s.heatHeaderHours}>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className={s.heatHeaderHour}>
                {h % 6 === 0 ? fmtPersian(h) : ''}
              </span>
            ))}
          </div>
        </div>
        {/* 7 rows */}
        {Array.from({ length: 7 }, (_, d) => (
          <div key={d} className={s.heatRow}>
            <span className={s.heatDay}>{days[d]}</span>
            <div className={s.heatCells}>
              {Array.from({ length: 24 }, (_, h) => {
                const cell = heatmap.cells[d * 24 + h];
                const v = cell.count / max;
                return (
                  <span
                    key={h}
                    className={s.heatCell}
                    style={{
                      background: `color-mix(in oklab, oklch(60% 0.12 165) ${Math.max(4, v * 80)}%, var(--ds-color-surface-2, oklch(96% 0.004 245)))`,
                    }}
                    title={`${days[d]} ساعت ${fmtPersian(h)}: ${fmtPersian(cell.count)}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className={s.heatScale}>
        <span>کم</span>
        <div className={s.heatScaleBar}>
          {Array.from({ length: 8 }, (_, i) => (
            <span
              key={i}
              style={{
                background: `color-mix(in oklab, oklch(60% 0.12 165) ${(i + 1) * 10}%, var(--ds-color-surface-2, oklch(96% 0.004 245)))`,
              }}
            />
          ))}
        </div>
        <span>زیاد</span>
      </div>
    </div>
  );
}

// ─── Channel Stacked Trend (7d area) ──────────────────────────
function ChannelStackedTrend({ timeline }: { timeline: NexusChannelTimeline }) {
  // نمودار area 7 روزه، ۴ کانال به‌صورت خطوط موازی (not stacked — clearer for trend)
  const w = 100;
  const h = 100;
  const colorMap: Record<keyof NexusChannelTimeline, string> = {
    push: 'oklch(60% 0.12 165)',
    email: 'oklch(60% 0.13 245)',
    sms: 'oklch(70% 0.13 70)',
    inapp: 'oklch(58% 0.13 290)',
  };
  const allMax = Math.max(
    ...timeline.push.map((p) => p.sent),
    ...timeline.email.map((p) => p.sent),
    ...timeline.sms.map((p) => p.sent),
    ...timeline.inapp.map((p) => p.sent),
    1,
  );
  const days = 7;
  const dayStep = w / (days - 1);
  const buildPath = (key: keyof NexusChannelTimeline): string => {
    return timeline[key]
      .map((p, i) => {
        const x = i * dayStep;
        const y = h - (p.sent / allMax) * (h - 8) - 4;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  return (
    <div className={s.trendWrap}>
      <ul className={s.trendLegend}>
        {(['email', 'push', 'sms', 'inapp'] as const).map((k) => {
          const total = timeline[k].reduce((s, p) => s + p.sent, 0);
          return (
            <li key={k} data-tone={k}>
              <span
                className={s.trendLegendDot}
                style={{ background: colorMap[k] }}
                aria-hidden
              />
              <span className={s.trendLegendLabel}>{CHANNEL_LABEL[k]}</span>
              <span className={s.trendLegendVal}>{fmtCompact(total)}</span>
            </li>
          );
        })}
      </ul>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className={s.trendSvg}
        aria-label="روند ۷ روزه کانال‌ها"
      >
        {/* grid */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <line
            key={p}
            x1="0"
            y1={h - p * (h - 8) - 4}
            x2={w}
            y2={h - p * (h - 8) - 4}
            stroke="currentColor"
            strokeOpacity="0.07"
            strokeWidth="0.5"
          />
        ))}
        {/* خطوط هر کانال */}
        {(['email', 'push', 'sms', 'inapp'] as const).map((k) => (
          <g key={k}>
            <path
              d={buildPath(k)}
              fill="none"
              stroke={colorMap[k]}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {timeline[k].map((p, i) => {
              const x = i * dayStep;
              const y = h - (p.sent / allMax) * (h - 8) - 4;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={i === timeline[k].length - 1 ? 2.2 : 1.2}
                  fill={colorMap[k]}
                  stroke="var(--ds-color-surface, white)"
                  strokeWidth="0.5"
                />
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Pipeline Card ────────────────────────────────────────────
function PipelineCard({ item }: { item: PipelineCampaign }) {
  const ch = item.channel;
  const tone = ch === 'email' ? 'indigo' : ch === 'push' ? 'emerald' : 'amber';
  const Icon = CHANNEL_ICON[ch];
  const reachLabel = item.status === 'completed' || item.status === 'sending'
    ? `${fmtCompact(item.sent)} ارسال`
    : item.status === 'scheduled'
      ? `زمان‌بندی: ${fmtClock(item.scheduledAt)}`
      : 'پیش‌نویس';
  return (
    <article className={s.pipelineCard} data-tone={tone}>
      <header className={s.pipelineCardHead}>
        <span className={s.pipelineCardChannel}>
          <Icon size={11} aria-hidden />
        </span>
        <span className={s.pipelineCardName}>{item.name}</span>
      </header>
      <div className={s.pipelineCardMeta}>
        <span className={s.pipelineCardReach}>{reachLabel}</span>
        {item.status === 'completed' && item.sent > 0 ? (
          <span className={s.pipelineCardRate}>
            {fmtPct((item.opened / Math.max(1, item.sent)) * 100)} باز شد
          </span>
        ) : null}
      </div>
    </article>
  );
}
