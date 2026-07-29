'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Clock,
  Edit3,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Radio,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';

import { Spotlight } from '@/components/Dashboard/primitives/Spotlight';
import type {
  AnnouncementSummary,
  CampaignSummary,
  Channel,
  CommunicationSnapshot,
} from '@/lib/communication';
import { createAnnouncement, publishAnnouncement, archiveAnnouncement } from '@/actions/communication-actions';
import s from './CommunicationHub.module.css';

interface Props {
  initialData?: CommunicationSnapshot;
}

type Tab = 'overview' | 'announcements' | 'campaigns' | 'compose';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'نمای کلی', icon: <Radio className="h-4 w-4" /> },
  { id: 'announcements', label: 'اعلان‌ها', icon: <Bell className="h-4 w-4" /> },
  { id: 'campaigns', label: 'کمپین‌ها', icon: <Send className="h-4 w-4" /> },
  { id: 'compose', label: 'اعلان جدید', icon: <Plus className="h-4 w-4" /> },
];

const STATUS_LABEL: Record<string, string> = {
  draft: 'پیش‌نویس',
  scheduled: 'زمان‌بندی شده',
  published: 'منتشر شده',
  archived: 'بایگانی',
  sending: 'در حال ارسال',
  completed: 'تکمیل',
  paused: 'متوقف',
};

const CHANNEL_LABEL: Record<Channel, string> = {
  inapp: 'درون‌برنامه',
  email: 'ایمیل',
  push: 'پوش',
  sms: 'پیامک',
};

const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  inapp: <Inbox className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  push: <Smartphone className="h-3.5 w-3.5" />,
  sms: <MessageSquare className="h-3.5 w-3.5" />,
};

