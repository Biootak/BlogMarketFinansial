'use client';

/**
 * FeedbackClient — صندوق پیام (redesigned 2026)
 *
 * New architecture: PageHero → KPI strip → InsightLayout with a framed
 * DataPanel (tabs + search + table) and a response rail (status donut,
 * response-priority bars, quick links). All inbox logic — reply composer,
 * status patching, bulk actions, detail dialog — is unchanged.
 */

import { type FeedbackRow, deleteFeedback, setFeedbackStatus } from '@/actions/feedback-actions';
import { FEEDBACK_STATUS_LABELS, type FeedbackStatus } from '@/actions/feedback-constants';
import {
  BarList,
  type Column,
  ConfirmDialog,
  DataPanel,
  DataTable,
  ExportButton,
  InsightCard,
  InsightLayout,
  InsightPanel,
  KpiCard,
  MillionDollarEmpty,
  PageHero,
  SearchInput,
  SplitBar,
  type SplitBarSegment,
  StatGrid,
  TableToolbar,
} from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Archive,
  CheckCheck,
  ExternalLink,
  Eye,
  Inbox,
  Mail,
  Send,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import s from './FeedbackClient.module.css';

const fa = new Intl.NumberFormat('fa-IR');

type Tab = FeedbackStatus | 'ALL';

interface Props {
  initial: {
    rows: FeedbackRow[];
    total: number;
    newCount: number;
    repliedCount: number;
  } | null;
}

function getPriority(row: FeedbackRow): 'high' | 'medium' | 'low' {
  if (row.status === 'NEW') return 'high';
  const hours = (Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60);
  if (hours > 48) return 'high';
  if (hours > 24) return 'medium';
  return 'low';
}

const STATUS_TONE: Record<string, string> = {
  NEW: 'statusNew',
  READ: 'statusRead',
  IN_PROGRESS: 'statusProgress',
  REPLIED: 'statusReplied',
  RESOLVED: 'statusResolved',
  ARCHIVED: 'statusArchived',
};

