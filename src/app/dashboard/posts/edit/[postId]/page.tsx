import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import { getPostById } from '@/actions/postActions';
import EditPostForm from '@/components/Dashboard/Blog/PostForm/EditPostForm';
import PostStatusBadge from '@/components/Dashboard/Blog/PostStatusBadge';
import { PageHeader } from '@/components/Dashboard/primitives';
import FormattedDate from '@/components/FormattedDate';
import SkeletonLoader from '@/components/SkeletonLoader';
import Link from 'next/link';
import { notFound } from 'next/navigation';
// app/dashboard/posts/edit/[postId]/page.tsx
import { Suspense } from 'react';
import {
  HiOutlineBookmark,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlineHeart,
} from 'react-icons/hi2';

interface EditPostPageProps {
  params: Promise<{
    postId: string;
  }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { postId } = await params;
  const [postResult, categoriesResult, tagsResult] = await Promise.all([
    getPostById(postId),
    getCategories({ limit: 100, page: 1 }),
    getTags({ limit: 100, page: 1 }),
  ]);

  if (!postResult.success || !postResult.data || !categoriesResult.success || !tagsResult.success) {
    return notFound();
  }

  const initialCategories = categoriesResult.data?.categories ?? [];
  const initialTags = tagsResult.data?.tags ?? [];
  const totalCategories = categoriesResult.data?.totalCount ?? 0;
  const totalTags = tagsResult.data?.totalCount ?? 0;

  const post = postResult.data;
  const counts = post._count;

  // KPI strip برای هدر — ۴ عدد فشرده، فونت بولد، تقسیم‌شده با divider عمودی
  const stats: Array<{
    icon: typeof HiOutlineEye;
    value: number | string;
    label: string;
    tone?: string;
  }> = [
    { icon: HiOutlineEye, value: (post.viewCount ?? 0).toLocaleString('fa-IR'), label: 'بازدید' },
    { icon: HiOutlineHeart, value: counts?.likes ?? 0, label: 'پسند' },
    { icon: HiOutlineChatBubbleLeftRight, value: counts?.comments ?? 0, label: 'دیدگاه' },
    { icon: HiOutlineBookmark, value: counts?.savedBy ?? 0, label: 'نشان‌شده' },
  ];

  return (
    <div className="dash2-page">
      <PageHeader
        variant="strip"
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'پست‌ها', href: '/dashboard/posts' },
          { label: 'ویرایش پست' },
        ]}
        title={post.title || 'بدون عنوان'}
        description="ویرایش محتوای پست موجود"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PostStatusBadge status={post.status} />
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="at-btn at-btn--secondary at-btn--sm"
            >
              <HiOutlineEye className="w-3.5 h-3.5" />
              <span>مشاهده</span>
            </Link>
          </div>
        }
      />

      {/* ── نوار KPI پست (بالای فرم، مستقیم زیر هدر) ───────────────── */}
      <div className="at-tile mb-5">
        <div
          className="grid grid-cols-2 lg:grid-cols-4 sm:divide-x-2 sm:divide-x-reverse divide-[color:var(--at-line)]"
          dir="rtl"
        >
          {stats.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
              <span
                className="flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center bg-[color:var(--at-accent-soft)] text-[color:var(--at-accent)]"
                aria-hidden
              >
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-base sm:text-lg font-black tabular-nums text-[color:var(--at-fg)] leading-none truncate">
                  {value}
                </p>
                <p className="text-[11px] text-[color:var(--at-fg-subtle)] mt-0.5 truncate">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>
        {/* meta footer — تاریخ ایجاد + آخرین ویرایش + زمان مطالعه */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-t border-[color:var(--at-line)] text-xs text-[color:var(--at-fg-subtle)] flex-wrap"
          dir="rtl"
        >
          <span className="inline-flex items-center gap-1.5">
            <HiOutlineClock className="w-3.5 h-3.5" aria-hidden />
            <span>ایجاد:</span>
            <FormattedDate date={post.createdAt} />
          </span>
          <span aria-hidden className="opacity-40">
            |
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span>آخرین ویرایش:</span>
            <FormattedDate date={post.updatedAt} />
          </span>
          {post.readingTime != null && (
            <>
              <span aria-hidden className="opacity-40">
                |
              </span>
              <span>{post.readingTime.toLocaleString('fa-IR')} دقیقه مطالعه</span>
            </>
          )}
        </div>
      </div>

      <div className="at-form" style={{ padding: 0 }}>
        <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
          <EditPostForm
            initialData={post}
            initialCategories={initialCategories}
            initialTags={initialTags}
            totalCategories={totalCategories}
            totalTags={totalTags}
          />
        </Suspense>
      </div>
    </div>
  );
}
