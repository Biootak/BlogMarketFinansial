'use client';

/**
 * CommunicationHub v4 — Editorial Broadcast HQ
 * ─────────────────────────────────────────────────────────────────
 *  فلسفه: "اتاق کنترل پخش" — یک مجله‌ی editorial برای ادمین.
 *
 *  سلسله‌مراتب بصری (طبق §3.7 Restraint — ۴ zone، ۳ tone، ۱ overlay، ۲ motion):
 *    1. HERO (editorial cover، dark، page-specific)  — display typ + Broadcast Sphere SVG
 *    2. CHANNEL BAND (horizontal strip)  — ۴ کانال به‌صورت towers عمودی (نه کارت)
 *    3. ACTIVITY FLOW (dual)  — heatmap 7×24 + wire feed
 *    4. PIPELINE (utility strip)  — ۴ ستون kanban
 *
 *  Tone ها (۳ tone، ۱ dominant):
 *    - dominant: emerald (oklch 165) — broadcast / live / sending
 *    - accent:   indigo (oklch 265) — درجه‌بندی و سلسله‌مراتب متن
 *    - utility:  amber  (oklch 70)  — scheduled / queue / warning
 *
 *  Motion (۲ حداکثر): LiveDot pulse + CountUp fade.
 *  Overlay (۱): ambient gradient در hero.
 *  SVG signature (۱): BroadcastSphere در hero.
 */

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Inbox,
  Mail,
  MessageSquare,
  PencilLine,
  Plus,
  Radio,
  Send,
  Smartphone,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/Dashboard/primitives';
import { LiveDot } from '@/components/Dashboard/PlatformHub';
import { cn } from '@/lib/utils';
import s from './CommunicationHub.module.css';
import type { CommunicationHubData } from './types';
import type {
  CommunicationNexus,
  NexusHeatmap,
  NexusPipeline,
  PipelineStatus,
} from '@/lib/communication';

// ─── helpers ───────────────────────────────────────────────────────
const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmt = (n: number | string) => PERSIAN_NUM(n);
const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};
const fmtCompactPersian = (n: number) => PERSIAN_NUM(fmtCompact(n));
const fmtPct = (n: number) => `${PERSIAN_NUM(Math.round(n * 10) / 10)}٪`;
const fmtClock = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
};
const fmtRelative = (iso: string | null) => {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'همین لحظه';
  if (min < 60) return `${fmt(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${fmt(hr)} ساعت پیش`;
  return `${fmt(Math.floor(hr / 24))} روز پیش`;
};

type Tone = 'emerald' | 'indigo' | 'amber';

const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  draft: 'پیش‌نویس',
  scheduled: 'زمان‌بندی',
  sending: 'در حال ارسال',
  completed: 'تکمیل‌شده',
};
const PIPELINE_TONE: Record<PipelineStatus, Tone> = {
  draft: 'amber',
  scheduled: 'amber',
  sending: 'emerald',
  completed: 'indigo',
};
const PIPELINE_ICON: Record<PipelineStatus, LucideIcon> = {
  draft: PencilLine,
  scheduled: CalendarClock,
  sending: Send,
  completed: CheckCircle2,
};

// ─── props ─────────────────────────────────────────────────────────
interface CommunicationHubProps {
  hub: CommunicationHubData;
  nexus: CommunicationNexus;
}

