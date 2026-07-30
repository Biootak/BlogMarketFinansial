'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  Pause,
  Play,
  Send,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { LiveDot } from '@/components/Dashboard/PlatformHub';
import { Spotlight, GeometricAccent } from '@/components/Dashboard/primitives';
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

const STATUS_TONES: Record<Status, 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'neutral'> = {
  completed: 'emerald',
  sending: 'indigo',
  scheduled: 'cyan',
  paused: 'amber',
  draft: 'rose',
};

const CHANNEL_LABELS: Record<Channel, string> = {
  email: 'ایمیل',
  sms: 'پیامک',
  push: 'Push',
};

const CHANNEL_ICONS: Record<Channel, typeof Mail> = {
  email: Mail,
  sms: Send,
  push: Sparkles,
};

const AUDIENCE_LABELS: Record<'all' | 'role' | 'segment', string> = {
  all: 'همه کاربران',
  role: 'بر اساس نقش',
  segment: 'سگمنت سفارشی',
};

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

const fmtPersian = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));
const fmtPercent = (n: number) => `${PERSIAN_NUM((n * 100).toFixed(1))}٪`;

const fmtDateTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export function CampaignDetail({ campaign }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const ChannelIcon = CHANNEL_ICONS[campaign.channel];
  const tone = STATUS_TONES[campaign.status];
  const openRate = campaign.stats.sent > 0 ? campaign.stats.opened / campaign.stats.sent : 0;
  const clickRate = campaign.stats.sent > 0 ? campaign.stats.clicked / campaign.stats.sent : 0;
  const bounceRate = campaign.stats.sent > 0 ? campaign.stats.bounced / campaign.stats.sent : 0;

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
          next === 'sending' ? 'کمپین ارسال شد' : next === 'paused' ? 'کمپین متوقف شد' : 'وضعیت به‌روزرسانی شد',
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
      <nav className={s.crumbs} aria-label="مسیر">
        <Link href="/dashboard/communication" className={s.crumbLink}>
          مرکز ارتباطات
        </Link>
        <span className={s.crumbSep}>/</span>
        <Link href="/dashboard/communication/campaigns" className={s.crumbLink}>
          کمپین‌ها
        </Link>
        <span className={s.crumbSep}>/</span>
        <span className={s.crumbCurrent} aria-current="page">
          {campaign.name}
        </span>
      </nav>

      <header className={s.header}>
        <div className={s.headerMain}>
          <div className={s.eyebrow}>
            <ChannelIcon size={14} aria-hidden />
            <span>{CHANNEL_LABELS[campaign.channel]}</span>
            <span className={s.dot} aria-hidden>·</span>
            <span>جزئیات کمپین</span>
          </div>
          <h1 className={s.title}>{campaign.name}</h1>
          {campaign.subject ? <p className={s.subject}>{campaign.subject}</p> : null}
          <div className={s.meta}>
            <span className={s.statusBadge} data-tone={tone}>
              <LiveDot tone={tone === 'neutral' ? 'neutral' : tone} size="xs" />
              {STATUS_LABELS[campaign.status]}
            </span>
            <span className={s.metaItem}>
              <Clock size={12} aria-hidden /> ایجاد {fmtDateTime(campaign.createdAt)}
            </span>
            {campaign.completedAt ? (
              <>
                <span className={s.metaDot} aria-hidden>·</span>
                <span className={s.metaItem}>
                  <CheckCircle2 size={12} aria-hidden /> تکمیل {fmtDateTime(campaign.completedAt)}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className={s.headerActions}>
          {campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'paused' ? (
            <Button onClick={() => changeStatus('sending')} disabled={pending}>
              <Play size={14} aria-hidden />
              ارسال کمپین
            </Button>
          ) : null}
          {campaign.status === 'sending' ? (
            <Button variant="outline" onClick={() => changeStatus('paused')} disabled={pending}>
              <Pause size={14} aria-hidden />
              توقف موقت
            </Button>
          ) : null}
          {campaign.status !== 'completed' && campaign.status !== 'sending' ? (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 size={14} aria-hidden />
              حذف
            </Button>
          ) : null}
        </div>
      </header>

      {actionError ? <div className={s.alertError}>{actionError}</div> : null}
      {actionOk ? <div className={s.alertOk}>{actionOk}</div> : null}

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <span className={s.statLabel}>ارسال‌ها</span>
          <span className={s.statValue}>{fmtPersian(campaign.stats.sent)}</span>
          <span className={s.statSub}>پیام</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>نرخ باز شدن</span>
          <span className={s.statValue}>{fmtPercent(openRate)}</span>
          <span className={s.statSub}>{fmtPersian(campaign.stats.opened)} باز شد</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>نرخ کلیک</span>
          <span className={s.statValue}>{fmtPercent(clickRate)}</span>
          <span className={s.statSub}>{fmtPersian(campaign.stats.clicked)} کلیک</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>بازگشتی</span>
          <span className={s.statValue}>{fmtPercent(bounceRate)}</span>
          <span className={s.statSub}>{fmtPersian(campaign.stats.bounced)}</span>
        </div>
      </div>

      <div className={s.grid}>
        <Card className={s.bodyCard}>
          <Spotlight tone="indigo" />
          <GeometricAccent variant="dot" position="br" />
          <CardContent className={s.bodyContent}>
            <div className={s.bodyLabel}>
              <Send size={14} aria-hidden />
              <span>متن کمپین</span>
            </div>
            <div className={s.bodyText}>{campaign.body || '—'}</div>
            {campaign.description ? (
              <>
                <div className={s.bodyLabel} style={{ marginBlockStart: '1.25rem' }}>
                  <Sparkles size={14} aria-hidden />
                  <span>توضیحات</span>
                </div>
                <p className={s.description}>{campaign.description}</p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <aside className={s.aside}>
          <Card className={s.factCard}>
            <Spotlight tone="emerald" />
            <CardContent className={s.factContent}>
              <h2 className={s.factTitle}>
                <Sparkles size={14} aria-hidden />
                مشخصات
              </h2>
              <dl className={s.facts}>
                <div className={s.fact}>
                  <dt>کانال</dt>
                  <dd>{CHANNEL_LABELS[campaign.channel]}</dd>
                </div>
                <div className={s.fact}>
                  <dt>مخاطب</dt>
                  <dd>{AUDIENCE_LABELS[campaign.audience]}</dd>
                </div>
                {campaign.audienceFilter ? (
                  <div className={s.fact}>
                    <dt>فیلتر</dt>
                    <dd>{campaign.audienceFilter}</dd>
                  </div>
                ) : null}
                <div className={s.fact}>
                  <dt>زمان‌بندی</dt>
                  <dd>{fmtDateTime(campaign.scheduledAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>شروع ارسال</dt>
                  <dd>{fmtDateTime(campaign.startedAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>پایان ارسال</dt>
                  <dd>{fmtDateTime(campaign.completedAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>آخرین به‌روزرسانی</dt>
                  <dd>{fmtDateTime(campaign.updatedAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>شناسه</dt>
                  <dd className={s.factMono}>#{campaign.id.slice(-10)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Card className={s.recipientsCard}>
        <CardContent className={s.recipientsContent}>
          <div className={s.recipientsHead}>
            <h2 className={s.recipientsTitle}>
              <Users size={14} aria-hidden />
              گیرندگان
            </h2>
            <span className={s.recipientsCount}>
              {fmtPersian(campaign.recipients.length)} مورد
            </span>
          </div>
          {campaign.recipients.length === 0 ? (
            <div className={s.recipientsEmpty}>هنوز گیرنده‌ای ثبت نشده است.</div>
          ) : (
            <ul className={s.recipientsList}>
              {campaign.recipients.map((r) => (
                <li key={r.userId} className={s.recipientRow}>
                  <span className={s.recipientId}>#{r.userId.slice(-8)}</span>
                  <span className={s.recipientStatus} data-status={r.status}>
                    {RECIPIENT_LABELS[r.status]}
                  </span>
                  <span className={s.recipientTime}>{fmtDateTime(r.sentAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className={s.footNav}>
        <Button variant="ghost" asChild>
          <Link href="/dashboard/communication/campaigns">
            <ArrowRight size={14} aria-hidden />
            بازگشت به فهرست
          </Link>
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="حذف کمپین"
        description={`کمپین «${PERSIAN_NUM(campaign.name.slice(0, 40))}» به همراه تمام گیرندگان آن برای همیشه حذف خواهد شد.`}
        confirmLabel="حذف"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={onDelete}
        loading={pending}
      />
    </div>
  );
}
