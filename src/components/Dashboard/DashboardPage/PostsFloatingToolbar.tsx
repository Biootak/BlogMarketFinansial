'use client';
import FormattedDate from '@/components/FormattedDate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import { getPostLink } from '@/lib/getPostLink';
import { AnimatePresence, motion } from '@/lib/motion-shim';
import { cn } from '@/lib/utils';
import type { PostWithRelations } from '@/types/types';
import type { PostStatus } from '@prisma/client';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { type FC, memo, useCallback, useEffect, useState } from 'react';
import {
  HiArrowTopRightOnSquare,
  HiCheck,
  HiClipboard,
  type HiEye,
  HiOutlineBars3BottomLeft,
  HiOutlineBookmark,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentDuplicate,
  HiOutlineEye,
  HiOutlineHeart,
  HiOutlineLink,
  HiOutlineSparkles,
  HiOutlineStar,
  HiPencil,
  HiTrash,
  HiXMark,
} from 'react-icons/hi2';

export interface PostsFloatingToolbarProps {
  activePost: PostWithRelations | null;
  bulkSelectionCount?: number;
  onStatusChange: (id: string, newStatus: PostStatus) => Promise<boolean>;
  onDelete: (id: string) => void;
  onClose: () => void;
  onBulkDelete?: () => void;
  onBulkClear?: () => void;
  onStartSelection?: (id: string) => void;
  onToggleFeatured?: (id: string, currentFeatured: boolean) => Promise<boolean>;
  onDuplicate?: (id: string) => Promise<boolean>;
}

type StatusMeta = {
  value: PostStatus;
  label: string;
  shortLabel: string;
  icon: typeof HiEye;
  dotClass: string;
  pillClass: string;
};

const STATUS_META: Record<PostStatus, StatusMeta> = {
  PUBLISHED: {
    value: 'PUBLISHED',
    label: 'منتشر شده',
    shortLabel: 'منتشر',
    icon: HiOutlineEye,
    dotClass: 'bg-[color:var(--at-accent)]',
    pillClass: 'at-badge--published',
  },
  DRAFT: {
    value: 'DRAFT',
    label: 'پیش‌نویس',
    shortLabel: 'پیش‌نویس',
    icon: HiPencil,
    dotClass: 'bg-slate-400',
    pillClass: 'at-badge--draft',
  },
  PENDING_REVIEW: {
    value: 'PENDING_REVIEW',
    label: 'در انتظار بررسی',
    shortLabel: 'در انتظار',
    icon: HiClipboard,
    dotClass: 'bg-amber-500',
    pillClass: 'at-badge--pending',
  },
  SCHEDULED: {
    value: 'SCHEDULED',
    label: 'زمان‌بندی شده',
    shortLabel: 'زمان‌بندی',
    icon: HiOutlineClock,
    dotClass: 'bg-sky-500',
    pillClass: 'at-badge--scheduled',
  },
};

