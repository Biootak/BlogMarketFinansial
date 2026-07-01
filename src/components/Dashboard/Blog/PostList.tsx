'use client';

import { useCallback, useState } from 'react';
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
} from 'react-icons/hi2';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

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

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

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

  // Delete single post
  const handleDeletePost = useCallback(async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setDeleteTarget({ id: post.id, title: post.title });
    }
  }, [posts]);

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
  }, [deleteTarget]);

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
  }, [selectedIds]);

  // Status change
  const handleChangeStatus = useCallback(async (
    postId: string,
    newStatus: PostWithRelations['status'],
  ): Promise<boolean> => {
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
  }, []);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 py-3"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <HiOutlineDocumentText className="w-4 h-4" />
          <span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {totalPosts.toLocaleString('fa-IR')}
            </span>{' '}
            پست
            {currentSearch && (
              <span> برای &ldquo;{currentSearch}&rdquo;</span>
            )}
            {currentFilter && currentFilter !== 'همه' && (
              <span> با فیلتر {currentFilter === 'PUBLISHED' ? 'منتشر شده' : currentFilter === 'DRAFT' ? 'پیشنویس' : 'در انتظار بررسی'}</span>
            )}
          </span>
        </div>

        {/* Selection actions */}
        <AnimatePresence>
          {isSelecting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3"
            >
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">
                {selectedIds.size.toLocaleString('fa-IR')} انتخاب شده
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {selectedIds.size === posts.length ? 'لغو انتخاب همه' : 'انتخاب همه'}
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
                  'hover:bg-rose-100 dark:hover:bg-rose-900/30',
                  'transition-colors duration-200',
                )}
              >
                <HiOutlineTrash className="w-3.5 h-3.5" />
                حذف انتخاب شده
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                لغو
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Posts grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
      >
        {posts.map((post) => (
          <motion.div key={post.id} variants={itemVariants}>
            <CardList
              post={post}
              onDelete={handleDeletePost}
              onStatusChange={handleChangeStatus}
              selected={selectedIds.has(post.id)}
              onSelect={toggleSelect}
              isSelecting={isSelecting}
            />
          </motion.div>
        ))}

        {isLoading && (
          <div className="col-span-full">
            <LoadingMore message="در حال دریافت پستهای بیشتر..." />
          </div>
        )}

        {posts.length === 0 && !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <HiOutlineDocumentText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              پستی یافت نشد
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              {currentSearch
                ? `نتیجهای برای "${currentSearch}" یافت نشد. جستجوی دیگری امتحان کنید.`
                : 'هنوز پستی ایجاد نشده است. اولین پست خود را ایجاد کنید.'}
            </p>
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
    </div>
  );
}
