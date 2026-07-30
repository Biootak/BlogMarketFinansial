'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock,
  Eye,
  Inbox,
  Loader2,
  Lock,
  Plus,
  Search,
  Send,
  Tag,
  Ticket,
  X,
} from 'lucide-react';

import { Spotlight } from '@/components/Dashboard/primitives/Spotlight';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HUB_PALETTES, PriorityStack, type PriorityItem } from '@/components/Dashboard/PlatformHub';
import type {
  TicketSnapshot,
  TicketSummary,
  TicketPriority,
  TicketStatus,
  TicketCategory,
  TicketMessageSummary,
} from '@/lib/tickets';
import {
  createTicket,
  replyToTicket,
  updateTicketStatus,
  assignTicket,
} from '@/actions/tickets-actions';
import s from './HelpdeskHub.module.css';

interface Props {
  initialData?: TicketSnapshot;
}

type Filter = 'all' | TicketStatus;

const FILTERS: { id: Filter; label: string; tone?: string }[] = [
  { id: 'all', label: 'همه' },
  { id: 'open', label: 'باز', tone: 'cyan' },
  { id: 'pending', label: 'منتظر پاسخ', tone: 'amber' },
  { id: 'in_progress', label: 'در حال بررسی', tone: 'indigo' },
  { id: 'resolved', label: 'حل شده', tone: 'emerald' },
  { id: 'closed', label: 'بسته' },
];

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'باز',
  pending: 'منتظر پاسخ',
  in_progress: 'در حال بررسی',
  resolved: 'حل شده',
  closed: 'بسته',
};

const STATUS_TONE: Record<TicketStatus, string> = {
  open: 'cyan',
  pending: 'amber',
  in_progress: 'indigo',
  resolved: 'emerald',
  closed: 'neutral',
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'کم',
  normal: 'معمولی',
  high: 'بالا',
  urgent: 'فوری',
};

