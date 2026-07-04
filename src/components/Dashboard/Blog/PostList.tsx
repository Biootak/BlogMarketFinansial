'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import { deletePostAndInvalidate, listAllPosts, updatePostStatusAndInvalidate } from '@/actions/postActions';
import type { ActionResult, PostWithRelations, PostStatus } from '@/types/types';
import LoadingMore from '@/components/LoadingMore';
import CardList from '../DashboardPage/CardList';
import { toast } from '@/components/ui/use-toast';
import { ConfirmDialog } from '@/components/Dashboard/primitives';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiCursorArrowRipple,
  HiXMark,
  HiCheck,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import PostsFloatingToolbar from '@/components/Dashboard/DashboardPage/PostsFloatingToolbar';

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

  const loadMore = useCallback(async () => {
    if (hasNextPage && !isLoading) {
      setIsLoading(true);
      const result: ActionResult<{ posts: PostWithRelations[]; total: number; pages: number }> =
        await listAllPosts(page, 12, currentSearch || '', (currentFilter as 'همه' | PostStatus) || 'همه');

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

  // Select all / deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
  }, [selectedIds.size, posts]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // شروع انتخاب گروهی از یک پست (از toolbar single)
  const handleStartSelection = useCallback((postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setActivePostId(null);
  }, []);

  // Delete single post (از toolbar یا از per-card)
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

  // Bulk delete
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

  // Status change
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
        } else {
          toast({
            title: 'خطا',
            description: result.error || 'خطا در بروزرسانی وضعیت',
            variant: 'destructive',
          });
        }
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

  // ── variant classes (atelier tokens) ──
  const dangerBtn =
    'inline-flex items-center justify-center gap-1.5 ' +
    'h-10 px-3.5 rounded-[10px] border ' +
    'bg-[color:var(--at-surface)] border-[color:var(--at-danger)] text-[color:var(--at-danger)] ' +
    'text-xs font-semibold hover:bg-[color:var(--at-danger-soft)] ' +
    'transition-[background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-danger)] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[color:var(--at-bg)] ' +
    'active:scale-[0.98]';

  return (
    <div className="dash2-page space-y-4 pb-32">
      {/* ─── Stats + Selection (at-tile at-head pattern) ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="at-tile"
      >
        {/* Head */}
        <div className="at-head">
          {/* Title block (icon + label + sub) — atelier head style */}
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
                        : 'در انتظار بررسی'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Actions: bulk selection controls */}
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

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="at-head__btn"
                >
                  {selectedIds.size === posts.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
                </button>

                <button
                  type="button"
                  onClick={() => setBulkDeleteOpen(true)}
                  className={dangerBtn}
                >
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
              >
                {/* نگه‌داشتن فضا — دکمه‌های دیگر اگه نیاز بود اینجا */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active post hint — یه بنر کوچک atelier-style */}
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
                  پست فعال: <span className="font-bold text-[color:var(--at-fg)]">{activePost.title}</span>
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

      {/* ─── Hint (atelier-style) ─── */}
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
            <span>روی هر کارت کلیک کنید تا نوار ابزار مدیریت نمایش داده شود</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Posts grid ─── */}
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
              onActivate={handleActivate}
              selected={selectedIds.has(post.id)}
              onSelect={toggleSelect}
              isSelecting={isSelecting}
              isActive={activePostId === post.id}
            />
          </motion.div>
        ))}

        {isLoading && (
          <div className="col-span-full">
            <LoadingMore message="در حال دریافت پستهای بیشتر..." />
          </div>
        )}

        {posts.length === 0 && !isLoading && (
          <div className="col-span-full">
            {/* empty state به سبک at-posts__empty-state */}
            <div className="at-tile">
              <div className="flex flex-col items-center justify-center text-center py-14 px-6">
                <span
                  className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-4 bg-[color:var(--at-accent-soft)] text-[color:var(--at-fg-subtle)]"
                  aria-hidden
                >
                  <HiOutlineSparkles className="w-7 h-7" />
                </span>
                <h3 className="text-base font-bold text-[color:var(--at-fg)] mb-1">
                  پستی یافت نشد
                </h3>
                <p className="text-sm text-[color:var(--at-fg-subtle)] max-w-sm">
                  {currentSearch
                    ? `نتیجه‌ای برای "${currentSearch}" یافت نشد. جستجوی دیگری امتحان کنید.`
                    : 'هنوز پستی ایجاد نشده است. اولین پست خود را ایجاد کنید.'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={infiniteScrollRef} className="col-span-full h-px" />
      </motion.div>

      {/* Single delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
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

      {/* ─── toolbar شناور — پایین صفحه، واحد برای همه پست‌ها ─── */}
      <PostsFloatingToolbar
        activePost={activePost}
        bulkSelectionCount={selectedIds.size}
        onStatusChange={handleChangeStatus}
        onDelete={handleDeletePost}
        onClose={handleCloseToolbar}
        onBulkDelete={() => setBulkDeleteOpen(true)}
        onBulkClear={clearSelection}
        onStartSelection={handleStartSelection}
      />
    </div>
  );
}
