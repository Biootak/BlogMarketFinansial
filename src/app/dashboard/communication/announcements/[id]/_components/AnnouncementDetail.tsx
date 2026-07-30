'use client';

/**
 * AnnouncementDetail v2 — Editorial Article
 * ساختار: HEADER (cover-style) → ARTICLE body → ASIDE meta → ACTIONS
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Mail,
  MessageSquare,
  Pencil,
  Smartphone,
  Send,
  Trash2,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Spotlight } from '@/components/Dashboard/primitives';
import { LiveDot } from '@/components/Dashboard/PlatformHub';
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

const STATUS_TONES: Record<Status, 'emerald' | 'indigo' | 'amber' | 'rose'> = {
  published: 'emerald',
  scheduled: 'indigo',
  draft: 'amber',
  archived: 'rose',
};

const CHANNEL_META: Record<Channel, { label: string; tone: 'emerald' | 'indigo' | 'amber' | 'violet'; icon: LucideIcon }> = {
  email: { label: 'ایمیل', tone: 'indigo', icon: Mail },
  push: { label: 'Push', tone: 'emerald', icon: Bell },
  sms: { label: 'پیامک', tone: 'amber', icon: Smartphone },
  inapp: { label: 'In-app', tone: 'violet', icon: MessageSquare },
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
const fmt = (n: number) => PERSIAN_NUM(n.toLocaleString('en-US'));

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function AnnouncementDetail(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const statusTone = STATUS_TONES[props.status];
  const statusLabel = STATUS_LABELS[props.status];
  const channelList = props.channels.map((c) => CHANNEL_META[c]);
  const dateIso = props.publishedAt ?? props.scheduledAt ?? props.createdAt;

  const runAction = async (
    path: string,
    method: 'POST' | 'DELETE' = 'POST',
  ): Promise<{ ok: boolean; message?: string }> => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(path, { method });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
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

  const onPublish = () => {
    startTransition(async () => {
      const r = await runAction(`/api/communication/announcements/${props.id}/publish`);
      if (r.ok) {
        setActionSuccess('اعلان منتشر شد');
        router.refresh();
      }
    });
  };
  const onArchive = () => {
    startTransition(async () => {
      const r = await runAction(`/api/communication/announcements/${props.id}/archive`);
      if (r.ok) {
        setActionSuccess('بایگانی شد');
        router.refresh();
      }
    });
  };
  const onDelete = () => {
    setConfirmDelete(false);
    startTransition(async () => {
      const r = await runAction(`/api/communication/announcements/${props.id}`, 'DELETE');
      if (r.ok) router.push('/dashboard/communication/announcements');
    });
  };

  const canEdit = props.status === 'draft' || props.status === 'scheduled';
  const canPublish = props.status === 'draft' || props.status === 'scheduled';
  const canArchive = props.status !== 'archived';
  const canDelete = props.status === 'draft' || props.status === 'archived';

  return (
    <div className={s.page} dir="rtl">
      {/* ═══ HEADER (cover) ═══════════════════════════════ */}
      <header className={s.cover} data-tone={statusTone}>
        <Spotlight tone={statusTone} size={480} className={s.coverSpot} />
        <nav className={s.crumbs} aria-label="مسیر">
          <Link href="/dashboard" className={s.crumbLink}>داشبورد</Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication" className={s.crumbLink}>مرکز ارتباطات</Link>
          <span className={s.crumbSep}>/</span>
          <Link href="/dashboard/communication/announcements" className={s.crumbLink}>اعلان‌ها</Link>
          <span className={s.crumbSep}>/</span>
          <span className={s.crumbCurrent} aria-current="page">{props.id.slice(0, 8)}</span>
        </nav>

        <div className={s.coverMain}>
          <div className={s.coverMainLeft}>
            <span className={s.statusPill} data-tone={statusTone}>
              <LiveDot tone={statusTone} size="xs" />
              {statusLabel}
            </span>
            <h1 className={s.title}>{props.title}</h1>
            <div className={s.coverMeta}>
              <span className={s.coverMetaItem}>
                <Clock size={11} aria-hidden /> ساخته‌شده {formatDate(props.createdAt)}
              </span>
              {props.publishedAt ? (
                <span className={s.coverMetaItem}>
                  <CheckCircle2 size={11} aria-hidden /> منتشر شده {formatDate(props.publishedAt)} ساعت {formatTime(props.publishedAt)}
                </span>
              ) : null}
              {props.scheduledAt && !props.publishedAt ? (
                <span className={s.coverMetaItem}>
                  <CalendarClock size={11} aria-hidden /> زمان‌بندی برای {formatDate(props.scheduledAt)} ساعت {formatTime(props.scheduledAt)}
                </span>
              ) : null}
            </div>
          </div>
          <div className={s.coverActions}>
            <Button variant="ghost" asChild>
              <Link href="/dashboard/communication/announcements">
                <ChevronLeft size={14} aria-hidden />
                بازگشت
              </Link>
            </Button>
            {canEdit ? (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/communication/announcements/${props.id}/edit`}>
                  <Pencil size={14} aria-hidden /> ویرایش
                </Link>
              </Button>
            ) : null}
            {canPublish ? (
              <Button onClick={onPublish} disabled={pending}>
                <Send size={14} aria-hidden /> انتشار فوری
              </Button>
            ) : null}
            {canArchive ? (
              <Button variant="ghost" onClick={onArchive} disabled={pending}>
                <Archive size={14} aria-hidden /> بایگانی
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      {actionError ? <div className={s.alert} data-tone="rose">{actionError}</div> : null}
      {actionSuccess ? <div className={s.alert} data-tone="emerald">{actionSuccess}</div> : null}

      {/* ═══ MAIN GRID (article + aside) ═══════════════════════ */}
      <div className={s.grid}>
        {/* article body */}
        <article className={s.article}>
          <div className={s.articleHead}>
            <span className={s.articleEyebrow}>متن اعلان</span>
            <span className={s.articleMark}>{props.body.length} حرف</span>
          </div>
          <div className={s.body}>
            {props.body.split('\n').map((line, i) => (
              <p key={i} className={s.bodyLine}>{line || '\u00A0'}</p>
            ))}
          </div>

          {/* channel distribution visual */}
          <div className={s.distribute}>
            <div className={s.distributeHead}>
              <span className={s.articleEyebrow}>کانال‌های ارسال</span>
              <span className={s.distributeMeta}>
                {channelList.length} کانال انتخاب‌شده
              </span>
            </div>
            <div className={s.channelGrid}>
              {channelList.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className={s.channelItem} data-tone={c.tone}>
                    <span className={s.channelIcon}>
                      <Icon size={14} aria-hidden />
                    </span>
                    <div className={s.channelBody}>
                      <span className={s.channelLabel}>{c.label}</span>
                      <span className={s.channelSub}>ارسال فعال</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* danger zone — delete */}
          {canDelete ? (
            <div className={s.danger}>
              <div className={s.dangerHead}>
                <span className={s.dangerTitle}>حذف اعلان</span>
                <span className={s.dangerSub}>
                  این عملیات برگشت‌پذیر نیست. اعلان برای همیشه حذف خواهد شد.
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                className={s.dangerBtn}
              >
                <Trash2 size={14} aria-hidden /> حذف کامل
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
              <span>{AUDIENCE_LABELS[props.audience]}</span>
            </div>
            {props.audienceFilter ? (
              <span className={s.asideHint}>فیلتر: {props.audienceFilter}</span>
            ) : null}
          </section>

          <section className={s.asideSection}>
            <span className={s.asideEyebrow}>تاریخچه</span>
            <dl className={s.asideList}>
              <div className={s.asideRow}>
                <dt>ساخته</dt>
                <dd>{formatDate(props.createdAt)}</dd>
              </div>
              <div className={s.asideRow}>
                <dt>بروزرسانی</dt>
                <dd>{formatDate(props.updatedAt)}</dd>
              </div>
              {props.scheduledAt ? (
                <div className={s.asideRow}>
                  <dt>زمان‌بندی</dt>
                  <dd>{formatDate(props.scheduledAt)} · {formatTime(props.scheduledAt)}</dd>
                </div>
              ) : null}
              {props.publishedAt ? (
                <div className={s.asideRow}>
                  <dt>انتشار</dt>
                  <dd>{formatDate(props.publishedAt)} · {formatTime(props.publishedAt)}</dd>
                </div>
              ) : null}
              {props.expiresAt ? (
                <div className={s.asideRow}>
                  <dt>انقضا</dt>
                  <dd>{formatDate(props.expiresAt)}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className={s.asideSection}>
            <span className={s.asideEyebrow}>شناسه</span>
            <code className={s.asideCode}>{props.id}</code>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="حذف اعلان"
        description="این اعلان برای همیشه حذف خواهد شد. این عملیات برگشت‌پذیر نیست."
        confirmLabel="حذف"
        cancelLabel="انصراف"
        variant="danger"
        loading={pending}
        onConfirm={onDelete}
      />
    </div>
  );
}