/**
 * 2026-07-05: نوار ابزار شناور جسورانه — Hero-style.
 *
 * Design language:
 *   - Container بزرگ با shadow dramatic + gradient subtle در بالا (aurora)
 *   - Thumbnail 80px با overlay وضعیت
 *   - بلاک عنوان + meta strip + KPI micro-strip
 *   - Status dropdown با ۴ گزینه + semantic colors
 *   - Featured toggle با انیمیشن
 *   - Duplicate + Copy link + Bulk select در ⋮ menu
 *   - در حالت bulk: pill تعداد + ۲ دکمه (حذف گروهی / لغو)
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
  onToggleFeatured,
  onDuplicate,
}) => {
  const { data: session } = useSession();
  const [statusLoading, setStatusLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const isAdminOrOwner = session?.user?.role === 'ADMIN' || session?.user?.role === 'OWNER';
  const isAuthor = session?.user?.role === 'AUTHOR';

  const isBulkMode = bulkSelectionCount > 0;
  const isVisible = !!activePost || isBulkMode;

  // وقتی toolbar ظاهر/مخفی میشه، به bottom nav اطلاع بده
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('posts:toolbar', { detail: { visible: isVisible } }));
  }, [isVisible]);

  const currentMeta = activePost ? STATUS_META[activePost.status] : null;
  const canEdit = activePost
    ? isAdminOrOwner || (isAuthor && session?.user?.id === activePost.authorId)
    : false;

  const handleStatusPick = useCallback(
    async (newStatus: PostStatus) => {
      if (!activePost || newStatus === activePost.status) return;
      setStatusLoading(true);
      try {
        await onStatusChange(activePost.id, newStatus);
      } finally {
        setStatusLoading(false);
      }
    },
    [activePost, onStatusChange],
  );

  const handleFeaturedToggle = useCallback(async () => {
    if (!activePost || !onToggleFeatured) return;
    setFeaturedLoading(true);
    try {
      await onToggleFeatured(activePost.id, !!activePost.isFeatured);
    } finally {
      setFeaturedLoading(false);
    }
  }, [activePost, onToggleFeatured]);

  const handleDuplicate = useCallback(async () => {
    if (!activePost || !onDuplicate) return;
    setDuplicateLoading(true);
    try {
      await onDuplicate(activePost.id);
    } finally {
      setDuplicateLoading(false);
    }
  }, [activePost, onDuplicate]);

  const handleCopyLink = useCallback(async () => {
    if (!activePost) return;
    const url = `${window.location.origin}${getPostLink(activePost.postType, activePost.slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyDone(true);
      toast({
        title: 'کپی شد',
        description: 'لینک پست در کلیپ‌بورد کپی شد.',
        variant: 'success',
      });
      setTimeout(() => setCopyDone(false), 1800);
    } catch {
      toast({
        title: 'خطا',
        description: 'کپی لینک با مشکل مواجه شد.',
        variant: 'destructive',
      });
    }
  }, [activePost]);

  const handleDeleteClick = () => {
    if (!activePost) return;
    onDelete(activePost.id);
  };

  // ── Variant classes (hairline aesthetic، بدون glass morphism) ──
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
    rose: 'bg-[color:var(--at-surface)] border-[color:var(--at-danger)] text-[color:var(--at-danger)] hover:bg-[color:var(--at-danger-soft)]',
    gold: 'bg-[color:var(--at-bg-elevated)] border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30',
    plain:
      'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line-strong)] text-[color:var(--at-fg)] hover:bg-[color:var(--at-surface-hover)]',
    iconOnly:
      'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line)] text-[color:var(--at-fg-muted)] hover:bg-[color:var(--at-surface-hover)] hover:text-[color:var(--at-fg)]',
    primary:
      'bg-[color:var(--at-accent)] border-[color:var(--at-accent)] text-[color:var(--at-accent-fg)] hover:bg-[color:var(--at-accent-fg)] hover:border-[color:var(--at-accent-fg)] hover:text-white shadow-[0_6px_18px_-8px_color-mix(in_oklch,var(--at-accent)_60%,transparent)]',
  } as const;

  const baseBtn =
    'inline-flex items-center justify-center gap-1.5 ' +
    'h-10 px-3.5 rounded-[10px] border text-xs font-semibold ' +
    'transition-[background,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[color:var(--at-bg)] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'active:scale-[0.98]';

  const iconBtn =
    'inline-flex items-center justify-center w-10 h-10 rounded-[10px] border ' +
    'transition-[background,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--at-accent)] focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-[color:var(--at-bg)] ' +
    'active:scale-[0.97]';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={isBulkMode ? 'bulk' : 'single'}
          initial={{ y: 120, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 120, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-4 sm:bottom-6 z-50 px-3 sm:px-6 pointer-events-none"
          role="toolbar"
          aria-label="نوار ابزار مدیریت پست"
        >
          <div className="max-w-6xl mx-auto pointer-events-auto">
            <motion.div
              layout
              transition={{ layout: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
              className={cn(
                'relative overflow-hidden rounded-[16px]',
                'bg-[color:var(--at-surface)]',
                'border border-[color:var(--at-line)]',
                'shadow-[0_24px_60px_-20px_oklch(0%_0_0_/_0.45),0_4px_16px_-4px_oklch(0%_0_0_/_0.18)]',
              )}
            >
              {/* خط aurora بالا (subtle gradient strip) */}
              <div
                className={cn(
                  'absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r pointer-events-none',
                  isBulkMode
                    ? 'from-transparent via-[color:var(--at-violet)] to-transparent'
                    : 'from-transparent via-[color:var(--at-accent)] to-transparent',
                )}
                aria-hidden
              />

              {/* ─── Bulk mode ─── */}
              {isBulkMode && (
                <div className="flex items-center gap-3 px-4 sm:px-6 py-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-[12px] bg-[color:var(--at-violet)] text-white flex items-center justify-center shadow-[0_8px_20px_-6px_color-mix(in_oklch,var(--at-violet)_60%,transparent)]">
                    <HiOutlineCheckCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-black text-[color:var(--at-fg)] tabular-nums">
                      {bulkSelectionCount.toLocaleString('fa-IR')} پست انتخاب شده
                    </div>
                    <div className="text-xs text-[color:var(--at-fg-subtle)] mt-0.5 truncate">
                      عملیات گروهی — روی پست‌های انتخابی اعمال می‌شود
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onBulkDelete && (
                      <button
                        type="button"
                        onClick={onBulkDelete}
                        className={cn(baseBtn, variantBtn.rose, 'h-11 px-4')}
                      >
                        <HiTrash className="w-4 h-4" />
                        <span className="hidden sm:inline">حذف گروهی</span>
                      </button>
                    )}
                    {onBulkClear && (
                      <button
                        type="button"
                        onClick={onBulkClear}
                        className={cn(iconBtn, variantBtn.iconOnly, 'h-11 w-11')}
                        aria-label="لغو انتخاب"
                        title="لغو"
                      >
                        <HiXMark className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Single mode (پست فعال) ─── */}
              {!isBulkMode && activePost && currentMeta && (
                <div className="flex flex-col sm:flex-row sm:items-stretch">
                  {/* ── Row 1 (mobile) / full layout (desktop): thumbnail + info + [desktop actions] ── */}
                  <div className="flex items-center sm:items-stretch flex-1 min-w-0 min-h-[72px] sm:min-h-[88px]">
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-16 sm:w-24 my-3 ms-3 sm:ms-5 rounded-[10px] sm:rounded-[12px] overflow-hidden bg-[color:var(--at-bg-elevated)] border border-[color:var(--at-line)]">
                      {activePost.featuredImage ? (
                        <Image
                          src={activePost.featuredImage}
                          alt={activePost.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[64px] sm:min-h-[80px] flex items-center justify-center text-[color:var(--at-fg-faint)]">
                          <HiOutlineSparkles className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                      )}
                      {activePost.isFeatured && (
                        <div className="absolute top-1 start-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-md">
                          <HiOutlineStar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* عنوان + meta + KPIs */}
                    <div className="flex-1 min-w-0 py-3 px-3 sm:px-5 flex flex-col gap-1 sm:gap-1.5 justify-center border-s border-[color:var(--at-line)]">
                      {/* meta row */}
                      <div
                        className="flex items-center gap-1.5 sm:gap-2 text-xs text-[color:var(--at-fg-subtle)] flex-wrap"
                        dir="rtl"
                      >
                        <span className={cn('at-badge text-[10px]', currentMeta.pillClass)}>
                          {currentMeta.label}
                        </span>
                        <span aria-hidden className="opacity-40">
                          ·
                        </span>
                        <span className="font-mono text-[10px] truncate max-w-[120px] sm:max-w-[180px]">
                          {activePost.postType}
                        </span>
                        <span aria-hidden className="opacity-40 hidden sm:inline">
                          ·
                        </span>
                        <span className="hidden sm:inline">
                          <FormattedDate date={activePost.createdAt} />
                        </span>
                        {activePost.readingTime != null && (
                          <>
                            <span aria-hidden className="opacity-40 hidden sm:inline">
                              ·
                            </span>
                            <span className="hidden sm:inline tabular-nums">
                              {activePost.readingTime} دقیقه
                            </span>
                          </>
                        )}
                      </div>

                      {/* عنوان */}
                      <h3
                        className="text-sm font-black text-[color:var(--at-fg)] truncate"
                        title={activePost.title}
                      >
                        {activePost.title}
                      </h3>

                      {/* KPI micro-strip — hidden on mobile to save space */}
                      <div
                        className="hidden sm:flex items-center gap-2 sm:gap-3 text-[11px] text-[color:var(--at-fg-muted)] flex-wrap"
                        dir="rtl"
                      >
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineEye className="w-3.5 h-3.5" aria-hidden />
                          <span className="tabular-nums font-bold">
                            {(activePost.viewCount ?? 0).toLocaleString('fa-IR')}
                          </span>
                          <span className="text-[color:var(--at-fg-subtle)]">بازدید</span>
                        </span>
                        <span aria-hidden className="opacity-30">
                          |
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineChatBubbleLeftRight className="w-3.5 h-3.5" aria-hidden />
                          <span className="tabular-nums font-bold">
                            {(activePost._count?.comments ?? 0).toLocaleString('fa-IR')}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineHeart className="w-3.5 h-3.5" aria-hidden />
                          <span className="tabular-nums font-bold">
                            {(activePost._count?.likes ?? 0).toLocaleString('fa-IR')}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineBookmark className="w-3.5 h-3.5" aria-hidden />
                          <span className="tabular-nums font-bold">
                            {(activePost._count?.savedBy ?? 0).toLocaleString('fa-IR')}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Desktop-only close button (top-end corner) */}
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="بستن نوار ابزار"
                      title="بستن"
                      className={cn(
                        iconBtn,
                        variantBtn.iconOnly,
                        'hidden sm:inline-flex self-center me-3 h-9 w-9',
                      )}
                    >
                      <HiXMark className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ── Row 2 (mobile) / side panel (desktop): Actions ── */}
                  <div
                    className={cn(
                      'flex items-center gap-1.5 flex-shrink-0',
                      // mobile: full-width bottom strip with top border
                      'px-3 py-2.5 border-t border-[color:var(--at-line)]',
                      // desktop: side panel with start border, no top border
                      'sm:py-3 sm:px-4 sm:border-t-0 sm:border-s sm:border-[color:var(--at-line)]',
                    )}
                    dir="rtl"
                  >
                    {/* ── Status dropdown ── */}
                    <DropdownMenu dir="rtl">
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          disabled={statusLoading}
                          className={cn(
                            baseBtn,
                            'h-9 sm:h-11 px-2.5 sm:px-3.5 text-xs sm:text-sm',
                            'bg-[color:var(--at-bg-elevated)] border-[color:var(--at-line-strong)]',
                            'hover:border-[color:var(--at-accent)] hover:text-[color:var(--at-accent-fg)]',
                            'min-w-0 sm:min-w-[130px] justify-between',
                          )}
                          aria-label="تغییر وضعیت"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                currentMeta.dotClass,
                              )}
                              aria-hidden
                            />
                            <span className="font-bold truncate">{currentMeta.shortLabel}</span>
                          </span>
                          <HiOutlineBars3BottomLeft
                            className="w-3.5 h-3.5 opacity-60 flex-shrink-0 ms-1"
                            aria-hidden
                          />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        className="w-56 rounded-[12px] border-[color:var(--at-line)] p-1.5"
                      >
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[color:var(--at-fg-subtle)] font-bold px-2.5 py-1.5">
                          تغییر وضعیت
                        </DropdownMenuLabel>
                        {Object.values(STATUS_META).map((meta) => {
                          const Icon = meta.icon;
                          const isCurrent = activePost.status === meta.value;
                          return (
                            <DropdownMenuItem
                              key={meta.value}
                              disabled={statusLoading || isCurrent}
                              onClick={() => handleStatusPick(meta.value)}
                              className={cn(
                                'flex items-center justify-between gap-2 px-2.5 py-2 text-sm rounded-[8px] cursor-pointer',
                                isCurrent
                                  ? 'bg-[color:var(--at-accent-soft)] text-[color:var(--at-accent-fg)] cursor-default'
                                  : 'text-[color:var(--at-fg)] hover:bg-[color:var(--at-surface-hover)] focus:bg-[color:var(--at-surface-hover)]',
                              )}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full flex-shrink-0',
                                    meta.dotClass,
                                  )}
                                  aria-hidden
                                />
                                <Icon className="w-4 h-4 flex-shrink-0 opacity-80" aria-hidden />
                                <span className="font-semibold">{meta.label}</span>
                              </span>
                              {isCurrent && (
                                <HiOutlineCheckCircle
                                  className="w-4 h-4 text-[color:var(--at-accent)] flex-shrink-0"
                                  aria-hidden
                                />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* ── Edit ── */}
                    <Link
                      href={`/dashboard/posts/edit/${activePost.id}`}
                      aria-label="ویرایش پست"
                      title="ویرایش"
                      className={cn(baseBtn, variantBtn.sky, 'h-9 sm:h-11 px-2.5 sm:px-3.5')}
                    >
                      <HiPencil className="w-4 h-4" />
                      <span className="hidden md:inline">ویرایش</span>
                    </Link>

                    {/* ── View (open in site) ── */}
                    <Link
                      href={getPostLink(activePost.postType, activePost.slug)}
                      target="_blank"
                      aria-label="مشاهده پست در سایت"
                      title="مشاهده در سایت"
                      className={cn(iconBtn, variantBtn.iconOnly, 'h-9 w-9 sm:h-11 sm:w-11')}
                    >
                      <HiArrowTopRightOnSquare className="w-4 h-4" />
                    </Link>

                    {/* ── ⋮ Overflow menu ── */}
                    <DropdownMenu dir="rtl">
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="عملیات بیشتر"
                          title="بیشتر"
                          className={cn(iconBtn, variantBtn.iconOnly, 'h-9 w-9 sm:h-11 sm:w-11')}
                        >
                          <HiOutlineBars3BottomLeft className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        className="w-60 rounded-[12px] border-[color:var(--at-line)] p-1.5"
                      >
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[color:var(--at-fg-subtle)] font-bold px-2.5 py-1.5">
                          عملیات بیشتر
                        </DropdownMenuLabel>

                        {/* Featured toggle */}
                        {onToggleFeatured && canEdit && (
                          <DropdownMenuItem
                            disabled={featuredLoading}
                            onClick={handleFeaturedToggle}
                            className="flex items-center justify-between gap-2 px-2.5 py-2 text-sm rounded-[8px] cursor-pointer text-[color:var(--at-fg)] focus:bg-[color:var(--at-surface-hover)]"
                          >
                            <span className="flex items-center gap-2">
                              <HiOutlineStar
                                className={cn(
                                  'w-4 h-4 flex-shrink-0',
                                  activePost.isFeatured
                                    ? 'text-amber-500 fill-current'
                                    : 'opacity-80',
                                )}
                                aria-hidden
                              />
                              <span className="font-semibold">
                                {activePost.isFeatured ? 'حذف از ویژه‌ها' : 'نشاندن به‌عنوان ویژه'}
                              </span>
                            </span>
                            {activePost.isFeatured && (
                              <HiCheck className="w-4 h-4 text-amber-500" aria-hidden />
                            )}
                          </DropdownMenuItem>
                        )}

                        {/* Duplicate */}
                        {onDuplicate && canEdit && (
                          <DropdownMenuItem
                            disabled={duplicateLoading}
                            onClick={handleDuplicate}
                            className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-[8px] cursor-pointer text-[color:var(--at-fg)] focus:bg-[color:var(--at-surface-hover)]"
                          >
                            <HiOutlineDocumentDuplicate
                              className="w-4 h-4 flex-shrink-0 opacity-80"
                              aria-hidden
                            />
                            <span className="font-semibold">
                              {duplicateLoading ? 'در حال تکرار...' : 'تکرار پست'}
                            </span>
                          </DropdownMenuItem>
                        )}

                        {/* Copy link */}
                        <DropdownMenuItem
                          onClick={handleCopyLink}
                          className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-[8px] cursor-pointer text-[color:var(--at-fg)] focus:bg-[color:var(--at-surface-hover)]"
                        >
                          <HiOutlineLink className="w-4 h-4 flex-shrink-0 opacity-80" aria-hidden />
                          <span className="font-semibold">
                            {copyDone ? 'کپی شد ✓' : 'کپی لینک پست'}
                          </span>
                        </DropdownMenuItem>

                        {/* Bulk select toggle */}
                        {onStartSelection && (
                          <>
                            <DropdownMenuSeparator className="my-1 bg-[color:var(--at-line)]" />
                            <DropdownMenuItem
                              onClick={() => onStartSelection(activePost.id)}
                              className="flex items-center gap-2 px-2.5 py-2 text-sm rounded-[8px] cursor-pointer text-[color:var(--at-violet)] focus:bg-[color:var(--at-surface-hover)]"
                            >
                              <HiOutlineCheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                              <span className="font-semibold">افزودن به انتخاب گروهی</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* ── Delete (danger) ── */}
                    <button
                      type="button"
                      onClick={handleDeleteClick}
                      aria-label="حذف پست"
                      title="حذف"
                      className={cn(iconBtn, variantBtn.rose, 'h-9 w-9 sm:h-11 sm:w-11')}
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>

                    {/* ── Close — mobile only (desktop version is in the info row) ── */}
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="بستن نوار ابزار"
                      title="بستن"
                      className={cn(iconBtn, variantBtn.iconOnly, 'sm:hidden h-9 w-9')}
                    >
                      <HiXMark className="w-4 h-4" />
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

// HiCheck لوکال برای featured toggle (در featured context استفاده می‌شود)

export default memo(PostsFloatingToolbar);