const PRIORITY_TONE: Record<TicketPriority, string> = {
  low: 'neutral',
  normal: 'cyan',
  high: 'amber',
  urgent: 'rose',
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  general: 'عمومی',
  billing: 'مالی',
  technical: 'فنی',
  kyc: 'احراز هویت',
  account: 'حساب کاربری',
  transfer: 'انتقال وجه',
  rate: 'نرخ ارز',
  other: 'سایر',
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

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)} ثانیه پیش`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ساعت پیش`;
  return `${Math.floor(diff / 86_400_000)} روز پیش`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function StatusPill({ status }: { status: TicketStatus }) {
  return (
    <span className={s.statusPill} data-tone={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={s.priorityBadge} data-tone={PRIORITY_TONE[priority]}>
      {priority === 'urgent' ? <AlertCircle className="h-3 w-3" /> : null}
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function TicketDetail({
  ticket,
  onClose,
  onStatusChange,
}: {
  ticket: TicketSummary;
  onClose: () => void;
  onStatusChange: (s: TicketStatus) => void;
}) {
  const [messages, setMessages] = useState<TicketMessageSummary[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/tickets/snapshot?ticketId=${ticket.id}`, { cache: 'no-store' });
      const json = (await res.json()) as { success: boolean; data?: TicketMessageSummary[] };
      if (json.success && json.data) setMessages(json.data);
    } catch {
      /* silent */
    } finally {
      setLoadingMsgs(false);
    }
  }, [ticket.id]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const res = await replyToTicket(ticket.id, reply, isInternal);
    setSending(false);
    if (res.success) {
      setReply('');
      void loadMessages();
    }
  };

  return (
    <div className={s.detail}>
      <header className={s.detailHeader}>
        <div className={s.detailMeta}>
          <h2 className={s.detailTitle}>{ticket.subject}</h2>
          <div className={s.detailBadges}>
            <StatusPill status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className={s.categoryChip}>
              <Tag className="h-3 w-3" />
              {CATEGORY_LABEL[ticket.category]}
            </span>
          </div>
          <div className={s.detailInfo}>
            <span>ایجاد: {formatDate(ticket.createdAt)}</span>
            <span>{ticket.messageCount} پیام</span>
            {ticket.firstResponseAt ? (
              <span>اولین پاسخ: {formatDate(ticket.firstResponseAt)}</span>
            ) : null}
          </div>
        </div>
        <button type="button" onClick={onClose} className={s.closeBtn} aria-label="بستن">
          <X className="h-4 w-4" />
        </button>
      </header>

      <p className={s.detailDescription}>{ticket.description}</p>

      <div className={s.statusActions}>
        {(['open', 'pending', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(
          (st) => (
            <button
              key={st}
              type="button"
              onClick={() => onStatusChange(st)}
              className={s.statusBtn}
              data-active={ticket.status === st}
            >
              {STATUS_LABEL[st]}
            </button>
          ),
        )}
      </div>

      <section className={s.threadSection}>
        <h3 className={s.threadTitle}>
          <Inbox className="h-4 w-4" /> گفتگو
        </h3>
        {loadingMsgs ? (
          <div className={s.loadingMini}>
            <Loader2 className={`h-4 w-4 ${s.spin}`} /> در حال بارگذاری...
          </div>
        ) : messages.length === 0 ? (
          <div className={s.loadingMini}>هنوز پیامی نیست. اولین پاسخ را بنویسید.</div>
        ) : (
          <ol className={s.thread}>
            {messages.map((m) => (
              <li
                key={m.id}
                className={s.message}
                data-internal={m.isInternal}
              >
                <div className={s.messageMeta}>
                  <span className={s.messageAuthor}>
                    {m.authorRole ?? 'user'} • {formatTimeAgo(m.createdAt)}
                  </span>
                  {m.isInternal ? (
                    <span className={s.internalBadge}>
                      <Lock className="h-3 w-3" /> یادداشت داخلی
                    </span>
                  ) : null}
                </div>
                <p className={s.messageBody}>{m.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className={s.replySection}>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="پاسخ خود را بنویسید..."
          rows={4}
          className={s.replyInput}
          maxLength={5000}
          dir="rtl"
        />
        <div className={s.replyActions}>
          <label className={s.internalLabel}>
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
            />
            یادداشت داخلی (فقط تیم)
          </label>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !reply.trim()}
            className={s.sendBtn}
          >
            {sending ? <Loader2 className={`h-4 w-4 ${s.spin}`} /> : <Send className="h-4 w-4" />}
            ارسال پاسخ
          </button>
        </div>
      </section>
    </div>
  );
}

function NewTicketForm({ onCreated }: { onCreated: () => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [category, setCategory] = useState<TicketCategory>('general');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setMessage({ tone: 'error', text: 'موضوع و شرح الزامی است' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const res = await createTicket({ subject, description, priority, category });
    setSubmitting(false);
    if (res.success) {
      setSubject('');
      setDescription('');
      setMessage({ tone: 'success', text: 'تیکت ساخته شد' });
      onCreated();
    } else {
      setMessage({ tone: 'error', text: res.message ?? 'خطا' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={s.form}>
      <div className={s.formGroup}>
        <label className={s.label}>موضوع</label>
        <Input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className={s.input}
          dir="rtl"
        />
      </div>
      <div className={s.formRow}>
        <div className={s.formGroup}>
          <label className={s.label}>اولویت</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger className={s.select} dir="rtl">
              <SelectValue placeholder="انتخاب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">کم</SelectItem>
              <SelectItem value="normal">معمولی</SelectItem>
              <SelectItem value="high">بالا</SelectItem>
              <SelectItem value="urgent">فوری</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className={s.formGroup}>
          <label className={s.label}>دسته</label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger className={s.select} dir="rtl">
              <SelectValue placeholder="انتخاب" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className={s.formGroup}>
        <label className={s.label}>شرح</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          maxLength={10000}
          className={s.textarea}
          dir="rtl"
        />
      </div>
      {message ? (
        <div className={s.formMessage} data-tone={message.tone}>
          {message.text}
        </div>
      ) : null}
      <div className={s.formActions}>
        <button type="submit" disabled={submitting} className={s.submitBtn}>
          {submitting ? <Loader2 className={`h-4 w-4 ${s.spin}`} /> : <Plus className="h-4 w-4" />}
          ساخت تیکت
        </button>
      </div>
    </form>
  );
}

export function HelpdeskHub({ initialData }: Props) {
  const [data, setData] = useState<TicketSnapshot | undefined>(initialData);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TicketSummary | null>(null);
  const [view, setView] = useState<'list' | 'new'>('list');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/tickets/snapshot', { cache: 'no-store' });
      const json = (await res.json()) as { success: boolean; data?: TicketSnapshot };
      if (json.success && json.data) {
        setData(json.data);
        // اگر تیکت انتخاب‌شده در لیست جدید نیست، آن را به‌روز کن
        if (selected) {
          const updated = json.data.tickets.find((t) => t.id === selected.id);
          if (updated) setSelected(updated);
        }
      }
    } catch {
      /* silent */
    }
  }, [selected]);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchData();
    }, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.tickets.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.subject.toLowerCase().includes(q) &&
          !t.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [data, filter, search]);

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selected) return;
    await updateTicketStatus(selected.id, status);
    void fetchData();
  };

  if (!data) {
    return (
      <div className={s.empty}>
        <Ticket className="h-10 w-10" />
        <p>داده‌ای موجود نیست.</p>
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className={s.root}>
      <Spotlight tone="indigo" />

      {/* Summary */}
      <section className={s.summary}>
        <div className={s.summaryCard} data-tone="cyan">
          <div className={s.summaryLabel}>تیکت‌های باز</div>
          <div className={s.summaryValue}>{formatNumber(m.open)}</div>
          <Inbox className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="amber">
          <div className={s.summaryLabel}>منتظر پاسخ</div>
          <div className={s.summaryValue}>{formatNumber(m.pending)}</div>
          <Clock className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="indigo">
          <div className={s.summaryLabel}>در حال بررسی</div>
          <div className={s.summaryValue}>{formatNumber(m.inProgress)}</div>
          <Eye className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="rose">
          <div className={s.summaryLabel}>فوری / ارجاع نشده</div>
          <div className={s.summaryValue}>
            {formatNumber(m.urgent)} / {formatNumber(m.unassigned)}
          </div>
          <AlertCircle className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="emerald">
          <div className={s.summaryLabel}>حل شده</div>
          <div className={s.summaryValue}>{formatNumber(m.resolved)}</div>
          <Check className={s.summaryIcon} />
        </div>
        <div className={s.summaryCard} data-tone="cyan">
          <div className={s.summaryLabel}>میانگین پاسخ</div>
          <div className={s.summaryValue}>
            {m.avgFirstResponseMin > 0 ? `${formatNumber(Math.round(m.avgFirstResponseMin))} دقیقه` : '—'}
          </div>
          <Clock className={s.summaryIcon} />
        </div>
      </section>

      {/* View toggle */}
      <div className={s.tabBar}>
        <div className={s.tabs}>
          <button
            type="button"
            onClick={() => setView('list')}
            className={s.tab}
            data-active={view === 'list'}
          >
            <Inbox className="h-4 w-4" /> فهرست
          </button>
          <button
            type="button"
            onClick={() => {
              setView('new');
              setSelected(null);
            }}
            className={s.tab}
            data-active={view === 'new'}
          >
            <Plus className="h-4 w-4" /> تیکت جدید
          </button>
        </div>
        {view === 'list' ? (
          <div className={s.searchBox}>
            <Search className="h-4 w-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در تیکت‌ها..."
              className={s.searchInput}
              dir="rtl"
            />
          </div>
        ) : null}
      </div>

      {view === 'new' ? (
        <section className={s.card}>
          <header className={s.cardHeader}>
            <h2>
              <Plus className="h-4 w-4" /> تیکت جدید
            </h2>
            <p>یک تیکت پشتیبانی بسازید. تیم به زودی پاسخ می‌دهد.</p>
          </header>
          <NewTicketForm
            onCreated={() => {
              setView('list');
              void fetchData();
            }}
          />
        </section>
      ) : (
        <div className={s.dualGrid}>
          {/* List */}
          <section className={s.card}>
            <header className={s.cardHeader}>
              <h2>
                <Inbox className="h-4 w-4" /> تیکت‌ها
              </h2>
              <p>{formatNumber(filtered.length)} مورد</p>
            </header>
            <div className={s.filters}>
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={s.filterBtn}
                  data-active={filter === f.id}
                  data-tone={f.tone}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div className={s.emptyMini}>
                <Inbox className="h-8 w-8" />
                <p>تیکتی با این فیلتر نیست.</p>
              </div>
            ) : (
              <ul className={s.ticketList}>
                {filtered.map((t) => (
                  <li
                    key={t.id}
                    className={s.ticketItem}
                    data-active={selected?.id === t.id}
                    onClick={() => setSelected(t)}
                  >
                    <div className={s.ticketHead}>
                      <span className={s.ticketSubject}>{t.subject}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <p className={s.ticketPreview}>{t.description}</p>
                    <div className={s.ticketMeta}>
                      <StatusPill status={t.status} />
                      <span>{CATEGORY_LABEL[t.category]}</span>
                      <span>{formatTimeAgo(t.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Detail */}
          <section className={s.card}>
            {selected ? (
              <TicketDetail
                ticket={selected}
                onClose={() => setSelected(null)}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <div className={s.placeholder}>
                <Ticket className="h-10 w-10" />
                <p>یک تیکت را از فهرست انتخاب کنید، یا از تب «تیکت جدید» یکی بسازید.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
