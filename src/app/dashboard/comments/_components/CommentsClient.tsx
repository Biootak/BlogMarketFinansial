'use client';

/**
 * CommentsClient — مدیریت نظرات (2026)
 *
 * تب‌ها: همه | در انتظار | تأییدشده | ردشده
 * سناریوها:
 *   pending  → تأیید: مستقیم
 *   pending  → رد: confirm dialog (ساده — فقط رد/انصراف)
 *   approved → لغو تأیید: مستقیم (بدون dialog)
 *   rejected → تأیید: مستقیم
 *   rejected → بازگشت به انتظار: مستقیم
 *   هر نظر  → حذف: confirm dialog با warning
 */

import {
  type CommentRow,
  approveComment,
  deleteComment,
  getComments,
  rejectComment,
  restoreComment,
  unapproveComment,
} from '@/actions/comments-actions';
import {
  BarList,
  ConfirmDialog,
  Donut,
  type DonutSegment,
  InsightCard,
  InsightLayout,
  InsightPanel,
  KpiCard,
  MillionDollarEmpty,
  PageHero,
  SearchInput,
  StatGrid,
} from '@/components/Dashboard/primitives';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowRight,
  Ban,
  CheckCheck,
  FileText,
  Inbox,
  MessageSquare,
  MessagesSquare,
  Plus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import s from './CommentsClient.module.css';
import { ModerationCard } from './ModerationCard';

const fa = new Intl.NumberFormat('fa-IR');
const PAGE_SIZE = 40;
type Tab = 'all' | 'pending' | 'approved' | 'rejected';

const TAB_CONFIG: Record<Tab, { label: string; icon: typeof Inbox }> = {
  all: { label: 'همه', icon: MessagesSquare },
  pending: { label: 'در انتظار', icon: Inbox },
  approved: { label: 'تأییدشده', icon: CheckCheck },
  rejected: { label: 'ردشده', icon: Ban },
};

interface Props {
  initial: {
    rows: CommentRow[];
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  } | null;
}

