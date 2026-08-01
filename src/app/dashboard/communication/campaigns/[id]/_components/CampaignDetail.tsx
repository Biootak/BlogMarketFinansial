'use client';

/**
 * CampaignDetail v2 — Mission Briefing
 * ساختار: HEADER cover → STAT strip → MESSAGE body + RECIPIENTS (dual) → ASIDE meta
 */

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Mail,
  Pause,
  Play,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Spotlight } from '@/components/Dashboard/primitives';
import { LiveDot } from '@/components/Dashboard/PlatformHub';
import s from './CampaignDetail.module.css';

type Status = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
type Channel = 'email' | 'sms' | 'push';

const STATUS_LABELS: Record<Status, string> = {
  draft: 'پیش‌نویس',
  scheduled: 'زمان‌بندی',
  sending: 'در حال ارسال',
  completed: 'تکمیل شده',
  paused: 'متوقف',
};

const STATUS_TONES: Record<Status, 'emerald' | 'indigo' | 'amber' | 'rose' | 'violet' | 'cyan'> = {
  completed: 'emerald',
  sending: 'indigo',
  scheduled: 'violet',
  paused: 'amber',
  draft: 'rose',
};

const CHANNEL_META: Record<Channel, { label: string; tone: 'emerald' | 'indigo' | 'amber'; icon: LucideIcon }> = {
  email: { label: 'ایمیل', tone: 'indigo', icon: Mail },
  sms: { label: 'پیامک', tone: 'amber', icon: Send },
  push: { label: 'Push', tone: 'emerald', icon: Sparkles },
};

const AUDIENCE_LABELS: Record<'all' | 'role' | 'segment', string> = {
  all: 'همه کاربران',
  role: 'بر اساس نقش',
  segment: 'سگمنت سفارشی',
};

interface Recipient {
  userId: string;
  status: 'pending' | 'sent' | 'failed' | 'opened' | 'clicked' | 'bounced';
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
}

const RECIPIENT_LABELS: Record<Recipient['status'], string> = {
  pending: 'در انتظار',
  sent: 'ارسال شد',
  failed: 'ناموفق',
  opened: 'باز شد',
  clicked: 'کلیک شد',
  bounced: 'بازگشتی',
};

const RECIPIENT_TONES: Record<Recipient['status'], 'emerald' | 'indigo' | 'amber' | 'rose' | 'violet'> = {
  pending: 'violet',
  sent: 'emerald',
  failed: 'rose',
  opened: 'indigo',
  clicked: 'indigo',
  bounced: 'amber',
};

interface Props {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    channel: Channel;
    subject: string | null;
    body: string;
    status: Status;
    audience: 'all' | 'role' | 'segment';
    audienceFilter: string | null;
    scheduledAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    stats: { sent: number; opened: number; clicked: number; bounced: number };
    createdAt: string;
    updatedAt: string;
    recipients: Recipient[];
  };
}

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));
const fmtPercent = (n: number) => `${PERSIAN_NUM((n * 100).toFixed(1))}٪`;