// ════════════════════════════════════════════════════════════════
//  Component
// ════════════════════════════════════════════════════════════════
export function CommunicationHub({
  hub,
  nexus,
}: CommunicationHubProps) {
  // ── Channel towers (4 vertical modules) ─────────────────────
  const channelTowers = useMemo(() => {
    const t: Array<{
      id: 'inapp' | 'email' | 'sms' | 'push';
      label: string;
      sub: string;
      icon: LucideIcon;
      sent: number;
      tone: Tone;
      announcementCount: number;
      campaignCount: number;
      openRate: number;
    }> = [
      {
        id: 'inapp',
        label: 'درون‌برنامه',
        sub: 'In-app',
        icon: MessageSquare,
        sent: 0,
        tone: 'indigo',
        announcementCount: 0,
        campaignCount: 0,
        openRate: 0,
      },
      {
        id: 'email',
        label: 'ایمیل',
        sub: 'Email',
        icon: Mail,
        sent: 0,
        tone: 'emerald',
        announcementCount: 0,
        campaignCount: 0,
        openRate: 0,
      },
      {
        id: 'push',
        label: 'اعلان Push',
        sub: 'Push',
        icon: Bell,
        sent: 0,
        tone: 'indigo',
        announcementCount: 0,
        campaignCount: 0,
        openRate: 0,
      },
      {
        id: 'sms',
        label: 'پیامک',
        sub: 'SMS',
        icon: Smartphone,
        sent: 0,
        tone: 'amber',
        announcementCount: 0,
        campaignCount: 0,
        openRate: 0,
      },
    ];

    for (const r of nexus.channelRadar.channels) {
      const target = t.find((x) => x.id === r.id);
      if (!target) continue;
      target.sent = r.sent;
      target.openRate = r.openRate;
    }
    for (const a of hub.announcements) {
      for (const c of a.channels) {
        const target = t.find((x) => x.id === c);
        if (target) target.announcementCount += 1;
      }
    }
    for (const c of hub.campaigns) {
      const target = t.find((x) => x.id === c.channel);
      if (target) target.campaignCount += 1;
    }
    return t;
  }, [hub.announcements, hub.campaigns, nexus.channelRadar.channels]);

  const maxChannelSent = Math.max(...channelTowers.map((c) => c.sent), 1);

  // ── Wire feed (top 5, mixed announcements + campaigns) ─────
  const wireItems = useMemo(() => {
    type Wire = {
      id: string;
      at: string;
      title: string;
      detail: string;
      kind: 'announcement' | 'campaign';
      tone: Tone;
    };
    const items: Wire[] = [];
    for (const a of hub.announcements) {
      items.push({
        id: `a-${a.id}`,
        at: a.publishedAt ?? a.scheduledAt ?? a.createdAt,
        title: a.title,
        detail:
          a.status === 'published'
            ? 'اعلان منتشر شد'
            : a.status === 'scheduled'
              ? 'اعلان زمان‌بندی'
              : a.status === 'draft'
                ? 'پیش‌نویس'
                : 'آرشیو',
        kind: 'announcement',
        tone: a.status === 'published' ? 'emerald' : a.status === 'scheduled' ? 'amber' : 'indigo',
      });
    }
    for (const c of hub.campaigns) {
      items.push({
        id: `c-${c.id}`,
        at: c.completedAt ?? c.startedAt ?? c.scheduledAt ?? c.createdAt,
        title: c.name,
        detail: `کمپین ${c.channel} · ${c.status}`,
        kind: 'campaign',
        tone: c.status === 'sending' ? 'emerald' : c.status === 'scheduled' ? 'amber' : 'indigo',
      });
    }
    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, 6);
  }, [hub.announcements, hub.campaigns]);

  // ── Hero stat ─────────────────────────────────────────────
  const heroReach = hub.metrics.totalRecipients;
  const totalCampaigns = hub.campaigns.length;
  const totalAnnouncements = hub.announcements.length;

  return (
    <div className={s.page} dir="rtl">
      {/* ═══ ZONE 1 — HERO (editorial cover) ══════════════════ */}
      <section className={s.hero} aria-label="مرکز ارتباطات">
        {/* overlay: یک ambient gradient (تنها overlay مجاز) */}
        <span className={s.heroAmbient} aria-hidden />

        <div className={s.heroContent}>
          <div className={s.heroEyebrow}>
            <LiveDot tone="emerald" size="sm" />
            <span>اتاق کنترل پخش</span>
            <span className={s.heroSep} aria-hidden>·</span>
            <span className={s.heroClock}>
              {new Date(hub.generatedAt).toLocaleTimeString('fa-IR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className={s.heroSep} aria-hidden>·</span>
            <span>{fmt(totalAnnouncements + totalCampaigns)} مورد در جریان</span>
          </div>

          <h1 className={s.heroTitle}>
            <span className={s.heroTitleLine}>صدای پلتفرم،</span>
            <span className={s.heroTitleLine}>
              از <span className={s.heroAccentText}>یک نقطه.</span>
            </span>
          </h1>

          <p className={s.heroLead}>
            اعلان‌ها، کمپین‌ها و کانال‌ها — در یک صفحه. هر پیام، هر مخاطب، هر ساعت از روز، در لحظه.
          </p>

          <div className={s.heroStatRow}>
            <div className={s.heroStat}>
              <span className={s.heroStatLabel}>گیرنده یکتا</span>
              <span className={s.heroStatValue}>
                <CountUp
                  value={heroReach}
                  duration={900}
                  locale="fa-IR"
                  className={s.heroStatCount}
                />
              </span>
              <span className={s.heroStatMeta}>در ۳۰ روز اخیر</span>
            </div>
            <div className={s.heroStatDivider} aria-hidden />
            <div className={s.heroStat}>
              <span className={s.heroStatLabel}>نرخ باز شدن</span>
              <span className={s.heroStatValue}>{fmtPct(hub.metrics.openRate)}</span>
              <span className={s.heroStatMeta}>میانگین کمپین‌ها</span>
            </div>
            <div className={s.heroStatDivider} aria-hidden />
            <div className={s.heroStat}>
              <span className={s.heroStatLabel}>صف انتشار</span>
              <span className={s.heroStatValue}>
                {fmt(hub.metrics.scheduledAnnouncements + hub.metrics.draftAnnouncements)}
              </span>
              <span className={s.heroStatMeta}>در انتظار</span>
            </div>
          </div>

          <div className={s.heroActions}>
            <Button asChild>
              <Link href="/dashboard/communication/announcements/new">
                <Plus size={14} aria-hidden />
                اعلان جدید
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/communication/announcements">
                فهرست اعلان‌ها
                <ArrowLeft size={14} aria-hidden />
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/communication/campaigns/create">
                <Radio size={14} aria-hidden />
                کمپین جدید
              </Link>
            </Button>
          </div>
        </div>

        {/* signature SVG: Broadcast Sphere (radial constellation) */}
        <div className={s.heroMark} aria-hidden>
          <BroadcastSphere
            channels={channelTowers}
            totalReach={heroReach}
            totalSent={hub.metrics.totalSent}
          />
        </div>
      </section>

      {/* ═══ ZONE 2 — CHANNEL BAND (4 vertical towers) ═══════ */}
      <section className={s.band} aria-label="کانال‌ها">
        <header className={s.bandHead}>
          <div className={s.bandHeadMain}>
            <span className={s.bandEyebrow}>کانال‌های پخش</span>
            <span className={s.bandSubtitle}>چهار مسیر، یک صدا</span>
          </div>
          <Link href="/dashboard/communication/announcements" className={s.bandMore}>
            مدیریت اعلان‌ها
            <ChevronLeft size={12} aria-hidden />
          </Link>
        </header>
        <div className={s.bandTowers}>
          {channelTowers.map((c) => (
            <ChannelTower
              key={c.id}
              icon={c.icon}
              label={c.label}
              sub={c.sub}
              tone={c.tone}
              sent={c.sent}
              openRate={c.openRate}
              announcementCount={c.announcementCount}
              campaignCount={c.campaignCount}
              maxSent={maxChannelSent}
            />
          ))}
        </div>
      </section>

      {/* ═══ ZONE 3 — ACTIVITY FLOW (dual column) ═══════════ */}
      <section className={s.dual} aria-label="جریان فعالیت">
        {/* heatmap — corner label header */}
        <article className={s.heat}>
          <div className={s.heatHead}>
            <span className={s.heatEyebrow}>نبض فعالیت</span>
            <span className={s.heatSub}>۷ روز اخیر × ۲۴ ساعت</span>
          </div>
          <div className={s.heatBody}>
            <Heatmap7d heatmap={nexus.heatmap} />
          </div>
        </article>

        {/* wire — edge label header */}
        <article className={s.wire}>
          <div className={s.wireHead}>
            <div className={s.wireHeadMain}>
              <span className={s.wireEyebrow}>سیم خبری</span>
              <span className={s.wireSub}>آخرین رویدادها</span>
            </div>
            <Link
              href="/dashboard/communication/announcements"
              className={s.wireMore}
            >
              همه
              <ChevronLeft size={12} aria-hidden />
            </Link>
          </div>
          <ol className={s.wireList}>
            {wireItems.length === 0 ? (
              <li className={s.wireEmpty}>
                <Inbox size={14} aria-hidden />
                خبری نیست.
              </li>
            ) : (
              wireItems.map((it, idx) => (
                <li
                  key={it.id}
                  className={s.wireItem}
                  data-tone={it.tone}
                  data-kind={it.kind}
                >
                  <span className={s.wireIndex}>
                    {fmt(String(idx + 1).padStart(2, '0'))}
                  </span>
                  <div className={s.wireBody}>
                    <span className={s.wireTitle}>{it.title}</span>
                    <span className={s.wireDetail}>{it.detail}</span>
                  </div>
                  <time className={s.wireTime} dateTime={it.at}>
                    {fmtRelative(it.at)}
                  </time>
                </li>
              ))
            )}
          </ol>
        </article>
      </section>

      {/* ═══ ZONE 4 — PIPELINE (kanban) ═════════════════════ */}
      <section className={s.pipeline} aria-label="خط لوله کمپین‌ها">
        <div className={s.pipelineHead}>
          <div className={s.pipelineHeadMain}>
            <span className={s.pipelineEyebrow}>خط لوله</span>
            <span className={s.pipelineTitle}>کمپین‌ها در گردش</span>
          </div>
          <div className={s.pipelineSubnav}>
            <Link
              href="/dashboard/communication/announcements"
              className={s.pipelineLink}
            >
              <Radio size={11} aria-hidden />
              اعلان‌ها
            </Link>
            <Link
              href="/dashboard/communication/campaigns"
              className={s.pipelineLink}
            >
              <Send size={11} aria-hidden />
              کمپین‌ها
            </Link>
            <Link
              href="/dashboard/communication/audiences"
              className={s.pipelineLink}
            >
              <Users size={11} aria-hidden />
              مخاطبان
            </Link>
            <Link
              href="/dashboard/communication/campaigns/create"
              className={s.pipelineLink}
            >
              <Plus size={11} aria-hidden />
              ساخت
            </Link>
          </div>
        </div>
        <div className={s.pipelineCols}>
          {(['draft', 'scheduled', 'sending', 'completed'] as const).map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              items={nexus.pipeline[status]}
              count={nexus.pipeline.counts[status]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  Sub-components
// ════════════════════════════════════════════════════════════════

// ─── Broadcast Sphere (signature SVG) ─────────────────────────────
// یک sphere با حلقه‌های هم‌مرکز + نقاطی برای هر کانال.
// نشان‌دهنده «broadcast center» — منبع پخش.

interface SphereChannel {
  id: 'inapp' | 'email' | 'sms' | 'push';
  tone: Tone;
  sent: number;
}

function BroadcastSphere({
  channels,
  totalReach,
  totalSent,
}: {
  channels: SphereChannel[];
  totalReach: number;
  totalSent: number;
}) {
  const size = 280;
  const c = size / 2;
  const rOuter = c - 12;
  const rMid = c - 36;
  const rInner = c - 60;
  const ring = (radius: number, opacity: number, dash?: string) => (
    <circle
      cx={c}
      cy={c}
      r={radius}
      fill="none"
      stroke="currentColor"
      strokeOpacity={opacity}
      strokeWidth="0.6"
      strokeDasharray={dash}
    />
  );
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      className={s.sphereSvg}
      aria-hidden
    >
      <defs>
        <radialGradient id="sphere-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(60% 0.12 165)" stopOpacity="0.28" />
          <stop offset="60%" stopColor="oklch(60% 0.12 165)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="oklch(60% 0.12 165)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sphere-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(98% 0.004 245)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="oklch(98% 0.004 245)" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* ambient glow */}
      <circle cx={c} cy={c} r={rOuter} fill="url(#sphere-glow)" />

      {/* rings */}
      {ring(rOuter, 0.3)}
      {ring(rMid, 0.18, '2 4')}
      {ring(rInner, 0.32)}

      {/* meridians (rotated ovals) */}
      {[0, 45, 90, 135].map((deg) => (
        <ellipse
          key={deg}
          cx={c}
          cy={c}
          rx={rOuter}
          ry={rOuter * 0.42}
          fill="none"
          stroke="url(#sphere-stroke)"
          strokeWidth="0.55"
          strokeOpacity="0.45"
          transform={`rotate(${deg} ${c} ${c})`}
        />
      ))}

      {/* horizon */}
      <line
        x1={c - rOuter}
        y1={c}
        x2={c + rOuter}
        y2={c}
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="0.6"
      />

      {/* channel anchors on rMid ring — 4 points */}
      {channels.map((ch, i) => {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const x = c + rMid * Math.cos(angle);
        const y = c + rMid * Math.sin(angle);
        const toneColor =
          ch.tone === 'emerald'
            ? 'oklch(72% 0.14 162)'
            : ch.tone === 'amber'
              ? 'oklch(78% 0.14 75)'
              : 'oklch(72% 0.14 265)';
        const ratio = Math.max(0.18, Math.min(1, ch.sent / Math.max(totalSent, 1) || 0.18));
        return (
          <g key={ch.id}>
            <circle
              cx={x}
              cy={y}
              r={3.5 + ratio * 5}
              fill={toneColor}
              fillOpacity="0.92"
            />
            <circle
              cx={x}
              cy={y}
              r={3.5 + ratio * 5}
              fill="none"
              stroke={toneColor}
              strokeOpacity="0.35"
              strokeWidth="1"
            />
          </g>
        );
      })}

      {/* center core */}
      <circle cx={c} cy={c} r="9" fill="oklch(60% 0.12 165)" />
      <circle cx={c} cy={c} r="9" fill="none" stroke="oklch(98% 0.004 245)" strokeOpacity="0.4" strokeWidth="0.8" />

      {/* center text */}
      <text
        x={c}
        y={c + 26}
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        letterSpacing="0.18em"
        fill="oklch(75% 0.005 245)"
        style={{ textTransform: 'uppercase' }}
      >
        REACH
      </text>
      <text
        x={c}
        y={c - 18}
        textAnchor="middle"
        fontSize="20"
        fontWeight="800"
        fill="oklch(98% 0.004 245)"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {fmtCompact(totalReach)}
      </text>
    </svg>
  );
}

// ─── Channel Tower ────────────────────────────────────────────────
function ChannelTower({
  icon: Icon,
  label,
  sub,
  tone,
  sent,
  openRate,
  announcementCount,
  campaignCount,
  maxSent,
}: {
  icon: LucideIcon;
  label: string;
  sub: string;
  tone: Tone;
  sent: number;
  openRate: number;
  announcementCount: number;
  campaignCount: number;
  maxSent: number;
}) {
  const ratio = Math.max(0.04, Math.min(1, sent / maxSent));
  return (
    <article className={s.tower} data-tone={tone}>
      <header className={s.towerHead}>
        <span className={s.towerIcon} aria-hidden>
          <Icon size={14} strokeWidth={1.75} />
        </span>
        <div className={s.towerHeading}>
          <span className={s.towerLabel}>{label}</span>
          <span className={s.towerSub}>{sub}</span>
        </div>
      </header>

      <div className={s.towerValue}>
        <span className={s.towerValueNum}>{fmtCompactPersian(sent)}</span>
        <span className={s.towerValueUnit}>ارسال</span>
      </div>

      {/* vertical bar */}
      <div className={s.towerBar} aria-hidden>
        <span
          className={s.towerBarFill}
          style={{ height: `${ratio * 100}%` }}
        />
      </div>

      <dl className={s.towerMeta}>
        <div className={s.towerMetaItem}>
          <dt>اعلان</dt>
          <dd>{fmt(announcementCount)}</dd>
        </div>
        <div className={s.towerMetaItem}>
          <dt>کمپین</dt>
          <dd>{fmt(campaignCount)}</dd>
        </div>
        <div className={s.towerMetaItem}>
          <dt>باز شدن</dt>
          <dd>{openRate > 0 ? fmtPct(openRate) : '—'}</dd>
        </div>
      </dl>
    </article>
  );
}

// ─── Heatmap (compact) ──────────────────────────────────────────
function Heatmap7d({ heatmap }: { heatmap: NexusHeatmap }) {
  const days = ['۶ روز پیش', '۵ روز پیش', '۴ روز پیش', '۳ روز پیش', '۲ روز پیش', 'دیروز', 'امروز'] as const;
  const max = Math.max(heatmap.max, 1);
  return (
    <div className={s.heatWrap}>
      <div className={s.heatHeader}>
        <span className={s.heatHeaderSpacer} />
        <div className={s.heatHours}>
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className={s.heatHour}>
              {h % 6 === 0 ? fmt(h) : ''}
            </span>
          ))}
        </div>
      </div>
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
                  className={cn(s.heatCell, v > 0.55 && s.heatCellHot)}
                  style={{
                    background: `color-mix(in oklab, oklch(60% 0.12 165) ${Math.max(3, v * 78)}%, oklch(96% 0.004 245))`,
                  }}
                  title={`${days[d]} ساعت ${fmt(h)}: ${fmt(cell.count)}`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pipeline Column ─────────────────────────────────────────────
function PipelineColumn({
  status,
  items,
  count,
}: {
  status: PipelineStatus;
  items: NexusPipeline['draft'];
  count: number;
}) {
  const Icon = PIPELINE_ICON[status];
  const tone = PIPELINE_TONE[status];
  return (
    <div className={s.col} data-tone={tone}>
      <header className={s.colHead}>
        <span className={s.colHeadMain}>
          <Icon size={11} aria-hidden />
          <span>{PIPELINE_LABEL[status]}</span>
        </span>
        <span className={s.colCount}>{fmt(count)}</span>
      </header>
      <ul className={s.colList}>
        {items.length === 0 ? (
          <li className={s.colEmpty}>—</li>
        ) : (
          items.map((it) => <PipelineCard key={it.id} item={it} />)
        )}
      </ul>
    </div>
  );
}

function PipelineCard({ item }: { item: NexusPipeline['draft'][number] }) {
  return (
    <li className={s.card} data-channel={item.channel}>
      <span className={s.cardName}>{item.name}</span>
      <span className={s.cardMeta}>
        {item.status === 'sending' || item.status === 'completed'
          ? `${fmtCompactPersian(item.sent)} ارسال`
          : item.status === 'scheduled'
            ? `ساعت ${fmtClock(item.scheduledAt)}`
            : 'پیش‌نویس'}
      </span>
    </li>
  );
}

// ─── end of file ──────────────────────────────────────────────────