export default function FeedbackClient({ initial }: Props) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [items, setItems] = useState<FeedbackRow[]>(initial?.rows ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [tab, setTab] = useState<Tab>('ALL');
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [detail, setDetail] = useState<FeedbackRow | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deleteTargets, setDeleteTargets] = useState<FeedbackRow[]>([]);

  const counts = useMemo(() => {
    const newC = items.filter((i) => i.status === 'NEW').length;
    const readC = items.filter((i) => i.status === 'READ').length;
    const inProgressC = items.filter((i) => i.status === 'IN_PROGRESS').length;
    const repliedC = items.filter((i) => i.status === 'REPLIED').length;
    const resolvedC = items.filter((i) => i.status === 'RESOLVED').length;
    const archivedC = items.filter((i) => i.status === 'ARCHIVED').length;
    return { newC, readC, inProgressC, repliedC, resolvedC, archivedC };
  }, [items]);

  const displayed = useMemo(() => {
    let filtered = items;
    if (tab !== 'ALL') filtered = items.filter((i) => i.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.subject?.toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [items, tab, search]);

  /* ── Insights ── */

  const statusSplit = useMemo<SplitBarSegment[]>(
    () => [
      { label: 'جدید', value: counts.newC, color: 'amber' },
      { label: 'خوانده‌شده', value: counts.readC, color: 'slate' },
      { label: 'پاسخ داده', value: counts.repliedC, color: 'emerald' },
      { label: 'بایگانی', value: counts.archivedC, color: 'slate' },
    ],
    [counts],
  );

  const priorityBars = useMemo(() => {
    const open = items.filter((i) => i.status !== 'ARCHIVED');
    const high = open.filter((i) => getPriority(i) === 'high').length;
    const medium = open.filter((i) => getPriority(i) === 'medium').length;
    const low = open.filter((i) => getPriority(i) === 'low').length;
    return [
      { label: 'نیازمند توجه فوری', value: high, color: 'rose' as const },
      { label: 'در ۲۴ تا ۴۸ ساعت', value: medium, color: 'amber' as const },
      { label: 'تازه (زیر ۲۴ ساعت)', value: low, color: 'emerald' as const },
    ];
  }, [items]);

  const patchStatus = useCallback(
    (ids: string[], status: FeedbackStatus) => {
      startTransition(async () => {
        // وضعیت قبلی ردیف‌ها برای بازگشت در صورت شکست
        const prev = items.filter((i) => ids.includes(i.id)).map((i) => [i.id, i.status] as const);
        setItems((prevItems) =>
          prevItems.map((item) => (ids.includes(item.id) ? { ...item, status } : item)),
        );
        // پیل داخل دیالوگ جزئیات هم همگام بماند
        setDetail((d) => (d && ids.includes(d.id) ? { ...d, status } : d));
        const result = await setFeedbackStatus(ids, status);
        if (result.success) {
          toast({ title: result.message ?? 'وضعیت تغییر کرد' });
        } else {
          toast({ title: result.message ?? 'خطا', variant: 'destructive' });
          setItems((prevItems) =>
            prevItems.map((item) => {
              const prevStatus = prev.find(([id]) => id === item.id)?.[1];
              return prevStatus ? { ...item, status: prevStatus } : item;
            }),
          );
        }
      });
    },
    [items, toast],
  );

  const handleBulkStatus = useCallback(
    (status: FeedbackStatus) => {
      const keys = selectedKeys;
      setSelectedKeys([]);
      patchStatus(keys, status);
    },
    [selectedKeys, patchStatus],
  );

  const handleDetailAction = useCallback(
    (status: FeedbackStatus) => {
      if (!detail) return;
      patchStatus([detail.id], status);
      if (status === 'ARCHIVED') setDetail(null);
    },
    [detail, patchStatus],
  );

  const handleReply = useCallback(() => {
    if (!detail || !replyText.trim()) return;
    startTransition(async () => {
      const result = await setFeedbackStatus([detail.id], 'REPLIED');
      if (result.success) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === detail.id ? { ...item, status: 'REPLIED' as const } : item,
          ),
        );
        toast({ title: 'وضعیت به «پاسخ داده شده» تغییر کرد — پاسخ را خارج از سیستم ارسال کنید' });
        setReplyText('');
        setDetail(null);
      }
    });
  }, [detail, replyText, toast]);

  const confirmDelete = useCallback(() => {
    startTransition(async () => {
      const ids = deleteTargets.map((t) => t.id);
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      setTotal((t) => Math.max(0, t - ids.length));
      setDeleteTargets([]);
      const result = await deleteFeedback(ids);
      if (result.success) toast({ title: 'پیام‌ها حذف شدند' });
      else toast({ title: result.message ?? 'خطا', variant: 'destructive' });
    });
  }, [deleteTargets, toast]);

  const exportData = useMemo(
    () =>
      displayed.map((row) => ({
        name: row.name,
        email: row.email,
        subject: row.subject ?? 'بدون موضوع',
        message: row.message,
        status: FEEDBACK_STATUS_LABELS[row.status],
        time: row.time,
      })),
    [displayed],
  );

  const exportColumns = [
    { key: 'name', header: 'نام' },
    { key: 'email', header: 'ایمیل' },
    { key: 'subject', header: 'موضوع' },
    { key: 'message', header: 'پیام' },
    { key: 'status', header: 'وضعیت' },
    { key: 'time', header: 'تاریخ' },
  ];

  const columns: Column<FeedbackRow>[] = useMemo(
    () => [
      {
        key: 'sender',
        header: 'فرستنده',
        render: (f) => (
          <div className={s.senderCell}>
            <div className={s.avatar}>{f.name.charAt(0)}</div>
            <div className={s.senderMeta}>
              <span className={s.senderName}>{f.name}</span>
              <span className={s.senderEmail}>{f.email}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'subject',
        header: 'موضوع',
        render: (f) => (
          <div className={s.subjectWrap}>
            {getPriority(f) !== 'low' && (
              <span className={getPriority(f) === 'high' ? s.priorityHigh : s.priorityMedium} />
            )}
            <span className={f.status === 'NEW' ? `${s.subject} ${s.subjectStrong}` : s.subject}>
              {f.subject ?? '— بدون موضوع —'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        render: (f) => (
          <span className={`${s.pill} ${STATUS_TONE[f.status]}`}>
            {FEEDBACK_STATUS_LABELS[f.status]}
          </span>
        ),
      },
      {
        key: 'time',
        header: 'زمان',
        collapse: true,
        render: (f) => (
          <time className={s.time} dateTime={f.createdAt.toISOString()}>
            {f.time}
          </time>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (f) => (
          <div className={s.rowActions}>
            <button
              type="button"
              className={s.iconBtn}
              onClick={() => {
                setDetail(f);
                setReplyText('');
                if (f.status === 'NEW') patchStatus([f.id], 'READ');
              }}
              title="مشاهده پیام"
            >
              <Eye size={14} />
            </button>
            <button
              type="button"
              className={`${s.iconBtn} ${s.iconDanger}`}
              onClick={() => setDeleteTargets([f])}
              title="حذف"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ),
      },
    ],
    [patchStatus],
  );

  return (
    <div className={s.root}>
      <PageHero
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'بازخوردها' }]}
        eyebrow="ارتباط"
        title="صندوق پیام"
        description="دریافت و پاسخ به پیام‌های کاربران"
        actions={
          counts.newC > 0 ? (
            <button type="button" className={s.headerChip} onClick={() => setTab('NEW')}>
              <Inbox size={13} />
              {fa.format(counts.newC)} پیام جدید
            </button>
          ) : undefined
        }
      />

      <StatGrid>
        <KpiCard label="کل پیام‌ها" value={total} icon={Mail} />
        <KpiCard label="جدید" value={counts.newC} icon={Inbox} />
        <KpiCard label="خوانده‌شده" value={counts.readC} icon={Eye} />
        <KpiCard label="پاسخ داده" value={counts.repliedC} icon={CheckCheck} />
      </StatGrid>

      {selectedKeys.length > 0 && (
        <div className={s.bulkBar}>
          <span className={s.bulkCount}>{fa.format(selectedKeys.length)} مورد انتخاب شده</span>
          <div className={s.bulkActions}>
            <Button size="sm" onClick={() => handleBulkStatus('READ')}>
              <Eye size={14} />
              <span className={s.btnLabel}>خوانده‌شده</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatus('REPLIED')}>
              <CheckCheck size={14} />
              <span className={s.btnLabel}>پاسخ داده</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkStatus('ARCHIVED')}>
              <Archive size={14} />
              <span className={s.btnLabel}>بایگانی</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setDeleteTargets(displayed.filter((i) => selectedKeys.includes(i.id)))}
            >
              <Trash2 size={14} />
              <span className={s.btnLabel}>حذف</span>
            </Button>
          </div>
        </div>
      )}

      <InsightLayout
        main={
          <DataPanel
            title="پیام‌ها"
            icon={<Mail size={14} strokeWidth={1.75} />}
            count={fa.format(displayed.length)}
            footer={
              <div className={s.foot}>
                <span className={s.footCount}>
                  نمایش {fa.format(displayed.length)} از {fa.format(total)} پیام
                </span>
              </div>
            }
          >
            <TableToolbar
              filters={
                <div className={s.tabs}>
                  {(
                    [
                      { key: 'ALL', label: 'همه', count: total },
                      { key: 'NEW', label: 'جدید', count: counts.newC },
                      { key: 'READ', label: 'خوانده‌شده', count: counts.readC },
                      { key: 'IN_PROGRESS', label: 'در حال بررسی', count: counts.inProgressC },
                      { key: 'REPLIED', label: 'پاسخ داده', count: counts.repliedC },
                      { key: 'RESOLVED', label: 'حل‌شده', count: counts.resolvedC },
                      { key: 'ARCHIVED', label: 'بایگانی', count: counts.archivedC },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={t.key === tab ? `${s.tab} ${s.tabActive}` : s.tab}
                      onClick={() => setTab(t.key)}
                    >
                      {t.label}
                      <span className={s.tabBadge}>{fa.format(t.count)}</span>
                    </button>
                  ))}
                </div>
              }
              search={
                <SearchInput value={search} onChange={setSearch} placeholder="جستجو در پیام‌ها..." />
              }
              actions={
                displayed.length > 0 ? (
                  <ExportButton
                    data={exportData}
                    columns={exportColumns}
                    filename="feedback-export"
                    label="خروجی"
                  />
                ) : undefined
              }
              content={
                <DataTable
                  columns={columns}
                  rows={displayed}
                  rowKey={(row) => row.id}
                  selectable
                  selectedKeys={selectedKeys}
                  onSelectionChange={setSelectedKeys}
                  empty={
                    <MillionDollarEmpty
                      variant="inbox"
                      eyebrow="صندوق پیام"
                      title={search ? 'پیامی یافت نشد' : 'هنوز پیامی نیست'}
                      description={
                        search
                          ? 'جستجوی خود را تغییر دهید'
                          : 'وقتی کاربران پیام بفرستند، اینجا نمایش داده می‌شود'
                      }
                      tone="primary"
                    />
                  }
                />
              }
            />
          </DataPanel>
        }
        aside={
          <InsightPanel>
            <InsightCard title="وضعیت پیام‌ها">
              {total > 0 ? (
                <SplitBar data={statusSplit} format={(v) => fa.format(v)} />
              ) : (
                <p className={s.insightEmpty}>هنوز پیامی ثبت نشده است</p>
              )}
            </InsightCard>

            <InsightCard title="اولویت پاسخگویی">
              <BarList data={priorityBars} showShare />
            </InsightCard>

            <InsightCard title="دسترسی سریع">
              <div className={s.quickLinks}>
                <Link href="/dashboard/users" className={s.quickLink}>
                  <Users size={14} />
                  کاربران
                </Link>
                <Link href="/dashboard/settings" className={s.quickLink}>
                  <Settings size={14} />
                  تنظیمات
                </Link>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />

      {/* Detail Dialog */}
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            setReplyText('');
          }
        }}
      >
        <DialogContent className={s.dialogContent}>
          <DialogHeader>
            <DialogTitle className={s.dialogTitle}>
              {detail?.subject ?? 'بدون موضوع'}
              {detail && (
                <span className={`${s.pill} ${STATUS_TONE[detail.status]}`}>
                  {FEEDBACK_STATUS_LABELS[detail.status]}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <>
              <div className={s.senderBlock}>
                <div className={s.senderAvatar}>{detail.name.charAt(0)}</div>
                <div className={s.senderMeta}>
                  <span className={s.senderName}>{detail.name}</span>
                  <span className={s.senderEmail}>{detail.email}</span>
                  {detail.userId && (
                    <Link href={`/dashboard/users/edit/${detail.userId}`} className={s.userLink}>
                      <ExternalLink size={12} />
                      حساب کاربری
                    </Link>
                  )}
                </div>
                <div className={s.senderInfo}>
                  <span>IP: {detail.ipAddress ?? '—'}</span>
                  <span>{detail.time}</span>
                </div>
              </div>

              <div className={s.messageBox}>
                <p className={s.messageText}>{detail.message}</p>
              </div>

              {detail.status !== 'ARCHIVED' && (
                <div className={s.replyComposer}>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                    rows={4}
                  />
                  <div className={s.replyFooter}>
                    <Button size="sm" onClick={handleReply} disabled={!replyText.trim()}>
                      <span>ارسال پاسخ</span>
                      <Send size={14} style={{ transform: 'scaleX(-1)' }} />
                    </Button>
                  </div>
                </div>
              )}

              <div className={s.dialogActions}>
                {detail.status !== 'ARCHIVED' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDetailAction('REPLIED')}
                    >
                      <CheckCheck size={14} />
                      <span>پاسخ داده شده</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDetailAction('ARCHIVED')}
                    >
                      <Archive size={14} />
                      <span>بایگانی</span>
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setDeleteTargets([detail]);
                    setDetail(null);
                  }}
                >
                  <Trash2 size={14} />
                  <span>حذف</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => !open && setDeleteTargets([])}
        title="حذف پیام‌ها"
        description={`${fa.format(deleteTargets.length)} پیام حذف می‌شود. این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف شود"
        onConfirm={confirmDelete}
        variant="danger"
      />
    </div>
  );
}