const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function CampaignDetail({ campaign }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const ChannelIcon = CHANNEL_META[campaign.channel].icon;
  const chTone = CHANNEL_META[campaign.channel].tone;
  const stTone = STATUS_TONES[campaign.status];

  const openRate = campaign.stats.sent > 0 ? campaign.stats.opened / campaign.stats.sent : 0;
  const clickRate = campaign.stats.sent > 0 ? campaign.stats.clicked / campaign.stats.sent : 0;
  const bounceRate = campaign.stats.sent > 0 ? campaign.stats.bounced / campaign.stats.sent : 0;

  // ── recipient distribution ──
  const recipientStats = useMemo(() => {
    const acc = { pending: 0, sent: 0, failed: 0, opened: 0, clicked: 0, bounced: 0 };
    for (const r of campaign.recipients) acc[r.status] += 1;
    return acc;
  }, [campaign.recipients]);

  // top 20 recent recipients
  const recentRecipients = useMemo(() => {
    return [...campaign.recipients]
      .sort((a, b) => {
        const at = new Date(a.sentAt ?? a.openedAt ?? a.clickedAt ?? 0).getTime();
        const bt = new Date(b.sentAt ?? b.openedAt ?? b.clickedAt ?? 0).getTime();
        return bt - at;
      })
      .slice(0, 12);
  }, [campaign.recipients]);

  const changeStatus = (next: Status) => {
    setActionError(null);
    setActionOk(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/communication/campaigns/${campaign.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setActionError(data?.error?.message ?? 'خطا در تغییر وضعیت');
          return;
        }
        setActionOk(
          next === 'sending'
            ? 'کمپین ارسال شد'
            : next === 'paused'
              ? 'کمپین متوقف شد'
              : 'وضعیت به‌روزرسانی شد',
        );
        router.refresh();
      } catch {
        setActionError('خطای شبکه');
      }
    });
  };

  const onDelete = () => {
    setConfirmDelete(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/communication/campaigns/${campaign.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setActionError(data?.error?.message ?? 'خطا در حذف');
          return;
        }
        router.push('/dashboard/communication/campaigns');
        router.refresh();
      } catch {
        setActionError('خطای شبکه');
      }
    });
  };

  return (
    <div className={s.page} dir="rtl">
      {/* ═══ HEADER (cover) ═══════════════════════════════ */}
      <header className={s.cover} data-tone={stTone}>
        <Spotlight tone={stTone} size={480} className={s.coverSpot} />
        <nav className={s.crumbs} aria-label="مسیر">
          <Link href="/dashboard" className={s.crumbLink}>داشبورد</Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication" className={s.crumbLink}>مرکز ارتباطات</Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication/campaigns" className={s.crumbLink}>کمپین‌ها</Link>
          <span className={s.crumbSep}>/</span>
          <span className={s.crumbCurrent}>{campaign.id.slice(0, 8)}</span>
        </nav>

        <div className={s.coverMain}>
          <div className={s.coverMainLeft}>
            <span className={s.statusPill} data-tone={stTone}>
              <LiveDot tone={stTone} size="xs" />
              {STATUS_LABELS[campaign.status]}
            </span>
            <h1 className={s.title}>{campaign.name}</h1>
            <div className={s.coverMeta}>
              <span className={s.coverMetaItem} data-channel={campaign.channel}>
                <ChannelIcon size={11} aria-hidden />
                {CHANNEL_META[campaign.channel].label}
              </span>
              <span className={s.coverMetaItem}>
                <Users size={11} aria-hidden /> {AUDIENCE_LABELS[campaign.audience]}
              </span>
              <span className={s.coverMetaItem}>
                <Clock size={11} aria-hidden /> ساخته {formatDateTime(campaign.createdAt)}
              </span>
            </div>
          </div>
          <div className={s.coverActions}>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/communication/campaigns">
                <ChevronRight size={14} aria-hidden />
                بازگشت
              </Link>
            </Button>
            {campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'paused' ? (
              <Button onClick={() => changeStatus('sending')} disabled={pending}>
                <Play size={14} aria-hidden />
                ارسال کمپین
              </Button>
            ) : null}
            {campaign.status === 'sending' ? (
              <Button onClick={() => changeStatus('paused')} disabled={pending}>
                <Pause size={14} aria-hidden />
                توقف موقت
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {actionError ? <div className={s.alert} data-tone="rose">{actionError}</div> : null}
      {actionOk ? <div className={s.alert} data-tone="emerald">{actionOk}</div> : null}

      {/* ═══ STAT STRIP ════════════════════════════════════ */}
      <div className={s.statStrip}>
        <div className={s.statBlock} data-tone="emerald">
          <span className={s.statLabel}>ارسال</span>
          <span className={s.statValue}>{fmtPersian(campaign.stats.sent)}</span>
          <span className={s.statMeta}>پیام</span>
        </div>
        <div className={s.statBlock} data-tone="indigo">
          <span className={s.statLabel}>باز شدن</span>
          <span className={s.statValue}>{fmtPercent(openRate)}</span>
          <span className={s.statMeta}>{fmtPersian(campaign.stats.opened)} مورد</span>
        </div>
        <div className={s.statBlock} data-tone="violet">
          <span className={s.statLabel}>کلیک</span>
          <span className={s.statValue}>{fmtPercent(clickRate)}</span>
          <span className={s.statMeta}>{fmtPersian(campaign.stats.clicked)} مورد</span>
        </div>
        <div className={s.statBlock} data-tone="amber">
          <span className={s.statLabel}>بازگشتی</span>
          <span className={s.statValue}>{fmtPercent(bounceRate)}</span>
          <span className={s.statMeta}>{fmtPersian(campaign.stats.bounced)} مورد</span>
        </div>
      </div>

      {/* ═══ MAIN GRID (article + aside) ═══════════════════════ */}
      <div className={s.grid}>
        {/* message body */}
        <article className={s.article}>
          {campaign.subject ? (
            <header className={s.subjectHead}>
              <span className={s.subjectEyebrow}>موضوع</span>
              <h2 className={s.subjectTitle}>{campaign.subject}</h2>
            </header>
          ) : null}
          <div className={s.body}>
            {campaign.body.split('\n').map((line, i) => (
              <p key={i} className={s.bodyLine}>{line || '\u00A0'}</p>
            ))}
          </div>

          {/* recipients strip */}
          <div className={s.recipients}>
            <div className={s.recipientsHead}>
              <span className={s.articleEyebrow}>گیرندگان</span>
              <span className={s.recipientsMeta}>
                {fmtPersian(campaign.recipients.length)} مورد
              </span>
            </div>
            <div className={s.recipientStat}>
              {(['sent', 'opened', 'clicked', 'pending', 'failed', 'bounced'] as const).map((st) => (
                <div key={st} className={s.recipientPill} data-tone={RECIPIENT_TONES[st]}>
                  <span className={s.recipientPillLabel}>{RECIPIENT_LABELS[st]}</span>
                  <span className={s.recipientPillCount}>{fmtPersian(recipientStats[st])}</span>
                </div>
              ))}
            </div>
            <ul className={s.recipientList}>
              {recentRecipients.length === 0 ? (
                <li className={s.recipientEmpty}>گیرنده‌ای ثبت نشده.</li>
              ) : (
                recentRecipients.map((r) => (
                  <li key={r.userId} className={s.recipientItem} data-tone={RECIPIENT_TONES[r.status]}>
                    <span className={s.recipientStatus} data-tone={RECIPIENT_TONES[r.status]}>
                      <LiveDot tone={RECIPIENT_TONES[r.status]} size="xs" />
                      {RECIPIENT_LABELS[r.status]}
                    </span>
                    <span className={s.recipientUser}>{r.userId.slice(0, 8)}</span>
                    <time className={s.recipientTime}>
                      {formatDateTime(r.sentAt ?? r.openedAt ?? r.clickedAt)}
                    </time>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* danger zone */}
          {campaign.status === 'draft' ||
          campaign.status === 'completed' ||
          campaign.status === 'paused' ? (
            <div className={s.danger}>
              <div className={s.dangerHead}>
                <span className={s.dangerTitle}>حذف کمپین</span>
                <span className={s.dangerSub}>
                  کمپین به همراه تمام آمار گیرندگان برای همیشه حذف خواهد شد.
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                className={s.dangerBtn}
              >
                <Trash2 size={14} aria-hidden /> حذف کمپین
              </Button>
            </div>
          ) : null}
        </article>

        {/* aside meta */}
        <aside className={s.aside}>
          <section className={s.asideSection}>
            <span className={s.asideEyebrow}>مخاطب</span>
            <div className={s.asideBig}>
              <Users size={16} aria-hidden />
              <span>{AUDIENCE_LABELS[campaign.audience]}</span>
            </div>
            {campaign.audienceFilter ? (
              <span className={s.asideHint}>فیلتر: {campaign.audienceFilter}</span>
            ) : null}
          </section>

          <section className={s.asideSection}>
            <span className={s.asideEyebrow}>کانال</span>
            <div className={s.asideBig}>
              <ChannelIcon size={16} aria-hidden />
              <span>{CHANNEL_META[campaign.channel].label}</span>
            </div>
            <div className={s.channelBar} aria-hidden>
              <span
                className={s.channelBarFill}
                style={{ width: `${Math.min(100, openRate * 100)}%` }}
                data-tone={chTone}
              />
            </div>
            <span className={s.asideHint}>نرخ باز شدن: {fmtPercent(openRate)}</span>
          </section>

          <section className={s.asideSection}>
            <span className={s.asideEyebrow}>تاریخچه</span>
            <dl className={s.asideList}>
              <div className={s.asideRow}>
                <dt>ساخته</dt>
                <dd>{formatDateTime(campaign.createdAt)}</dd>
              </div>
              <div className={s.asideRow}>
                <dt>بروزرسانی</dt>
                <dd>{formatDateTime(campaign.updatedAt)}</dd>
              </div>
              {campaign.scheduledAt ? (
                <div className={s.asideRow}>
                  <dt>زمان‌بندی</dt>
                  <dd>{formatDateTime(campaign.scheduledAt)}</dd>
                </div>
              ) : null}
              {campaign.startedAt ? (
                <div className={s.asideRow}>
                  <dt>شروع</dt>
                  <dd>{formatDateTime(campaign.startedAt)}</dd>
                </div>
              ) : null}
              {campaign.completedAt ? (
                <div className={s.asideRow}>
                  <dt>پایان</dt>
                  <dd>{formatDateTime(campaign.completedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {campaign.status === 'completed' ? (
            <section className={s.asideSection} data-tone="emerald">
              <span className={s.asideEyebrow} data-tone="emerald">
                <CheckCircle2 size={12} aria-hidden /> تکمیل شده
              </span>
              <span className={s.asideText}>
                کمپین با موفقیت به پایان رسید.
              </span>
            </section>
          ) : null}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="حذف کمپین"
        description="کمپین به همراه تمام آمار گیرندگان آن برای همیشه حذف خواهد شد."
        confirmLabel="حذف"
        cancelLabel="انصراف"
        variant="danger"
        loading={pending}
        onConfirm={onDelete}
      />
    </div>
  );
}
