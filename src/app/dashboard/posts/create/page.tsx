import { getCategories } from '@/actions/categoryActions';
import { getTags } from '@/actions/getTags';
import CreatePostForm from '@/components/Dashboard/Blog/PostForm/CreatePostForm';
import { PageHeader } from '@/components/Dashboard/primitives';
import SkeletonLoader from '@/components/SkeletonLoader';
import { notFound } from 'next/navigation';
// app/dashboard/posts/create/page.tsx
import { Suspense } from 'react';
import {
  HiOutlineCalendarDays,
  HiOutlineDocumentText,
  HiOutlinePhoto,
  HiOutlineRocketLaunch,
  HiOutlineSparkles,
} from 'react-icons/hi2';

// Dynamic rendering is inherited from the dashboard layout (force-dynamic);
// no per-page revalidate — this is an auth-gated workspace, not ISR content.
export default async function CreatePostPage() {
  const [categoriesResult, tagsResult] = await Promise.all([
    getCategories({ limit: 100, page: 1 }),
    getTags({ limit: 100, page: 1 }),
  ]);

  if (!categoriesResult.success || !tagsResult.success) {
    return notFound();
  }

  const initialCategories = categoriesResult.data?.categories ?? [];
  const initialTags = tagsResult.data?.tags ?? [];
  const totalCategories = categoriesResult.data?.totalCount ?? 0;
  const totalTags = tagsResult.data?.totalCount ?? 0;

  // Quick-hints برای سمت راست هدر (راهنمای ۴ مرحله‌ای تحریریه)
  const hints = [
    { icon: HiOutlineDocumentText, label: 'عنوان و متن' },
    { icon: HiOutlinePhoto, label: 'تصویر شاخص' },
    { icon: HiOutlineSparkles, label: 'دسته و برچسب' },
    { icon: HiOutlineRocketLaunch, label: 'انتشار' },
  ];

  return (
    <div className="dash2-page">
      <PageHeader
        breadcrumb={[
          { label: 'داشبورد', href: '/dashboard' },
          { label: 'پست‌ها', href: '/dashboard/posts' },
          { label: 'ایجاد پست جدید' },
        ]}
        title="ایجاد پست جدید"
        description="نوشتن، تنظیم و انتشار پست جدید — هر مرحله را با دقت پر کنید"
      />

      {/* ── نوار راهنمای ۴ مرحله‌ای (process strip) ────────────────────── */}
      <div className="at-tile mb-5 overflow-hidden">
        <div
          className="flex items-stretch divide-x-2 divide-x-reverse divide-[color:var(--at-line)] overflow-x-auto"
          dir="rtl"
        >
          {hints.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="flex items-center gap-2.5 px-4 py-3 min-w-0 flex-shrink-0"
              >
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[color:var(--at-accent-soft)] text-[color:var(--at-accent)] text-xs font-black tabular-nums"
                  aria-hidden
                >
                  {idx + 1}
                </span>
                <Icon
                  className="w-4 h-4 text-[color:var(--at-fg-muted)] flex-shrink-0"
                  aria-hidden
                />
                <span className="text-xs font-semibold text-[color:var(--at-fg)] truncate">
                  {step.label}
                </span>
              </div>
            );
          })}
          <div className="hidden lg:flex items-center gap-2 px-4 py-3 me-auto border-r-2 border-r-[color:var(--at-line)]">
            <HiOutlineCalendarDays
              className="w-4 h-4 text-[color:var(--at-fg-muted)]"
              aria-hidden
            />
            <span className="text-xs font-medium text-[color:var(--at-fg-muted)]">
              امکان زمان‌بندی انتشار
            </span>
          </div>
        </div>
      </div>

      <div className="at-form" style={{ padding: 0 }}>
        <Suspense fallback={<SkeletonLoader variant="text" count={6} />}>
          <CreatePostForm
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
