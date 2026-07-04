'use client';

import { type FC, memo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from '@/lib/motion-shim';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  HiPencil,
  HiTrash,
  HiEye,
  HiEyeSlash,
  HiClipboard,
  HiXMark,
  HiArrowTopRightOnSquare,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import type { PostStatus } from '@prisma/client';
import type { PostWithRelations } from '@/types/types';
import { getPostLink } from '@/lib/getPostLink';
import PostStatusBadge from '@/components/Dashboard/Blog/PostStatusBadge';

/** لیست action‌های قابل نمایش در toolbar */
export type ToolbarAction = 'view' | 'edit' | 'change_status' | 'delete' | 'select';

export interface PostsFloatingToolbarProps {
  /** پست فعال — اگه null باشه toolbar نشون داده نمیشه (مگه در حالت bulk) */
  activePost: PostWithRelations | null;
  /** آیا در حالت bulk actions هستیم؟ */
  bulkSelectionCount?: number;
  /** callback برای تغییر وضعیت پست فعال */
  onStatusChange: (id: string, newStatus: PostStatus) => Promise<boolean>;
  /** callback برای حذف پست فعال */
  onDelete: (id: string) => void;
  /** callback برای لغو فعال‌سازی */
  onClose: () => void;
  /** callback برای حذف گروهی */
  onBulkDelete?: () => void;
  /** callback برای لغو انتخاب گروهی */
  onBulkClear?: () => void;
  /** callback برای شروع حالت انتخاب (از پست فعلی) */
  onStartSelection?: (id: string) => void;
}

type StatusActionConfig = {
  icon: typeof HiEye;
  label: string;
  /** کلاس CSS — از token های atelier استفاده می‌کنه */
  variant: 'emerald' | 'amber' | 'sky' | 'slate';
};

/**
 * نوار ابزار شناور مدیریت پست‌ها — الهام گرفته از Atelier Deck (طراحی hairline، emerald-first).
 *
 * Design language:
 *   - از `at-tile` به عنوان container (hairline borders + ملایم shadow)
 *   - از `at-head__btn` و variant هاش برای action‌ها (مثل Service Requests)
 *   - رنگ‌بندی semantic از atelier tokens: emerald (publish), amber (review),
 *     sky (submit), slate (draft), rose (delete), violet (select)
 *   - بدون glass morphism، بدون gradient border، فقط border ساده + shadow ظریف
 *   - layout فارسی (RTL-friendly با logical properties)
 *
 * حالت‌ها:
 *   - Single (پست فعال): thumbnail + title + status badge + ۵ دکمه action
 *   - Bulk (multi-select): تعداد + دکمه حذف گروهی + لغو
 */
const PostsFloatingToolbar: FC<PostsFloatingToolbarProps> = ({
  activePost,
  bulkSelectionCount = 0,
  onStatusChange,
  onDelete,
  onClose,
  onBulkDelete,
  onBulkClear,
  onStartSelection,
}) => {
  const { data: session } = useSession();
  const [statusLoading, setStatusLoading] = useState(false);

  const isAdminOrOwner =
    session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';
  const isAuthor = session?.user?.role === 'AUTHOR';

  const isBulkMode = bulkSelectionCount > 0;
  const isVisible = !!activePost || isBulkMode;

  /** تعیین action تغییر وضعیت بر اساس نقش و وضعیت فعلی */
  const getStatusAction = (): StatusActionConfig | null => {
    if (!activePost) return null;

    if (isAdminOrOwner) {
      if (activePost.status === 'PUBLISHED') {
        return { icon: HiEyeSlash, label: 'بررسی مجدد', variant: 'amber' };
      }
      return { icon: HiEye, label: 'انتشار', variant: 'emerald' };
    }

    if (isAuthor) {
      if (activePost.status === 'DRAFT') {
        return { icon: HiClipboard, label: 'ارسال برای بررسی', variant: 'sky' };
      }
      return { icon: HiPencil, label: 'بازگشت به پیش‌نویس', variant: 'slate' };
    }

    return null;
  };

  const statusAction = getStatusAction();

  const handleStatusClick = async () => {
    if (!activePost || !statusAction) return;
    setStatusLoading(true);
    try {
      const ok = await onStatusChange(activePost.id, statusAction.label === 'انتشار' ? 'PUBLISHED' : statusAction.label === 'بررسی مجدد' ? 'PENDING_REVIEW' : statusAction.label === 'ارسال برای بررسی' ? 'PENDING_REVIEW' : 'DRAFT');
      if (ok) onClose();
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!activePost) return;
    onDelete(activePost.id);
  };

  // Variant classes — atelier-aligned (hairline aesthetic, no heavy shadows)
  const variantBtn = {
    emerald:
      'bg-[color:var(--at-accent)] border-[color:var(--at-accent)] text-white hover:bg-[color:var(--at-accent-fg)] hover:border-[color:var(--at-accent-fg)]',
    amber:
      'bg-[color:var(--at-warning)] border-[color:var(--at-warning)] text-white hover:opacity-90',
    sky: 'bg-[color:var(--at-info)] border-[color:var(--at-info)] text-white hover:opacity-90',
    slate:
      'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line-strong)] text-[color:var(--at-fg)] hover:bg-[color:var(--at-surface-hover)]',
    violet:
      'bg-[color:var(--at-violet)] border-[color:var(--at-violet)] text-white hover:opacity-90',
    rose:
      'bg-[color:var(--at-surface)] border-[color:var(--at-danger)] text-[color:var(--at-danger)] hover:bg-[color:var(--at-danger-soft)]',
    plain:
      'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line-strong)] text-[color:var(--at-fg)] hover:bg-[color:var(--at-surface-hover)]',
    iconOnly:
      'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line)] text-[color:var(--at-fg-muted)] hover:bg-[color:var(--at-surface-hover)]',
  } as const;

  const baseBtn =
    'inline-flex items-center justify-center gap-1.5 ' +
    'h-10 px-3.5 rounded-[10px] border text-xs font-semibold ' +
    'transition-[background,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[color:var(--at-bg)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'active:scale-[0.98]';

  const iconBtn =
    'inline-flex items-center justify-center w-10 h-10 rounded-[10px] border ' +
    'transition-[background,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[color:var(--at-bg)] ' +
    'active:scale-[0.98]';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={isBulkMode ? 'bulk' : 'single'}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-6 z-50 px-4 sm:px-6 pointer-events-none"
          role="toolbar"
          aria-label="نوار ابزار مدیریت پست"
        >
          <div className="max-w-5xl mx-auto pointer-events-auto">
            {/* ─── at-tile container: hairline border + subtle shadow ─── */}
            <motion.div
              layout
              className={cn(
                'at-tile relative',
                'shadow-[var(--at-shadow-hover)]',
              )}
            >
              {/* ─── حالت bulk (multi-select) ─── */}
              {isBulkMode && (
                <div className="flex items-center gap-3 px-5 py-4">
                  {/* آیکون سمت چپ (با logical properties RTL-friendly) */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-[10px] bg-[color:var(--at-violet)] text-white flex items-center justify-center">
                    <HiOutlineSparkles className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-[color:var(--at-fg)]">
                      {bulkSelectionCount.toLocaleString('fa-IR')} پست انتخاب شده
                    </div>
                    <div className="text-xs text-[color:var(--at-fg-subtle)] mt-0.5">
                      عملیات گروهی روی پست‌های انتخابی
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onBulkDelete && (
                      <button
                        type="button"
                        onClick={onBulkDelete}
                        className={cn(baseBtn, variantBtn.rose)}
                      >
                        <HiTrash className="w-4 h-4" />
                        <span className="hidden sm:inline">حذف گروهی</span>
                      </button>
                    )}

                    {onBulkClear && (
                      <button
                        type="button"
                        onClick={onBulkClear}
                        className={cn(iconBtn, variantBtn.iconOnly)}
                        aria-label="لغو انتخاب"
                        title="لغو"
                      >
                        <HiXMark className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── حالت single (پست فعال) ─── */}
              {!isBulkMode && activePost && (
                <div className="flex items-stretch">
                  {/* Thumbnail (hairline border) */}
                  <div className="relative flex-shrink-0 w-16 sm:w-20 m-3 rounded-[10px] overflow-hidden bg-[color:var(--at-bg-elevated)] border border-[color:var(--at-line)]">
                    {activePost.featuredImage ? (
                      <Image
                        src={activePost.featuredImage}
                        alt={activePost.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full min-h-[80px] flex items-center justify-center text-[color:var(--at-fg-faint)]">
                        <HiOutlineSparkles className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* عنوان + meta (با border سمت چپ مثل at-posts__feature) */}
                  <div className="flex-1 min-w-0 py-3 pe-5 border-s border-[color:var(--at-line)]">
                    <div className="flex items-center gap-2 mb-1">
                      <PostStatusBadge status={activePost.status} />
                      <span className="text-xs text-[color:var(--at-fg-subtle)] truncate">
                        {activePost.postType}
                      </span>
                    </div>
                    <div
                      className="text-sm font-bold text-[color:var(--at-fg)] truncate"
                      title={activePost.title}
                    >
                      {activePost.title}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 py-3 ps-5 border-s border-[color:var(--at-line)]">
                    {/* تغییر وضعیت (دکمه اصلی، پررنگ) */}
                    {statusAction && (
                      <button
                        type="button"
                        onClick={handleStatusClick}
                        disabled={statusLoading}
                        aria-label={statusAction.label}
                        title={statusAction.label}
                        className={cn(
                          baseBtn,
                          variantBtn[statusAction.variant],
                        )}
                      >
                        <statusAction.icon className="w-4 h-4" />
                        <span className="hidden md:inline">{statusAction.label}</span>
                      </button>
                    )}

                    {/* مشاهده */}
                    <Link
                      href={getPostLink(activePost.postType, activePost.slug)}
                      target="_blank"
                      aria-label="مشاهده پست در سایت"
                      title="مشاهده"
                      className={cn(iconBtn, variantBtn.iconOnly)}
                    >
                      <HiArrowTopRightOnSquare className="w-4 h-4" />
                    </Link>

                    {/* ویرایش */}
                    <Link
                      href={`/dashboard/posts/edit/${activePost.id}`}
                      aria-label="ویرایش پست"
                      title="ویرایش"
                      className={cn(baseBtn, variantBtn.sky)}
                    >
                      <HiPencil className="w-4 h-4" />
                      <span className="hidden md:inline">ویرایش</span>
                    </Link>

                    {/* شروع انتخاب گروهی (violet accent) */}
                    {onStartSelection && (
                      <button
                        type="button"
                        onClick={() => onStartSelection(activePost.id)}
                        aria-label="افزودن به انتخاب گروهی"
                        title="انتخاب گروهی"
                        className={cn(iconBtn, variantBtn.violet)}
                      >
                        <HiOutlineCheckCircle className="w-4 h-4" />
                      </button>
                    )}

                    {/* حذف (danger outline) */}
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      aria-label="حذف پست"
                      title="حذف"
                      className={cn(iconBtn, variantBtn.rose)}
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>

                    {/* بستن (subtle) */}
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="بستن نوار ابزار"
                      title="بستن"
                      className={cn(iconBtn, variantBtn.iconOnly)}
                    >
                      <HiXMark className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default memo(PostsFloatingToolbar);
