'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  Megaphone,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { Card, CardContent } from '@/components/ui/card';
import { LiveDot } from '@/components/Dashboard/PlatformHub';
import { Spotlight, GeometricAccent } from '@/components/Dashboard/primitives';
import s from './AnnouncementDetail.module.css';

type Status = 'draft' | 'scheduled' | 'published' | 'archived';
type Channel = 'inapp' | 'email' | 'push' | 'sms';
type Audience = 'all' | 'role' | 'segment';

const STATUS_LABELS: Record<Status, string> = {
  published: 'منتشر شده',
  scheduled: 'زمان‌بندی',
  draft: 'پیش‌نویس',
  archived: 'آرشیو',
};

const STATUS_TONES: Record<Status, 'emerald' | 'indigo' | 'amber' | 'rose' | 'neutral'> = {
  published: 'emerald',
  scheduled: 'indigo',
  draft: 'amber',
  archived: 'neutral',
};

const CHANNEL_LABELS: Record<Channel, string> = {
  inapp: 'In-app',
  email: 'ایمیل',
  push: 'Push',
  sms: 'پیامک',
};

const CHANNEL_TONES: Record<Channel, 'emerald' | 'indigo' | 'amber' | 'violet'> = {
  inapp: 'violet',
  email: 'indigo',
  push: 'emerald',
  sms: 'amber',
};

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'همه کاربران',
  role: 'بر اساس نقش',
  segment: 'سگمنت سفارشی',
};

interface Props {
  id: string;
  title: string;
  body: string;
  status: Status;
  channels: Channel[];
  audience: Audience;
  audienceFilter: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const PERSIAN_NUM = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

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

const fmtDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export function AnnouncementDetail(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (path: string, successMessage: string) => {
    setActionError(null);
    setActionOk(null);
    startTransition(async () => {
      try {
        const res = await fetch(path, { method: 'POST' });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setActionError(data?.error?.message ?? 'خطا در انجام عملیات');
          return;
        }
        setActionOk(successMessage);
        // refresh server data so the page reflects the new status.
        router.refresh();
      } catch {
        setActionError('خطای شبکه');
      }
    });
  };

