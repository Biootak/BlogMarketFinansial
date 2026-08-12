'use client';

/**
 * CommentsClient — مدیریت نظرات (redesigned 2026)
 *
 * New architecture: PageHero → KPI strip → InsightLayout with a framed
 * DataPanel (tabs + search + table) and a moderation rail (status donut,
 * top commenters, quick-approve pending queue). All moderation logic is
 * unchanged; the rail adds quick actions without extra API calls.
 */

import {
  type CommentRow,
  bulkApproveComments,
  bulkDeleteComments,
  bulkRejectComments,
  deleteComment,
  getComments,
  setCommentApproval,
} from '@/actions/comments-actions';
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
import { useToast } from '@/components/ui/use-toast';
import {
  CheckCheck,
  FileText,
  Inbox,
  MessageSquare,
  MessagesSquare,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import s from './CommentsClient.module.css';

const fa = new Intl.NumberFormat('fa-IR');
const PAGE_SIZE = 40;
type Tab = 'all' | 'pending' | 'approved';

interface Props {
  initial: { rows: CommentRow[]; total: number; pending: number; approved: number } | null;
}

export default function CommentsClient({ initial }: Props) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  // آیتم‌های اولیه بر اساس تب پیش‌فرض («در انتظار») فیلتر می‌شوند تا اولین paint با تب هماهنگ باشد.
  const [items, setItems] = useState<CommentRow[]>(() =>
    (initial?.rows ?? []).filter((r) => !r.approved),
  );
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [pendingCount, setPendingCount] = useState(initial?.pending ?? 0);
  const [approvedCount, setApprovedCount] = useState(initial?.approved ?? 0);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(
    (initial?.rows ?? []).filter((r) => !r.approved).length >= PAGE_SIZE,
  );
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommentRow | null>(null);
  const [bulkDeleteCount, setBulkDeleteCount] = useState(0);

  // تعداد کل تب جاری (سرور-محور) — badge و footer همیشه با محتوای تب هم‌خوان هستند.
  const tabTotal = useMemo(
    () => (tab === 'all' ? total : tab === 'pending' ? pendingCount : approvedCount),
    [tab, total, pendingCount, approvedCount],
  );

  const itemsLengthRef = useRef(items.length);
  itemsLengthRef.current = items.length;
  // با تعویض سریع تب چند درخواست هم‌زمان ممکن است — فقط پاسخ آخرین‌شان اعمال می‌شود.
  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    (append = false) => {
      setLoading(true);
      const offset = append ? itemsLengthRef.current : 0;
      const seq = ++requestSeq.current;
      startTransition(async () => {
        try {
          const result = await getComments({ limit: PAGE_SIZE, offset, status: tab });
          if (seq !== requestSeq.current) return; // پاسخ قدیمی — نادیده بگیر
          if (result.success && result.data) {
            const d = result.data;
            setItems((prev) => (append ? [...prev, ...d.rows] : d.rows));
            setTotal(d.total);
            setPendingCount(d.pending);
            setApprovedCount(d.approved);
            setHasMore(d.rows.length >= PAGE_SIZE);
          }
        } catch {
          // خطای شبکه/سرور — حالت لودینگ را قفل نکن
        } finally {
          if (seq === requestSeq.current) setLoading(false);
        }
      });
    },
    [tab],
  );

  // با هر تغییر تب (و اولین mount) دادهٔ سرور-محورِ همان تب واکشی می‌شود.
  useEffect(() => {
    fetchPage(false);
  }, [fetchPage]);

  const switchTab = useCallback((next: Tab) => {
    setTab(next);
    setSelectedKeys([]);
  }, []);

  const displayed = useMemo(() => {
    let filtered = items; // تب روی سرور فیلتر شده — اینجا فقط جستجو می‌ماند
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.content.toLowerCase().includes(q) ||
          i.authorName.toLowerCase().includes(q) ||
          i.authorEmail.toLowerCase().includes(q) ||
          i.postTitle.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [items, tab, search]);

  const handleApproval = useCallback(
    (id: string, approved: boolean) => {
      startTransition(async () => {
        // آیتمی که دیگر با تب جاری نمی‌خواند (مثلاً تأییدشده در تب «در انتظار») از لیست خارج می‌شود.
        setItems((prev) =>
          prev.flatMap((item) => {
            if (item.id !== id) return [item];
            if ((tab === 'pending' && approved) || (tab === 'approved' && !approved)) return [];
            return [{ ...item, approved }];
          }),
        );
        setPendingCount((p) => Math.max(0, p + (approved ? -1 : 1)));
        setApprovedCount((a) => Math.max(0, a + (approved ? 1 : -1)));
        const result = await setCommentApproval(id, approved);
        if (!result.success) fetchPage(false);
      });
    },
    [tab, fetchPage],
  );

  const handleBulkApprove = useCallback(() => {
    startTransition(async () => {
      const ids = selectedKeys;
      const affected = items.filter((i) => ids.includes(i.id) && !i.approved).length;
      setItems((prev) =>
        prev.flatMap((item) => {
          if (!ids.includes(item.id)) return [item];
          if (tab === 'pending') return []; // تأییدشده → از صف «در انتظار» خارج می‌شود
          return [{ ...item, approved: true }];
        }),
      );
      setPendingCount((p) => Math.max(0, p - affected));
      setApprovedCount((a) => a + affected);
      setSelectedKeys([]);
      const result = await bulkApproveComments(ids);
      if (result.success) toast({ title: 'نظرات تأیید شدند' });
      else fetchPage(false);
    });
  }, [selectedKeys, tab, items, fetchPage, toast]);

  const handleBulkReject = useCallback(() => {
    startTransition(async () => {
      const ids = selectedKeys;
      const affected = items.filter((i) => ids.includes(i.id) && i.approved).length;
      setItems((prev) =>
        prev.flatMap((item) => {
          if (!ids.includes(item.id)) return [item];
          if (tab === 'approved') return []; // ردشده → از تب «تأییدشده» خارج می‌شود
          return [{ ...item, approved: false }];
        }),
      );
      setApprovedCount((a) => Math.max(0, a - affected));
      setPendingCount((p) => p + affected);
      setSelectedKeys([]);
      const result = await bulkRejectComments(ids);
      if (result.success) toast({ title: 'نظرات رد شدند' });
      else fetchPage(false);
    });
  }, [selectedKeys, tab, items, fetchPage, toast]);

  const handleBulkDelete = useCallback(() => {
    setBulkDeleteCount(selectedKeys.length);
  }, [selectedKeys]);

  const confirmBulkDelete = useCallback(() => {
    startTransition(async () => {
      const ids = selectedKeys;
      const affectedApproved = items.filter((i) => ids.includes(i.id) && i.approved).length;
      const affectedPending = items.filter((i) => ids.includes(i.id) && !i.approved).length;
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      setTotal((t) => Math.max(0, t - ids.length));
      setApprovedCount((a) => Math.max(0, a - affectedApproved));
      setPendingCount((p) => Math.max(0, p - affectedPending));
      setSelectedKeys([]);
      setBulkDeleteCount(0);
      const result = await bulkDeleteComments(ids);
      if (result.success) toast({ title: 'نظرات حذف شدند' });
    });
  }, [selectedKeys, items, toast]);

  const confirmSingleDelete = useCallback(() => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const item = deleteTarget;
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotal((t) => Math.max(0, t - 1));
      if (item.approved) setApprovedCount((a) => Math.max(0, a - 1));
      else setPendingCount((p) => Math.max(0, p - 1));
      setDeleteTarget(null);
      const result = await deleteComment(item.id);
      if (result.success) toast({ title: 'نظر حذف شد' });
    });
  }, [deleteTarget, toast]);

  const loadMore = useCallback(() => fetchPage(true), [fetchPage]);

  /* ── Insights ── */

  const statusSplit = useMemo<SplitBarSegment[]>(
    () => [
      { label: 'تأییدشده', value: approvedCount, color: 'emerald' },
      { label: 'در انتظار', value: pendingCount, color: 'amber' },
    ],
    [approvedCount, pendingCount],
  );

  const topAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.authorName, (counts.get(item.authorName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        label: name,
        value: count,
        color: 'indigo' as const,
      }));
  }, [items]);

  const pendingPreview = useMemo(() => items.filter((i) => !i.approved).slice(0, 3), [items]);

  const exportData = useMemo(
    () =>
      displayed.map((row) => ({
        author: row.authorName,
        email: row.authorEmail,
        post: row.postTitle,
        content: row.content,
        status: row.approved ? 'تأییدشده' : 'در انتظار',
        time: row.time,
      })),
    [displayed],
  );

  const exportColumns = [
    { key: 'author', header: 'نویسنده' },
    { key: 'email', header: 'ایمیل' },
    { key: 'post', header: 'مقاله' },
    { key: 'content', header: 'متن' },
    { key: 'status', header: 'وضعیت' },
    { key: 'time', header: 'تاریخ' },
  ];

  const columns: Column<CommentRow>[] = useMemo(
    () => [
      {
        key: 'author',
        header: 'نویسنده',
        render: (item) => (
          <div className={s.userCell}>
            <div className={s.avatar}>{item.authorName.charAt(0)}</div>
            <div className={s.userInfo}>
              <span className={s.userName}>{item.authorName}</span>
              <span className={s.userEmail}>{item.authorEmail}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'post',
        header: 'مقاله',
        collapse: true,
        render: (item) => (
          <a href={`/dashboard/posts/edit/${item.postId}`} className={s.postLink}>
            {item.postTitle}
          </a>
        ),
      },
      {
        key: 'content',
        header: 'متن',
        render: (item) => (
          <div className={s.contentCell}>
            <span className={s.content}>{item.content}</span>
            {item.replyCount > 0 && (
              <span className={s.replyBadge}>{fa.format(item.replyCount)} پاسخ</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'وضعیت',
        render: (item) => (
          <span className={`${s.pill} ${item.approved ? s.pillOk : s.pillWarn}`}>
            {item.approved ? 'تأییدشده' : 'در انتظار'}
          </span>
        ),
      },
      {
        key: 'time',
        header: 'تاریخ',
        collapse: true,
        render: (item) => <span className={s.time}>{item.time}</span>,
      },
      {
        key: 'actions',
        header: '',
        render: (item) => (
          <div className={s.rowActions}>
            <button
              type="button"
              className={`${s.iconBtn} ${item.approved ? s.iconAmber : s.iconGreen}`}
              onClick={() => handleApproval(item.id, !item.approved)}
              title={item.approved ? 'لغو تأیید' : 'تأیید'}
            >
              {item.approved ? <X size={16} /> : <CheckCheck size={16} />}
            </button>
            <button
              type="button"
              className={`${s.iconBtn} ${s.iconDanger}`}
              onClick={() => setDeleteTarget(item)}
              title="حذف"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ),
      },
    ],
    [handleApproval],
  );

  return (
    <div className={s.root}>
      <PageHero
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'نظرات' }]}
        eyebrow="محتوا"
        title="مدیریت نظرات"
        description="بررسی، تأیید و مدیریت نظرات کاربران مقالات"
        actions={
          pendingCount > 0 ? (
            <button type="button" className={s.headerChip} onClick={() => setTab('pending')}>
              <Inbox size={13} />
              {fa.format(pendingCount)} در انتظار
            </button>
          ) : undefined
        }
      />

      <StatGrid cols={3}>
        <KpiCard label="کل نظرات" value={total} icon={MessageSquare} />
        <KpiCard label="در انتظار" value={pendingCount} icon={Inbox} />
        <KpiCard label="تأییدشده" value={approvedCount} icon={CheckCheck} />
      </StatGrid>

      {selectedKeys.length > 0 && (
        <div className={s.bulkBar}>
          <span className={s.bulkCount}>{fa.format(selectedKeys.length)} مورد انتخاب شده</span>
          <div className={s.bulkActions}>
            <Button size="sm" onClick={handleBulkApprove}>
              <CheckCheck size={14} />
              <span className={s.btnLabel}>تأیید</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={handleBulkReject}>
              <X size={14} />
              <span className={s.btnLabel}>رد</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
              <Trash2 size={14} />
              <span className={s.btnLabel}>حذف</span>
            </Button>
          </div>
        </div>
      )}

      <InsightLayout
        main={
          <DataPanel
            title="نظرات"
            icon={<MessagesSquare size={14} strokeWidth={1.75} />}
            count={fa.format(tabTotal)}
            footer={
              <div className={s.foot}>
                {hasMore && !loading ? (
                  <Button size="sm" variant="outline" onClick={loadMore} className={s.loadMore}>
                    بارگذاری بیشتر
                  </Button>
                ) : null}
                <span className={s.footCount}>
                  نمایش {fa.format(displayed.length)} از {fa.format(tabTotal)} نظر
                </span>
              </div>
            }
          >
            <TableToolbar
              filters={
                <div className={s.tabs}>
                  {(
                    [
                      { key: 'all', label: 'همه', count: total },
                      { key: 'pending', label: 'در انتظار', count: pendingCount },
                      { key: 'approved', label: 'تأییدشده', count: approvedCount },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      className={t.key === tab ? `${s.tab} ${s.tabActive}` : s.tab}
                      onClick={() => switchTab(t.key)}
                    >
                      {t.label}
                      <span className={s.tabBadge}>{fa.format(t.count)}</span>
                    </button>
                  ))}
                </div>
              }
              search={
                <SearchInput value={search} onChange={setSearch} placeholder="جستجو در نظرات..." />
              }
              actions={
                displayed.length > 0 ? (
                  <ExportButton
                    data={exportData}
                    columns={exportColumns}
                    filename="comments-export"
                    label="خروجی"
                  />
                ) : undefined
              }
            />

            <DataTable
              columns={columns}
              rows={displayed}
              rowKey={(row) => row.id}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              loading={loading}
              empty={
                <MillionDollarEmpty
                  variant="inbox"
                  eyebrow="مدیریت نظرات"
                  title={search ? 'نظری یافت نشد' : 'هنوز نظری نیست'}
                  description={
                    search
                      ? 'جستجوی خود را تغییر دهید'
                      : 'وقتی کاربران نظر بدهند، اینجا نمایش داده می‌شود'
                  }
                  tone="primary"
                />
              }
            />
          </DataPanel>
        }
        aside={
          <InsightPanel>
            <InsightCard title="وضعیت نظرات">
              {total > 0 ? (
                <SplitBar data={statusSplit} format={(v) => fa.format(v)} />
              ) : (
                <p className={s.insightEmpty}>هنوز نظری ثبت نشده است</p>
              )}
            </InsightCard>

            <InsightCard title="نویسندگان پرنظرات">
              {topAuthors.length > 0 ? (
                <BarList data={topAuthors} showShare />
              ) : (
                <p className={s.insightEmpty}>هنوز نظری ثبت نشده است</p>
              )}
            </InsightCard>

            <InsightCard title="صف تأیید سریع">
              {pendingPreview.length > 0 ? (
                <ul className={s.pendingList}>
                  {pendingPreview.map((item) => (
                    <li key={item.id} className={s.pendingRow}>
                      <div className={s.pendingMeta}>
                        <span className={s.pendingName}>{item.authorName}</span>
                        <span className={s.pendingText}>{item.content}</span>
                      </div>
                      <button
                        type="button"
                        className={`${s.iconBtn} ${s.iconGreen}`}
                        onClick={() => handleApproval(item.id, true)}
                        title="تأیید سریع"
                      >
                        <CheckCheck size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.insightEmpty}>صف انتظار خالی است — همه تأیید شده‌اند</p>
              )}
            </InsightCard>

            <InsightCard title="دسترسی سریع">
              <div className={s.quickLinks}>
                <Link href="/dashboard/posts" className={s.quickLink}>
                  <FileText size={14} />
                  مقالات
                </Link>
                <Link href="/dashboard/users" className={s.quickLink}>
                  <Users size={14} />
                  کاربران
                </Link>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف نظر"
        description="این نظر حذف می‌شود. این عمل قابل بازگشت نیست."
        confirmLabel="حذف شود"
        onConfirm={confirmSingleDelete}
        variant="danger"
      />

      <ConfirmDialog
        open={bulkDeleteCount > 0}
        onOpenChange={(open) => !open && setBulkDeleteCount(0)}
        title="حذف گروهی"
        description={`${fa.format(bulkDeleteCount)} نظر حذف می‌شود. این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف شود"
        onConfirm={confirmBulkDelete}
        variant="danger"
      />
    </div>
  );
}
