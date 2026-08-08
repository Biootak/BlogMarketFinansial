'use client';

import {
  deletePostAndInvalidate,
  duplicatePost,
  listAllPosts,
  updatePost,
  updatePostStatusAndInvalidate,
} from '@/actions/postActions';
import PostsFloatingToolbar from '@/components/Dashboard/DashboardPage/PostsFloatingToolbar';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import FormattedDate from '@/components/FormattedDate';
import LoadingMore from '@/components/LoadingMore';
import { toast } from '@/components/ui/use-toast';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { getPostLink } from '@/lib/getPostLink';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import type { ActionResult, PostStatus, PostWithRelations } from '@/types/types';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiCheck,
  HiCursorArrowRipple,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiXMark,
} from 'react-icons/hi2';
import CardList from '../DashboardPage/CardList';
import type { ViewMode } from './PostsPageHeader';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface PostListProps {
  initialPosts: PostWithRelations[];
  hasNextPage: boolean;
  totalPages: number;
  totalPosts: number;
  currentSearch?: string;
  currentFilter?: string;
}

const statusBadgeClass: Record<string, string> = {
  PUBLISHED: 'at-badge--published',
  DRAFT: 'at-badge--draft',
  PENDING_REVIEW: 'at-badge--pending',
  SCHEDULED: 'at-badge--scheduled',
};

const statusBadgeLabel: Record<string, string> = {
  PUBLISHED: 'منتشر شده',
  DRAFT: 'پیش‌نویس',
  PENDING_REVIEW: 'در انتظار بررسی',
  SCHEDULED: 'زمان‌بندی شده',
};