export default function CommentsClient({ initial }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // شروع با تب pending — items بر اساس تب اولیه
  // fallback: اگه status هنوز از server نیومده، بر اساس approved محاسبه میشه
  const [items, setItems] = useState<CommentRow[]>(() =>
    (initial?.rows ?? []).filter(
      (r) => (r.status ?? (r.approved ? 'approved' : 'pending')) === 'pending',
    ),
  );
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [pendingCount, setPendingCount] = useState(initial?.pending ?? 0);
  const [approvedCount, setApprovedCount] = useState(initial?.approved ?? 0);
  const [rejectedCount, setRejectedCount] = useState(initial?.rejected ?? 0);
  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(
    (initial?.rows ?? []).filter(
      (r) => (r.status ?? (r.approved ? 'approved' : 'pending')) === 'pending',
    ).length >= PAGE_SIZE,
  );
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CommentRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CommentRow | null>(null);

  const tabTotal = useMemo(() => {
    if (tab === 'all') return total;
    if (tab === 'pending') return pendingCount;
    if (tab === 'approved') return approvedCount;
    return rejectedCount;
  }, [tab, total, pendingCount, approvedCount, rejectedCount]);

  const itemsLengthRef = useRef(items.length);
  itemsLengthRef.current = items.length;
  const requestSeq = useRef(0);

  const fetchPage = useCallback(
    (append = false) => {
      const offset = append ? itemsLengthRef.current : 0;
      const seq = ++requestSeq.current;
      setLoading(true);
      startTransition(async () => {
        try {
          const result = await getComments({ limit: PAGE_SIZE, offset, status: tab });
          if (seq !== requestSeq.current) return;
          if (result.success && result.data) {
            const d = result.data;
            // همه state ها با هم set میشن — بدون race با loading
            setItems((prev) => (append ? [...prev, ...d.rows] : d.rows));
            setTotal(d.total);
            setPendingCount(d.pending);
            setApprovedCount(d.approved);
            setRejectedCount(d.rejected);
            setHasMore(d.rows.length >= PAGE_SIZE);
            setLoading(false);
          } else {
            setLoading(false);
          }
        } catch {
          if (seq === requestSeq.current) setLoading(false);
        }
      });
    },
    [tab],
  );

  useEffect(() => {
    fetchPage(false);
  }, [fetchPage]);

  const displayed = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.content.toLowerCase().includes(q) ||
        i.authorName.toLowerCase().includes(q) ||
        i.authorEmail.toLowerCase().includes(q) ||
        i.postTitle.toLowerCase().includes(q),
    );
  }, [items, search]);

  /* ── حذف item از لیست و آپدیت counter ── */
  const removeItem = useCallback((id: string, prevStatus: 'pending' | 'approved' | 'rejected') => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (prevStatus === 'pending') setPendingCount((p) => Math.max(0, p - 1));
    else if (prevStatus === 'approved') setApprovedCount((a) => Math.max(0, a - 1));
    else setRejectedCount((r) => Math.max(0, r - 1));
  }, []);

  /* ── سناریو: تأیید نظر ── */
  const handleApprove = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const prevStatus = item.status;

      // optimistic: حذف از تب فعلی اگر تب approved نیست
      if (tab !== 'approved') removeItem(id, prevStatus);
      else
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, approved: true, status: 'approved' as const, rejectedAt: null }
              : i,
          ),
        );

      setPendingCount((p) => (prevStatus === 'pending' ? Math.max(0, p - 1) : p));
      setRejectedCount((r) => (prevStatus === 'rejected' ? Math.max(0, r - 1) : r));
      setApprovedCount((a) => (prevStatus !== 'approved' ? a + 1 : a));

      startTransition(async () => {
        const result = await approveComment(id);
        if (!result.success) {
          toast({ title: 'خطا در تأیید', description: result.message, variant: 'destructive' });
          fetchPage(false);
        } else {
          toast({ title: 'نظر تأیید شد' });
        }
      });
    },
    [items, tab, removeItem, fetchPage, toast],
  );

  /* ── سناریو: رد نظر (از pending) ── */
  const confirmReject = useCallback(() => {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    setRejectTarget(null);

    // optimistic: حذف از تب pending
    if (tab !== 'rejected') removeItem(id, 'pending');
    setPendingCount((p) => Math.max(0, p - 1));
    setRejectedCount((r) => r + 1);

    startTransition(async () => {
      const result = await rejectComment(id);
      if (!result.success) {
        toast({ title: 'خطا در رد نظر', description: result.message, variant: 'destructive' });
        fetchPage(false);
      } else {
        toast({ title: 'نظر رد شد' });
      }
    });
  }, [rejectTarget, tab, removeItem, fetchPage, toast]);

  /* ── سناریو: لغو تأیید (approved → pending) ── */
  const handleUnapprove = useCallback(
    (id: string) => {
      // optimistic: حذف از تب approved
      if (tab === 'approved') removeItem(id, 'approved');
      setApprovedCount((a) => Math.max(0, a - 1));
      setPendingCount((p) => p + 1);

      startTransition(async () => {
        const result = await unapproveComment(id);
        if (!result.success) {
          toast({ title: 'خطا در لغو تأیید', description: result.message, variant: 'destructive' });
          fetchPage(false);
        } else {
          toast({ title: 'تأیید نظر لغو شد — به صف انتظار برگشت' });
        }
      });
    },
    [tab, removeItem, fetchPage, toast],
  );

  /* ── سناریو: بازگرداندن rejected → pending ── */
  const handleRestore = useCallback(
    (id: string) => {
      if (tab === 'rejected') removeItem(id, 'rejected');
      setRejectedCount((r) => Math.max(0, r - 1));
      setPendingCount((p) => p + 1);

      startTransition(async () => {
        const result = await restoreComment(id);
        if (!result.success) {
          toast({ title: 'خطا', description: result.message, variant: 'destructive' });
          fetchPage(false);
        } else {
          toast({ title: 'نظر به صف انتظار برگشت' });
        }
      });
    },
    [tab, removeItem, fetchPage, toast],
  );

  /* ── سناریو: حذف ── */
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const item = deleteTarget;
    setDeleteTarget(null);

    removeItem(item.id, item.status);
    setTotal((t) => Math.max(0, t - 1));

    startTransition(async () => {
      const result = await deleteComment(item.id);
      if (!result.success) {
        toast({ title: 'خطا در حذف', description: result.message, variant: 'destructive' });
        fetchPage(false);
      } else {
        toast({ title: 'نظر حذف شد' });
      }
    });
  }, [deleteTarget, removeItem, fetchPage, toast]);

  const loadMore = useCallback(() => fetchPage(true), [fetchPage]);

  /* ── Insights ── */
  const donutData: DonutSegment[] = useMemo(
    () => [
      { label: 'تأییدشده', value: approvedCount, color: 'emerald' },
      { label: 'در انتظار', value: pendingCount, color: 'amber' },
      { label: 'ردشده', value: rejectedCount, color: 'rose' },
    ],
    [approvedCount, pendingCount, rejectedCount],
  );

  const topAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      counts.set(item.authorName, (counts.get(item.authorName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ label: name, value: count, color: 'indigo' as const }));
  }, [items]);

  const pendingPreview = useMemo(
    () =>
      items
        .filter((i) => (i.status ?? (i.approved ? 'approved' : 'pending')) === 'pending')
        .slice(0, 3),
    [items],
  );

  const isEmpty = !loading && !isPending && displayed.length === 0;

  return (
    <div className={s.root}>
      {/* ── Hero ── */}
      <PageHero
        breadcrumb={[{ label: 'داشبورد', href: '/dashboard' }, { label: 'نظرات' }]}
        eyebrow="محتوا"
        title="مدیریت نظرات"
        description="بررسی، تأیید و مدیریت نظرات کاربران روی مقالات"
        icon={MessageSquare}
        actions={
          pendingCount > 0 ? (
            <button type="button" className={s.headerChip} onClick={() => setTab('pending')}>
              <Inbox size={13} strokeWidth={1.75} />
              {fa.format(pendingCount)} در انتظار
            </button>
          ) : undefined
        }
      />

      {/* ── KPI Strip ── */}
      <StatGrid cols={4}>
        <KpiCard label="کل نظرات" value={total} icon={MessagesSquare} />
        <KpiCard label="در انتظار" value={pendingCount} icon={Inbox} />
        <KpiCard label="تأییدشده" value={approvedCount} icon={CheckCheck} />
        <KpiCard label="ردشده" value={rejectedCount} icon={Ban} />
      </StatGrid>

      {/* ── Main + Aside ── */}
      <InsightLayout
        main={
          <div className={s.mainPanel}>
            {/* Tab bar + Search */}
            <div className={s.toolbar}>
              <div className={s.tabs}>
                {(Object.keys(TAB_CONFIG) as Tab[]).map((key) => {
                  const cfg = TAB_CONFIG[key];
                  const isActive = tab === key;
                  const count =
                    key === 'all'
                      ? total
                      : key === 'pending'
                        ? pendingCount
                        : key === 'approved'
                          ? approvedCount
                          : rejectedCount;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${s.tab} ${isActive ? s.tabActive : ''} ${key === 'rejected' ? s.tabRejected : ''}`}
                      onClick={() => setTab(key)}
                    >
                      <cfg.icon size={14} strokeWidth={1.75} />
                      <span className={s.tabLabel}>{cfg.label}</span>
                      <span
                        className={`${s.tabBadge} ${key === 'rejected' && count > 0 ? s.tabBadgeRejected : ''}`}
                      >
                        {fa.format(count)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder="جستجو در نظرات..." />
            </div>

            {/* ── Moderation Feed ── */}
            {isEmpty ? (
              <MillionDollarEmpty
                variant="inbox"
                eyebrow="نظرات"
                title={
                  tab === 'pending'
                    ? 'هیچ نظری در انتظار نیست'
                    : tab === 'approved'
                      ? 'هیچ نظر تأییدشده‌ای وجود ندارد'
                      : tab === 'rejected'
                        ? 'هیچ نظر ردشده‌ای وجود ندارد'
                        : 'هنوز نظری ثبت نشده است'
                }
                description={
                  tab === 'pending'
                    ? 'وقتی نظرات جدید ارسال شوند، اینجا نمایش داده می‌شوند'
                    : tab === 'rejected'
                      ? 'نظراتی که رد می‌شوند اینجا نمایش داده می‌شوند'
                      : 'وقتی نظرات ثبت و مدیریت شوند، اینجا نمایش داده می‌شوند'
                }
                tone={tab === 'pending' ? 'amber' : tab === 'rejected' ? 'rose' : 'neutral'}
              />
            ) : (
              <div className={s.feed}>
                {loading && items.length === 0 ? (
                  <div className={s.skeletonFeed}>
                    <div className={s.skeletonCard} />
                    <div className={s.skeletonCard} />
                    <div className={s.skeletonCard} />
                  </div>
                ) : (
                  <>
                    {displayed.map((comment) => (
                      <ModerationCard
                        key={comment.id}
                        comment={comment}
                        onApprove={handleApprove}
                        onRejectRequest={(id) => {
                          const item = displayed.find((c) => c.id === id);
                          if (item) setRejectTarget(item);
                        }}
                        onUnapprove={handleUnapprove}
                        onRestore={handleRestore}
                        onDelete={(id) => {
                          const item = displayed.find((c) => c.id === id);
                          if (item) setDeleteTarget(item);
                        }}
                      />
                    ))}
                    {hasMore && !loading && (
                      <div className={s.loadMoreContainer}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={loadMore}
                          className={s.loadMoreBtn}
                        >
                          <Plus size={14} strokeWidth={2} />
                          بارگذاری بیشتر
                        </Button>
                        <span className={s.footCount}>
                          نمایش {fa.format(displayed.length)} از {fa.format(tabTotal)} نظر
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        }
        aside={
          <InsightPanel>
            {/* Status Donut */}
            <InsightCard title="وضعیت نظرات" icon={MessageSquare}>
              {total > 0 ? (
                <Donut data={donutData} centerLabel="مجموع" centerValue={fa.format(total)} />
              ) : (
                <p className={s.insightEmpty}>هنوز نظری ثبت نشده است</p>
              )}
            </InsightCard>

            {/* Top Commenters */}
            <InsightCard title="نویسندگان پرنظرات" icon={Users}>
              {topAuthors.length > 0 ? (
                <BarList data={topAuthors} showShare />
              ) : (
                <p className={s.insightEmpty}>هنوز نظری ثبت نشده است</p>
              )}
            </InsightCard>

            {/* Quick Approve Queue */}
            <InsightCard title="صف تأیید سریع" icon={CheckCheck}>
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
                        onClick={() => handleApprove(item.id)}
                        title="تأیید سریع"
                      >
                        <CheckCheck size={15} strokeWidth={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.insightEmpty}>صف انتظار خالی است</p>
              )}
            </InsightCard>

            {/* Quick Links */}
            <InsightCard title="دسترسی سریع" icon={ArrowRight}>
              <div className={s.quickLinks}>
                <Link href="/dashboard/posts" className={s.quickLink}>
                  <FileText size={14} strokeWidth={1.75} />
                  مقالات
                </Link>
                <Link href="/dashboard/users" className={s.quickLink}>
                  <Users size={14} strokeWidth={1.75} />
                  کاربران
                </Link>
              </div>
            </InsightCard>
          </InsightPanel>
        }
      />

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف نظر"
        description="این نظر حذف می‌شود."
        warning="این عمل قابل بازگشت نیست — نظر و تمام پاسخ‌های آن برای همیشه از بین می‌رود."
        confirmLabel="حذف شود"
        onConfirm={confirmDelete}
        variant="danger"
      />

      {/* ── Reject Confirm (ساده — فقط رد/انصراف) ── */}
      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="رد نظر"
        description="این نظر رد می‌شود و در لیست ردشده‌ها قرار می‌گیرد."
        confirmLabel="رد شود"
        onConfirm={confirmReject}
        variant="caution"
      />
    </div>
  );
}