  const onPublish = () => run(`/api/communication/announcements/${props.id}/publish`, 'اعلان منتشر شد');
  const onArchive = () => run(`/api/communication/announcements/${props.id}/archive`, 'اعلان بایگانی شد');
  const onDelete = () => {
    setConfirmDelete(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/communication/announcements/${props.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setActionError(data?.error?.message ?? 'خطا در حذف');
          return;
        }
        router.push('/dashboard/communication/announcements');
        router.refresh();
      } catch {
        setActionError('خطای شبکه');
      }
    });
  };

  const status = props.status;
  const tone = STATUS_TONES[status];

  return (
    <div className={s.page} dir="rtl">
      <nav className={s.crumbs} aria-label="مسیر">
        <Link href="/dashboard/communication" className={s.crumbLink}>
          مرکز ارتباطات
        </Link>
        <span className={s.crumbSep}>/</span>
        <Link href="/dashboard/communication/announcements" className={s.crumbLink}>
          اعلان‌ها
        </Link>
        <span className={s.crumbSep}>/</span>
        <span className={s.crumbCurrent} aria-current="page">
          {props.title}
        </span>
      </nav>

      <header className={s.header}>
        <div className={s.headerMain}>
          <div className={s.eyebrow}>
            <Megaphone size={14} aria-hidden />
            <span>جزئیات اعلان</span>
          </div>
          <h1 className={s.title}>{props.title}</h1>
          <div className={s.meta}>
            <span className={s.statusBadge} data-tone={tone}>
              <LiveDot tone={tone === 'neutral' ? 'neutral' : tone} size="xs" />
              {STATUS_LABELS[status]}
            </span>
            <span className={s.metaDot} aria-hidden>·</span>
            <span className={s.metaItem}>
              <Clock size={12} aria-hidden /> ایجاد {fmtDateTime(props.createdAt)}
            </span>
            {props.publishedAt ? (
              <>
                <span className={s.metaDot} aria-hidden>·</span>
                <span className={s.metaItem}>
                  <CheckCircle2 size={12} aria-hidden /> انتشار {fmtDateTime(props.publishedAt)}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className={s.headerActions}>
          {status === 'draft' || status === 'scheduled' ? (
            <Button onClick={onPublish} disabled={pending}>
              <Send size={14} aria-hidden />
              {pending ? 'در حال انتشار…' : 'انتشار فوری'}
            </Button>
          ) : null}
          {status !== 'archived' ? (
            <Button variant="outline" onClick={onArchive} disabled={pending}>
              <Archive size={14} aria-hidden />
              بایگانی
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link href={`/dashboard/communication/announcements/${props.id}/edit`}>
              <Pencil size={14} aria-hidden />
              ویرایش
            </Link>
          </Button>
          {status === 'draft' || status === 'archived' ? (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash2 size={14} aria-hidden />
              حذف
            </Button>
          ) : null}
        </div>
      </header>

      {actionError ? <div className={s.alertError}>{actionError}</div> : null}
      {actionOk ? <div className={s.alertOk}>{actionOk}</div> : null}

      <div className={s.grid}>
        <Card className={s.bodyCard}>
          <Spotlight tone="emerald" />
          <GeometricAccent variant="dot" position="br" />
          <CardContent className={s.bodyContent}>
            <div className={s.bodyLabel}>
              <Eye size={14} aria-hidden />
              <span>متن اعلان</span>
            </div>
            <div className={s.bodyText}>{props.body || '—'}</div>
          </CardContent>
        </Card>

        <aside className={s.aside}>
          <Card className={s.factCard}>
            <Spotlight tone="indigo" />
            <CardContent className={s.factContent}>
              <h2 className={s.factTitle}>
                <Sparkles size={14} aria-hidden />
                مشخصات
              </h2>
              <dl className={s.facts}>
                <div className={s.fact}>
                  <dt>کانال‌های ارسال</dt>
                  <dd className={s.factChannels}>
                    {props.channels.map((c) => (
                      <span key={c} className={s.channelPill} data-tone={CHANNEL_TONES[c]}>
                        {CHANNEL_LABELS[c]}
                      </span>
                    ))}
                  </dd>
                </div>
                <div className={s.fact}>
                  <dt>مخاطب</dt>
                  <dd>{AUDIENCE_LABELS[props.audience]}</dd>
                </div>
                {props.audienceFilter ? (
                  <div className={s.fact}>
                    <dt>فیلتر مخاطب</dt>
                    <dd>{props.audienceFilter}</dd>
                  </div>
                ) : null}
                <div className={s.fact}>
                  <dt>زمان انتشار</dt>
                  <dd>{fmtDateTime(props.scheduledAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>تاریخ انتشار</dt>
                  <dd>{fmtDateTime(props.publishedAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>انقضا</dt>
                  <dd>{fmtDateTime(props.expiresAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>آخرین به‌روزرسانی</dt>
                  <dd>{fmtDateTime(props.updatedAt)}</dd>
                </div>
                <div className={s.fact}>
                  <dt>شناسه</dt>
                  <dd className={s.factMono}>#{props.id.slice(-10)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className={s.footNav}>
        <Button variant="ghost" asChild>
          <Link href="/dashboard/communication/announcements">
            <ArrowRight size={14} aria-hidden />
            بازگشت به فهرست
          </Link>
        </Button>
        <span className={s.footHint}>
          برای ارسال کمپین هدفمند، از بخش{' '}
          <Link href="/dashboard/communication/campaigns/new" className={s.footLink}>
            کمپین جدید
          </Link>{' '}
          استفاده کنید.
        </span>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="حذف اعلان"
        description={`اعلان «${PERSIAN_NUM(props.title.slice(0, 40))}» برای همیشه حذف خواهد شد. این عملیات برگشت‌پذیر نیست.`}
        confirmLabel="حذف"
        cancelLabel="انصراف"
        variant="danger"
        onConfirm={onDelete}
        loading={pending}
      />
    </div>
  );
}