export default function PostList({
  initialPosts,
  hasNextPage: initialHasNextPage,
  totalPages,
  totalPosts,
  currentSearch,
  currentFilter,
}: PostListProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);

  // Selection state (multi-select)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  // Active post state (single — برای toolbar شناور)
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const activePost = useMemo(
    () => posts.find((p) => p.id === activePostId) ?? null,
    [posts, activePostId],
  );

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // View mode — sync با header از طریق custom event + localStorage
  const [viewMode, setViewMode] = useState<ViewMode>('magazine');
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('posts.viewMode') as ViewMode | null;
      if (stored === 'magazine' || stored === 'grid' || stored === 'list') {
        setViewMode(stored);
      }
    } catch {
      /* ignore */
    }
    const handler = (e: Event) => {
      const next = (e as CustomEvent<ViewMode>).detail;
      if (next === 'magazine' || next === 'grid' || next === 'list') setViewMode(next);
    };
    window.addEventListener('posts:viewMode', handler);
    return () => window.removeEventListener('posts:viewMode', handler);
  }, []);

  // ── همگام‌سازی با props هنگام تغییر URL (search/filter/page از سرور) ──
  // اگه این نباشه، تغییر فیلتر فقط state optimistic هدر رو عوض می‌کنه و
  // لیست واقعی تا رندر بعدی سرور ثابت می‌مونه.
  useEffect(() => {
    setPosts(initialPosts);
    setHasNextPage(initialHasNextPage);
    setPage(2);
    // پاک کردن انتخاب‌های مربوط به پست‌هایی که دیگر در لیست نیستند
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(initialPosts.map((p) => p.id));
      const next = new Set<string>();
      for (const id of prev) if (visible.has(id)) next.add(id);
      return next;
    });
    // فعال‌سازی قبلی ممکن است به پستی اشاره کند که دیگر در لیست نیست
    setActivePostId((prev) => {
      if (!prev) return prev;
      return initialPosts.some((p) => p.id === prev) ? prev : null;
    });
  }, [initialPosts, initialHasNextPage, currentSearch, currentFilter]);

  const loadMore = useCallback(async () => {
    if (hasNextPage && !isLoading) {
      setIsLoading(true);
      const result: ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }> =
        await listAllPosts(
          page,
          12,
          currentSearch || '',
          (currentFilter as 'همه' | PostStatus) || 'همه',
        );

      if (result.success && result.data) {
        const newPosts = result.data.posts || [];
        setPosts((prev) => [...prev, ...newPosts]);
        setPage((prev) => prev + 1);
        setHasNextPage(page < totalPages);
      }
      setIsLoading(false);
    }
  }, [hasNextPage, isLoading, page, totalPages, currentSearch, currentFilter]);

  const infiniteScrollRef = useInfiniteScroll(loadMore, hasNextPage, isLoading);

  // کلیک روی کارت → فعال‌سازی برای toolbar شناور
  const handleActivate = useCallback((postId: string) => {
    setActivePostId((prev) => (prev === postId ? null : postId));
  }, []);

  const handleCloseToolbar = useCallback(() => {
    setActivePostId(null);
  }, []);

  // Toggle selection for a single post
  const toggleSelect = useCallback((postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
  }, [selectedIds.size, posts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleStartSelection = useCallback((postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setActivePostId(null);
  }, []);

  const handleDeletePost = useCallback(
    (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (post) {
        setDeleteTarget({ id: post.id, title: post.title });
      }
    },
    [posts],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const result = await deletePostAndInvalidate(deleteTarget.id);
      if (result.success) {
        setPosts((prev) => prev.filter((post) => post.id !== deleteTarget.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.id);
          return next;
        });
        if (activePostId === deleteTarget.id) {
          setActivePostId(null);
        }
        toast({
          title: 'موفقیت',
          description: `پست "${deleteTarget.title}" با موفقیت حذف شد`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'خطا',
          description: result.error || 'خطا در حذف پست',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در حذف پست',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, activePostId]);

  const confirmBulkDelete = useCallback(async () => {
    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const result = await deletePostAndInvalidate(id);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      setPosts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      if (activePostId && selectedIds.has(activePostId)) {
        setActivePostId(null);
      }
      toast({
        title: 'موفقیت',
        description: `${successCount} پست با موفقیت حذف شد${failCount > 0 ? ` (${failCount} ناموفق)` : ''}`,
        variant: 'success',
      });
    } else {
      toast({
        title: 'خطا',
        description: 'خطا در حذف پستها',
        variant: 'destructive',
      });
    }

    setIsDeleting(false);
    setBulkDeleteOpen(false);
  }, [selectedIds, activePostId]);

  const handleChangeStatus = useCallback(
    async (postId: string, newStatus: PostStatus): Promise<boolean> => {
      try {
        const result = await updatePostStatusAndInvalidate(postId, newStatus);
        if (result.success) {
          setPosts((prev) =>
            prev.map((post) => (post.id === postId ? { ...post, status: newStatus } : post)),
          );
          toast({
            title: 'موفقیت',
            description: 'وضعیت پست با موفقیت بروز شد',
            variant: 'success',
          });
          return true;
        }
        toast({
          title: 'خطا',
          description: result.error || 'خطا در بروزرسانی وضعیت',
          variant: 'destructive',
        });
      } catch {
        toast({
          title: 'خطا',
          description: 'خطا در بروزرسانی وضعیت پست',
          variant: 'destructive',
        });
      }
      return false;
    },
    [],
  );

  // Featured toggle — از updatePost استفاده می‌کند (isFeatured partial update)
  const handleToggleFeatured = useCallback(
    async (postId: string, currentFeatured: boolean): Promise<boolean> => {
      try {
        const result = await updatePost(postId, { isFeatured: !currentFeatured } as never);
        if (result.success && result.data) {
          setPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, isFeatured: !currentFeatured } : p)),
          );
          toast({
            title: 'موفقیت',
            description: !currentFeatured ? 'پست به‌عنوان ویژه نشان شد.' : 'از حالت ویژه خارج شد.',
            variant: 'success',
          });
          return true;
        }
        toast({
          title: 'خطا',
          description: result.message || 'خطا در تغییر وضعیت ویژه',
          variant: 'destructive',
        });
      } catch {
        toast({
          title: 'خطا',
          description: 'خطا در تغییر وضعیت ویژه پست',
          variant: 'destructive',
        });
      }
      return false;
    },
    [],
  );

  // Duplicate post — سرور عملیات را انجام می‌دهد و به لیست تازه اضافه می‌کنیم
  const handleDuplicate = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const result = await duplicatePost(postId);
      const newPost = result.success ? result.data : undefined;
      if (newPost) {
        // اضافه به اول لیست (اختیاری — اگه در همین صفحه باشه دیده می‌شه)
        setPosts((prev) => [newPost, ...prev]);
        toast({
          title: 'موفقیت',
          description: `پست "${newPost.title}" به‌صورت پیش‌نویس تکرار شد.`,
          variant: 'success',
        });
        return true;
      }
      toast({
        title: 'خطا',
        description: result.message || 'خطا در تکرار پست',
        variant: 'destructive',
      });
    } catch {
      toast({
        title: 'خطا',
        description: 'خطا در تکرار پست. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
    return false;
  }, []);

  const dangerBtn =
    'inline-flex items-center justify-center gap-1.5 ' +
    'h-10 px-3.5 rounded-[10px] border ' +
    'bg-[color:var(--at-surface)] border-[color:var(--at-danger)] text-[color:var(--at-danger)] ' +
    'text-xs font-semibold hover:bg-[color:var(--at-danger-soft)] ' +
    'transition-[background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-danger)] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[color:var(--at-bg)] ' +
    'active:scale-[0.98]';

  // ── Empty state ──
  if (posts.length === 0 && !isLoading) {
    return (
      <div className="dash2-page space-y-4 pb-32">
        <div className="at-tile">
          <div className="flex flex-col items-center justify-center text-center py-14 px-6">
            <span
              className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-4 bg-[color:var(--at-accent-soft)] text-[color:var(--at-fg-subtle)]"
              aria-hidden
            >
              <HiOutlineSparkles className="w-7 h-7" />
            </span>
            <h3 className="text-base font-bold text-[color:var(--at-fg)] mb-1">پستی یافت نشد</h3>
            <p className="text-sm text-[color:var(--at-fg-subtle)] max-w-sm">
              {currentSearch
                ? `نتیجه‌ای برای "${currentSearch}" یافت نشد. جستجوی دیگری امتحان کنید.`
                : 'هنوز پستی ایجاد نشده است. اولین پست خود را ایجاد کنید.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash2-page space-y-4 pb-32">
      {/* ─── Selection bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="at-tile"
      >
        <div className="at-head">
          <div className="at-head__title">
            <span className="at-head__ico" aria-hidden>
              <HiOutlineDocumentText className="w-3.5 h-3.5" />
            </span>
            <div className="at-head__text">
              <h2 className="at-head__title-text">پست‌ها</h2>
              <p className="at-head__sub">
                <span className="tabular-nums font-semibold text-[color:var(--at-fg-muted)]">
                  {totalPosts.toLocaleString('fa-IR')}
                </span>{' '}
                پست
                {currentSearch && <span> برای &ldquo;{currentSearch}&rdquo;</span>}
                {currentFilter && currentFilter !== 'همه' && (
                  <span>
                    {' '}
                    با فیلتر{' '}
                    {currentFilter === 'PUBLISHED'
                      ? 'منتشر شده'
                      : currentFilter === 'DRAFT'
                        ? 'پیش‌نویس'
                        : currentFilter === 'SCHEDULED'
                          ? 'زمان‌بندی شده'
                          : 'در انتظار بررسی'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isSelecting ? (
              <motion.div
                key="selection-actions"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2"
              >
                <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-[10px] border border-[color:var(--at-violet)] bg-[color:var(--at-accent-soft)] text-[color:var(--at-violet)] text-xs font-semibold">
                  <HiCheck className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{selectedIds.size.toLocaleString('fa-IR')}</span>
                  <span>انتخاب شده</span>
                </span>

                <button type="button" onClick={toggleSelectAll} className="at-head__btn">
                  {selectedIds.size === posts.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                </button>

                <button type="button" onClick={() => setBulkDeleteOpen(true)} className={dangerBtn}>
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className={cn(
                    'inline-flex items-center justify-center w-10 h-10 rounded-[10px] border',
                    'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line)] text-[color:var(--at-fg-muted)]',
                    'hover:bg-[color:var(--at-surface-hover)]',
                    'transition-colors duration-200',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)] focus-visible:ring-offset-2',
                    'focus-visible:ring-offset-[color:var(--at-bg)]',
                    'active:scale-[0.98]',
                  )}
                  aria-label="لغو"
                  title="لغو"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="default-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Active post hint */}
        <AnimatePresence>
          {activePost && !isSelecting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden border-t border-[color:var(--at-line)]"
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-[color:var(--at-accent-soft)]">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--at-violet)] opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--at-violet)]" />
                </span>
                <span className="text-xs font-medium text-[color:var(--at-fg-muted)] truncate flex-1">
                  پست فعال:{' '}
                  <span className="font-bold text-[color:var(--at-fg)]">{activePost.title}</span>
                </span>
                <button
                  type="button"
                  onClick={handleCloseToolbar}
                  className={cn(
                    'inline-flex items-center justify-center w-7 h-7 rounded-[8px]',
                    'text-[color:var(--at-fg-muted)] hover:bg-white/60 hover:text-[color:var(--at-fg)]',
                    'transition-colors duration-200 flex-shrink-0',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)]',
                  )}
                  aria-label="لغو فعال‌سازی"
                  title="بستن"
                >
                  <HiXMark className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Hint ─── */}
      <AnimatePresence>
        {!isSelecting && !activePost && posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2 text-xs text-[color:var(--at-fg-subtle)] py-2"
          >
            <HiCursorArrowRipple className="w-3.5 h-3.5" aria-hidden />
            <span>روی هر پست کلیک کنید تا نوار ابزار نمایش داده شود</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Content (view-mode aware) ─── */}
      {viewMode === 'magazine' && (
        <MagazineLayout
          posts={posts}
          selectedIds={selectedIds}
          activePostId={activePostId}
          isSelecting={isSelecting}
          onActivate={handleActivate}
          onSelect={toggleSelect}
        />
      )}

      {viewMode === 'grid' && (
        <GridLayout
          posts={posts}
          selectedIds={selectedIds}
          activePostId={activePostId}
          isSelecting={isSelecting}
          onActivate={handleActivate}
          onSelect={toggleSelect}
        />
      )}

      {viewMode === 'list' && (
        <ListLayout
          posts={posts}
          selectedIds={selectedIds}
          activePostId={activePostId}
          isSelecting={isSelecting}
          onActivate={handleActivate}
          onSelect={toggleSelect}
        />
      )}

      {isLoading && (
        <div>
          <LoadingMore message="در حال دریافت پستهای بیشتر…" />
        </div>
      )}

      <div ref={infiniteScrollRef} className="h-px" />

      {/* Single delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="حذف پست"
        description={`آیا از حذف پست "${deleteTarget?.title}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="حذف"
        cancelLabel="انصراف"
        onConfirm={confirmDelete}
        variant="danger"
        loading={isDeleting}
      />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="حذف چند پست"
        description={`آیا از حذف ${selectedIds.size.toLocaleString('fa-IR')} پست انتخاب شده اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel={`حذف ${selectedIds.size.toLocaleString('fa-IR')} پست`}
        cancelLabel="انصراف"
        onConfirm={confirmBulkDelete}
        variant="danger"
        loading={isDeleting}
      />

      <PostsFloatingToolbar
        activePost={activePost}
        bulkSelectionCount={selectedIds.size}
        onStatusChange={handleChangeStatus}
        onDelete={handleDeletePost}
        onClose={handleCloseToolbar}
        onBulkDelete={() => setBulkDeleteOpen(true)}
        onBulkClear={clearSelection}
        onStartSelection={handleStartSelection}
        onToggleFeatured={handleToggleFeatured}
        onDuplicate={handleDuplicate}
      />

      {/* FAB — فقط وقتی انتخاب یا فیلتر فعال نیست، و تعداد پست > 3 (جلوگیری از شلوغی) */}
      <AnimatePresence>
        {!isSelecting && !activePost && posts.length > 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-6 end-6 z-30 lg:hidden"
          >
            <Link
              href="/dashboard/posts/create"
              aria-label="پست جدید"
              className={cn(
                'flex items-center justify-center w-14 h-14 rounded-full',
                'bg-[color:var(--at-accent)] text-[color:var(--at-accent-fg)]',
                'shadow-[0_10px_30px_-10px_oklch(70%_0.16_165_/_0.6),0_4px_12px_-2px_oklch(0%_0_0_/_0.2)]',
                'hover:scale-105 active:scale-95 transition-transform duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)] focus-visible:ring-offset-2',
                'focus-visible:ring-offset-[color:var(--at-bg)]',
              )}
            >
              <HiOutlinePlus className="w-6 h-6" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// View-mode layouts
// ════════════════════════════════════════════════════════════════════════════

interface LayoutProps {
  posts: PostWithRelations[];
  selectedIds: Set<string>;
  activePostId: string | null;
  isSelecting: boolean;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
}

/** Magazine — اولین پست = hero بزرگ (full-width) + بقیه ۲ ستونه */
function MagazineLayout({
  posts,
  selectedIds,
  activePostId,
  isSelecting,
  onActivate,
  onSelect,
}: LayoutProps) {
  if (posts.length === 0) return null;
  const [hero, ...rest] = posts;

  return (
    <div className="space-y-5">
      <motion.div
        key={hero.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <HeroCard
          post={hero}
          isActive={activePostId === hero.id}
          isSelecting={isSelecting}
          selected={selectedIds.has(hero.id)}
          onActivate={onActivate}
          onSelect={onSelect}
        />
      </motion.div>

      {rest.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
        >
          {rest.map((post) => (
            <motion.div key={post.id} variants={itemVariants}>
              <CardList
                post={post}
                onActivate={onActivate}
                selected={selectedIds.has(post.id)}
                onSelect={onSelect}
                isSelecting={isSelecting}
                isActive={activePostId === post.id}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/** Grid — گرید یکدست ۳ ستونه */
function GridLayout({
  posts,
  selectedIds,
  activePostId,
  isSelecting,
  onActivate,
  onSelect,
}: LayoutProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
      }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5"
    >
      {posts.map((post) => (
        <motion.div key={post.id} variants={itemVariants}>
          <CardList
            post={post}
            onActivate={onActivate}
            selected={selectedIds.has(post.id)}
            onSelect={onSelect}
            isSelecting={isSelecting}
            isActive={activePostId === post.id}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

/** List — ردیف‌های چگال با thumb + meta inline (مثل inbox) */
function ListLayout({
  posts,
  selectedIds,
  activePostId,
  isSelecting,
  onActivate,
  onSelect,
}: LayoutProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
      }}
      className="at-tile overflow-hidden divide-y divide-[color:var(--at-line)]"
    >
      {posts.map((post) => (
        <motion.div key={post.id} variants={itemVariants}>
          <ListRow
            post={post}
            isActive={activePostId === post.id}
            isSelecting={isSelecting}
            selected={selectedIds.has(post.id)}
            onActivate={onActivate}
            onSelect={onSelect}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── HeroCard: کارت بزرگ تحریریه با تصویر ۱۶:۹ ──────────────────────────
interface HeroCardProps {
  post: PostWithRelations;
  isActive: boolean;
  isSelecting: boolean;
  selected: boolean;
  onActivate: (id: string) => void;
  onSelect: (id: string) => void;
}

function HeroCard({ post, isActive, isSelecting, selected, onActivate, onSelect }: HeroCardProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      let el: HTMLElement | null = target;
      while (el && el !== e.currentTarget) {
        const tag = el.tagName;
        if (
          tag === 'A' ||
          tag === 'BUTTON' ||
          el.getAttribute('role') === 'button' ||
          el.getAttribute('role') === 'link'
        ) {
          return;
        }
        el = el.parentElement;
      }
      if (isSelecting) onSelect(post.id);
      else onActivate(post.id);
    },
    [isSelecting, onSelect, onActivate, post.id],
  );

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (isSelecting) onSelect(post.id);
          else onActivate(post.id);
        }
      }}
      className={cn(
        'at-tile relative overflow-hidden cursor-pointer',
        'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-0',
        isActive &&
          !isSelecting &&
          'border-[color:var(--at-accent)] shadow-[0_0_0_1px_var(--at-accent),var(--at-shadow-hover)]',
        isSelecting && selected && 'border-[color:var(--at-violet)]',
      )}
    >
      {/* تصویر ۱۶:۹ سمت راست (در RTL اول می‌آید) */}
      <div className="relative aspect-[16/9] lg:aspect-auto overflow-hidden bg-[color:var(--at-bg-elevated)]">
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featuredImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[color:var(--at-fg-subtle)] bg-gradient-to-br from-[color:var(--at-bg-elevated)] to-[color:var(--at-surface)]">
            <HiOutlineDocumentText className="w-16 h-16" />
          </div>
        )}
        {/* subtle aurora overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"
          aria-hidden
        />

        {/* badge hero top-start */}
        <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-black/55 backdrop-blur text-white text-[11px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--at-accent)]" aria-hidden />
            ویژه
          </span>
          <span className={cn('at-badge', statusBadgeClass[post.status])}>
            {statusBadgeLabel[post.status]}
          </span>
        </div>

        {/* selection checkbox */}
        {isSelecting && (
          <div className="absolute top-4 start-4 z-10">
            <div
              className={cn(
                'w-7 h-7 rounded-[8px] border-2 flex items-center justify-center transition-all duration-200',
                selected
                  ? 'bg-[color:var(--at-violet)] border-[color:var(--at-violet)] text-white'
                  : 'bg-white/90 dark:bg-slate-900/90 border-[color:var(--at-line-strong)]',
              )}
            >
              {selected && <HiCheck className="w-5 h-5" />}
            </div>
          </div>
        )}
      </div>

      {/* محتوای متنی سمت چپ */}
      <div className="relative p-6 lg:p-8 flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2 text-xs text-[color:var(--at-fg-subtle)]">
          <FormattedDate date={post.createdAt} />
          {post.readingTime != null && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
                {post.readingTime} دقیقه
              </span>
            </>
          )}
          {post.viewCount != null && post.viewCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <HiOutlineEye className="w-3.5 h-3.5" aria-hidden />
                <span className="tabular-nums">{post.viewCount.toLocaleString('fa-IR')}</span>{' '}
                بازدید
              </span>
            </>
          )}
        </div>

        <h2
          className="text-xl lg:text-2xl font-black text-[color:var(--at-fg)] leading-snug line-clamp-3"
          dir="rtl"
        >
          <Link
            href={getPostLink(post.postType, post.slug)}
            className="hover:text-[color:var(--at-accent)] transition-colors"
            onClick={(e) => isSelecting && e.preventDefault()}
            tabIndex={isSelecting ? -1 : 0}
          >
            {post.title}
          </Link>
        </h2>

        {post.excerpt && (
          <p
            className="text-sm text-[color:var(--at-fg-muted)] leading-relaxed line-clamp-3"
            dir="rtl"
          >
            {post.excerpt}
          </p>
        )}

        {/* tags pills */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {post.tags.slice(0, 4).map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center h-6 px-2 rounded-full text-[11px] font-medium bg-[color:var(--at-bg-elevated)] border border-[color:var(--at-line)] text-[color:var(--at-fg-muted)]"
              >
                #{t.name}
              </span>
            ))}
            {post.tags.length > 4 && (
              <span className="text-[11px] text-[color:var(--at-fg-subtle)]">
                +{post.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* footer author */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-[color:var(--at-line)]">
          <div className="flex items-center gap-2 min-w-0">
            {post.author?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author.image}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-[color:var(--at-line)]"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[color:var(--at-fg)] truncate">
                {post.author?.name ?? 'ناشناس'}
              </p>
              <p className="text-[10px] text-[color:var(--at-fg-subtle)] truncate">
                {post.author?.profile?.jobName ?? 'نویسنده'}
              </p>
            </div>
          </div>

          <Link
            href={`/dashboard/posts/edit/${post.id}`}
            onClick={(e) => e.stopPropagation()}
            className="at-btn at-btn--secondary at-btn--sm"
          >
            ویرایش
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── ListRow: ردیف چگال inbox-style با thumb کوچک ──────────────────────
interface ListRowProps extends HeroCardProps {}

function ListRow({ post, isActive, isSelecting, selected, onActivate, onSelect }: ListRowProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      let el: HTMLElement | null = target;
      while (el && el !== e.currentTarget) {
        const tag = el.tagName;
        if (
          tag === 'A' ||
          tag === 'BUTTON' ||
          el.getAttribute('role') === 'button' ||
          el.getAttribute('role') === 'link'
        ) {
          return;
        }
        el = el.parentElement;
      }
      if (isSelecting) onSelect(post.id);
      else onActivate(post.id);
    },
    [isSelecting, onSelect, onActivate, post.id],
  );

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (isSelecting) onSelect(post.id);
          else onActivate(post.id);
        }
      }}
      className={cn(
        'relative flex items-center gap-4 px-4 py-3 cursor-pointer',
        'transition-colors duration-150',
        'hover:bg-[color:var(--at-surface-hover)]',
        isActive && !isSelecting && 'bg-[color:var(--at-accent-soft)]',
        isSelecting && selected && 'bg-[color:var(--at-accent-soft)]',
      )}
    >
      {/* thumb */}
      <div className="flex-shrink-0 w-16 h-16 rounded-[10px] overflow-hidden bg-[color:var(--at-bg-elevated)] border border-[color:var(--at-line)]">
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featuredImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[color:var(--at-fg-subtle)]">
            <HiOutlineDocumentText className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* selection checkbox */}
      {isSelecting && (
        <div className="flex-shrink-0">
          <div
            className={cn(
              'w-5 h-5 rounded-[7px] border-2 flex items-center justify-center transition-all duration-200',
              selected
                ? 'bg-[color:var(--at-violet)] border-[color:var(--at-violet)] text-white'
                : 'bg-white/80 dark:bg-slate-900/80 border-[color:var(--at-line-strong)]',
            )}
          >
            {selected && <HiCheck className="w-3.5 h-3.5" />}
          </div>
        </div>
      )}

      {/* content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-[color:var(--at-fg)] truncate" dir="rtl">
          <Link
            href={getPostLink(post.postType, post.slug)}
            onClick={(e) => isSelecting && e.preventDefault()}
            tabIndex={isSelecting ? -1 : 0}
            className="hover:text-[color:var(--at-accent)] transition-colors"
          >
            {post.title}
          </Link>
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-[color:var(--at-fg-subtle)]">
          {post.author?.name && <span className="truncate max-w-[120px]">{post.author.name}</span>}
          <span aria-hidden>·</span>
          <FormattedDate date={post.createdAt} />
          {post.viewCount != null && post.viewCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <HiOutlineEye className="w-3 h-3" />
                {post.viewCount.toLocaleString('fa-IR')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* badge */}
      <div className="flex-shrink-0">
        <span className={cn('at-badge', statusBadgeClass[post.status])}>
          {statusBadgeLabel[post.status]}
        </span>
      </div>
    </div>
  );
}