const CHANNEL_TONE: Record<Channel, string> = {
  inapp: 'cyan',
  email: 'indigo',
  push: 'amber',
  sms: 'emerald',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

/* ── Announcements list ─────────────────────────────── */

function AnnouncementsList({
  items,
  onPublish,
  onArchive,
}: {
  items: AnnouncementSummary[];
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className={s.empty}>
        <Inbox className="h-10 w-10" />
        <p>هنوز اعلانی ساخته نشده است. از تب «اعلان جدید» اولین پیام را بسازید.</p>
      </div>
    );
  }
  return (
    <ul className={s.list}>
      {items.map((a) => (
        <li key={a.id} className={s.listItem}>
          <div className={s.listMain}>
            <div className={s.listHeader}>
              <h3 className={s.listTitle}>{a.title}</h3>
              <span className={s.status} data-status={a.status}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
            <p className={s.listBody}>{a.body}</p>
            <div className={s.listMeta}>
              <span className={s.metaItem}>
                <Users className="h-3 w-3" />
                {a.audience === 'all' ? 'همه' : a.audience === 'role' ? 'نقش خاص' : 'سگمنت'}
                {a.audienceFilter ? ` (${a.audienceFilter})` : ''}
              </span>
              <span className={s.metaItem}>
                <Clock className="h-3 w-3" />
                {a.publishedAt
                  ? `منتشر: ${formatDate(a.publishedAt)}`
                  : a.scheduledAt
                    ? `زمان‌بندی: ${formatDate(a.scheduledAt)}`
                    : `ساخته: ${formatDate(a.createdAt)}`}
              </span>
            </div>
            <div className={s.listChannels}>
              {a.channels.map((c) => (
                <span key={c} className={s.channelChip} data-tone={CHANNEL_TONE[c]}>
                  {CHANNEL_ICON[c]}
                  {CHANNEL_LABEL[c]}
                </span>
              ))}
            </div>
          </div>
          <div className={s.listActions}>
            {a.status === 'draft' || a.status === 'scheduled' ? (
              <button
                type="button"
                onClick={() => onPublish(a.id)}
                className={s.actionPrimary}
              >
                <Send className="h-3.5 w-3.5" />
                انتشار
              </button>
            ) : null}
            {a.status === 'published' ? (
              <button
                type="button"
                onClick={() => onArchive(a.id)}
                className={s.actionGhost}
              >
                <Trash2 className="h-3.5 w-3.5" />
                بایگانی
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── Campaigns list ─────────────────────────────────── */

function CampaignsList({ items }: { items: CampaignSummary[] }) {
  if (items.length === 0) {
    return (
      <div className={s.empty}>
        <Send className="h-10 w-10" />
        <p>هنوز کمپینی ساخته نشده است. کمپین‌ها از lib/email یا lib/sms ارسال می‌شوند.</p>
      </div>
    );
  }
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>نام</th>
          <th>کانال</th>
          <th>وضعیت</th>
          <th>ارسال</th>
          <th>باز شد</th>
          <th>کلیک</th>
          <th>زمان‌بندی</th>
        </tr>
      </thead>
      <tbody>
        {items.map((c) => (
          <tr key={c.id}>
            <td>
              <div className={s.campaignName}>{c.name}</div>
              <div className={s.campaignDesc}>{c.description ?? c.subject}</div>
            </td>
            <td>
              <span className={s.channelChip} data-tone={CHANNEL_TONE[c.channel]}>
                {CHANNEL_ICON[c.channel]}
                {CHANNEL_LABEL[c.channel]}
              </span>
            </td>
            <td>
              <span className={s.status} data-status={c.status}>
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
            </td>
            <td className={s.numericCell}>{formatNumber(c.stats.sent)}</td>
            <td className={s.numericCell}>
              {formatNumber(c.stats.opened)}
              {c.stats.sent > 0 ? (
                <span className={s.percent}>
                  {Math.round((c.stats.opened / c.stats.sent) * 100)}٪
                </span>
              ) : null}
            </td>
            <td className={s.numericCell}>{formatNumber(c.stats.clicked)}</td>
            <td className={s.timeCell}>
              {c.scheduledAt
                ? formatDate(c.scheduledAt)
                : c.startedAt
                  ? `شروع: ${formatDate(c.startedAt)}`
                  : c.completedAt
                    ? `پایان: ${formatDate(c.completedAt)}`
                    : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Compose form ───────────────────────────────────── */

function ComposeForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<Channel[]>(['inapp']);
  const [audience, setAudience] = useState<'all' | 'role' | 'segment'>('all');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const toggleChannel = (c: Channel) => {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage({ tone: 'error', text: 'عنوان و متن الزامی است' });
      return
    }
    setSubmitting(true)
    setMessage(null)
    const res = await createAnnouncement({
      title,
      body,
      channels,
      audience,
      audienceFilter: audienceFilter.trim() || null,
      status: 'draft',
    })
    setSubmitting(false)
    if (res.success) {
      setTitle('')
      setBody('')
      setAudienceFilter('')
      setChannels(['inapp'])
      setMessage({ tone: 'success', text: 'اعلان با موفقیت ساخته شد' })
      onCreated()
    } else {
      setMessage({ tone: 'error', text: res.message ?? 'خطای ناشناخته' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      <div className={s.formGroup}>
        <label className={s.label}>عنوان اعلان</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className={s.input}
          placeholder="مثلاً: به‌روزرسانی نرخ‌های ارز"
          dir="rtl"
        />
        <span className={s.hint}>{title.length} / ۲۰۰</span>
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>متن اعلان</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={5000}
          rows={6}
          className={s.textarea}
          placeholder="پیام خود را بنویسید..."
          dir="rtl"
        />
        <span className={s.hint}>{body.length} / ۵۰۰۰</span>
      </div>

      <div className={s.formGroup}>
        <label className={s.label}>کانال‌های ارسال</label>
        <div className={s.channelPicker}>
          {(['inapp', 'email', 'push', 'sms'] as Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleChannel(c)}
              className={s.channelOption}
              data-active={channels.includes(c)}
              data-tone={CHANNEL_TONE[c]}
            >
              {CHANNEL_ICON[c]}
              {CHANNEL_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className={s.formRow}>
        <div className={s.formGroup}>
          <label className={s.label}>مخاطب</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as 'all' | 'role' | 'segment')}
            className={s.select}
            dir="rtl"
          >
            <option value="all">همه کاربران</option>
            <option value="role">بر اساس نقش</option>
            <option value="segment">سگمنت خاص</option>
          </select>
        </div>
        {audience !== 'all' ? (
          <div className={s.formGroup}>
            <label className={s.label}>فیلتر مخاطب</label>
            <input
              type="text"
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className={s.input}
              placeholder={
                audience === 'role'
                  ? 'مثلاً: ADMIN,OWNER (با کاما جدا کنید)'
                  : 'شناسه سگمنت'
              }
              dir="rtl"
            />
          </div>
        ) : null}
      </div>

      {message ? (
        <div className={s.formMessage} data-tone={message.tone}>
          {message.tone === 'success' ? <Check className="h-4 w-4" /> : null}
          {message.text}
        </div>
      ) : null}

      <div className={s.formActions}>
        <button type="submit" disabled={submitting} className={s.submitBtn}>
          {submitting ? <Loader2 className={`h-4 w-4 ${s.spin}`} /> : <Sparkles className="h-4 w-4" />}
          {submitting ? 'در حال ساخت...' : 'ساخت پیش‌نویس'}
        </button>
      </div>
    </form>
  )
}

/* ── Main hub ────────────────────────────────────────── */

export function CommunicationHub({ initialData }: Props) {
  const [data, setData] = useState<CommunicationSnapshot | undefined>(initialData)
  const [tab, setTab] = useState<Tab>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [lastFetch, setLastFetch] = useState<string>(initialData?.generatedAt ?? new Date().toISOString())

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/communication/snapshot', { cache: 'no-store' })
      const json = (await res.json()) as { success: boolean; data?: CommunicationSnapshot }
      if (json.success && json.data) {
        setData(json.data)
        setLastFetch(json.data.generatedAt)
      }
    } catch {
      /* silent */
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      void fetchData()
    }, 60_000)
    return () => clearInterval(id)
  }, [fetchData])

  const summary = useMemo(() => data?.metrics, [data])

  const handlePublish = async (id: string) => {
    await publishAnnouncement(id)
    void fetchData()
  }

  const handleArchive = async (id: string) => {
    await archiveAnnouncement(id)
    void fetchData()
  }

  if (!data) {
    return (
      <div className={s.empty}>
        <Radio className="h-10 w-10" />
        <p>داده‌ای موجود نیست.</p>
      </div>
    )
  }

  return (
    <div className={s.root}>
      <Spotlight tone="violet" />

      {/* Summary strip */}
      <section className={s.summary}>
        <div className={s.summaryCard} data-tone="emerald">
          <div className={s.summaryLabel}>اعلان‌های منتشر شده</div>
          <div className={s.summaryValue}>{formatNumber(summary?.publishedAnnouncements ?? 0)}</div>
          <Check className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="amber">
          <div className={s.summaryLabel}>زمان‌بندی شده</div>
          <div className={s.summaryValue}>{formatNumber(summary?.scheduledAnnouncements ?? 0)}</div>
          <Clock className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="indigo">
          <div className={s.summaryLabel}>کمپین فعال</div>
          <div className={s.summaryValue}>{formatNumber(summary?.activeCampaigns ?? 0)}</div>
          <Send className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="cyan">
          <div className={s.summaryLabel}>گیرندگان</div>
          <div className={s.summaryValue}>{formatNumber(summary?.totalRecipients ?? 0)}</div>
          <Users className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="emerald">
          <div className={s.summaryLabel}>نرخ باز شدن</div>
          <div className={s.summaryValue}>
            {formatNumber(Math.round((summary?.openRate ?? 0) * 10) / 10)}٪
          </div>
          <Mail className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="violet">
          <div className={s.summaryLabel}>نرخ کلیک</div>
          <div className={s.summaryValue}>
            {formatNumber(Math.round((summary?.clickRate ?? 0) * 10) / 10)}٪
          </div>
          <MessageSquare className={s.summaryIcon} />
        </div>
      </section>

      {/* Tabs */}
      <div className={s.tabBar}>
        <div className={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={s.tab}
              data-active={tab === t.id}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className={s.tabBarMeta}>
          <span className={s.lastFetch}>
            آخرین به‌روزرسانی: {formatDate(lastFetch)}
          </span>
        </div>
      </div>

      {/* Content */}
      {tab === 'overview' ? (
        <div className={s.overviewGrid}>
          <section className={s.overviewCard}>
            <header className={s.cardHeader}>
              <h2>
                <Bell className="h-4 w-4" /> جدیدترین اعلان‌ها
              </h2>
            </header>
            <AnnouncementsList
              items={data.announcements.slice(0, 5)}
              onPublish={handlePublish}
              onArchive={handleArchive}
            />
          </section>
          <section className={s.overviewCard}>
            <header className={s.cardHeader}>
              <h2>
                <Send className="h-4 w-4" /> کمپین‌های اخیر
              </h2>
            </header>
            <CampaignsList items={data.campaigns.slice(0, 5)} />
          </section>
        </div>
      ) : null}

      {tab === 'announcements' ? (
        <section className={s.fullCard}>
          <header className={s.cardHeader}>
            <h2>
              <Bell className="h-4 w-4" /> همه اعلان‌ها
            </h2>
            <p>{formatNumber(data.announcements.length)} اعلان</p>
          </header>
          <AnnouncementsList
            items={data.announcements}
            onPublish={handlePublish}
            onArchive={handleArchive}
          />
        </section>
      ) : null}

      {tab === 'campaigns' ? (
        <section className={s.fullCard}>
          <header className={s.cardHeader}>
            <h2>
              <Send className="h-4 w-4" /> همه کمپین‌ها
            </h2>
            <p>{formatNumber(data.campaigns.length)} کمپین</p>
          </header>
          <CampaignsList items={data.campaigns} />
        </section>
      ) : null}

      {tab === 'compose' ? (
        <section className={s.fullCard}>
          <header className={s.cardHeader}>
            <h2>
              <Edit3 className="h-4 w-4" /> ساخت اعلان جدید
            </h2>
            <p>پس از ساخت، می‌توانید در تب اعلان‌ها آن را منتشر کنید.</p>
          </header>
          <ComposeForm onCreated={() => void fetchData()} />
        </section>
      ) : null}
    </div>
  )
}
