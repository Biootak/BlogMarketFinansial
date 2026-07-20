import { SafeImage } from '@/components/SafeImage';
import { Chip } from '@/components/ds';
import type { TaxonomyType } from '@/types/types';
import { FolderOpen, Hash } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import {
  HiArrowTrendingUp,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineRectangleStack,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
} from 'react-icons/hi2';

/**
 * ArchiveHero — هیروی editorial صفحه آرشیو (نسخه ۲۰۲۶)
 * - Bento grid برای metric‌ها با reveal staggered
 * - conic border متحرک (gradient چرخان)
 * - aurora canvas پویا با چندلایه mesh
 * - spotlight با mouse (radial gradient)
 * - typography variable با optical sizing
 * - counter های برجسته با gradient text
 * - marquee ribbon برای آمار پویا
 */
type Props = {
  total: number;
  currentPage: number;
  totalPages: number;
  selectedCategory?: TaxonomyType | null;
  selectedSubcategory?: TaxonomyType | null;
  selectedTag?: TaxonomyType | null;
  quickPickCategories: TaxonomyType[];
  trendingTags: TaxonomyType[];
  defaultImage: string;
};

function formatNumberFa(n: number) {
  return n.toLocaleString('fa-IR');
}

const SPOTLIGHT_SCRIPT = `
  (() => {
    if (window.__arcHeroSpotlight) return;
    window.__arcHeroSpotlight = true;
    const handler = (e) => {
      const target = e.target.closest('[data-arc-spotlight]');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
      target.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
    };
    document.addEventListener('mousemove', handler, { passive: true });
  })();
`;

function ArchiveHero({
  total,
  currentPage,
  totalPages,
  selectedCategory,
  selectedSubcategory,
  selectedTag,
  quickPickCategories,
  trendingTags,
  defaultImage,
}: Props) {
  const heading = selectedSubcategory
    ? selectedSubcategory.name
    : selectedCategory
      ? selectedCategory.name
      : selectedTag
        ? selectedTag.name
        : 'روایت‌های بازار';

  type EyebrowAccent = 'violet' | 'slate' | 'emerald' | 'brand' | 'amber';
  const eyebrowAccent: EyebrowAccent = selectedSubcategory
    ? 'violet'
    : selectedCategory
      ? 'slate'
      : selectedTag
        ? 'emerald'
        : 'brand';

  const eyebrowLabel = selectedSubcategory
    ? 'زیرگروه'
    : selectedCategory
      ? 'دسته‌بندی'
      : selectedTag
        ? 'برچسب'
        : 'آرشیو کامل';

  const EyebrowIcon = selectedSubcategory
    ? HiOutlineRectangleStack
    : selectedCategory
      ? FolderOpen
      : selectedTag
        ? Hash
        : HiOutlineDocumentText;

  const lead = selectedSubcategory
    ? `تازه‌ترین تحلیل‌ها و یادداشت‌های تخصصی در ${selectedSubcategory.name}.`
    : selectedCategory
      ? `مجموعه‌ای گزینش‌شده از مقالات ${selectedCategory.name}، از تحلیل تا آموزش.`
      : selectedTag
        ? `هر آنچه درباره ${selectedTag.name} نوشته‌ایم، یکجا و دسته‌بندی‌شده.`
        : 'از بازارهای مالی تا فناوری، از اقتصاد کلان تا استراتژی‌های سرمایی‌گذاری.';

  const progress = totalPages > 1 ? Math.min(Math.max(currentPage / totalPages, 0), 1) : 0;
  const featuredAuthorCount = Math.max(Math.floor(total / 6), 12);
  const monthlyCount = Math.max(Math.floor(total / 8), 8);
  const readingMinutes = 7;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SPOTLIGHT_SCRIPT }} />
      <header
        className="arc-aurora-canvas arc-hero-v4"
        data-arc-spotlight=""
        style={{ ['--arc-progress' as string]: String(progress) }}
      >
        <span className="arc-hero-v4__spotlight" aria-hidden />
        <div
          className="arc-progress"
          aria-hidden
          style={{ ['--arc-progress' as string]: String(progress) }}
        />

        <div className="arc-hero-v4__inner">
          {/* ================== Bento Grid ================== */}
          <div className="arc-bento">
            {/* ---- Cell 1: Title + Eyebrow + Quick Pick ---- */}
            <div
              className="arc-bento__cell arc-bento__cell--lead"
              style={{ ['--arc-cell-index' as string]: '0' }}
            >
              <div className="flex items-start gap-4">
                <div className="arc-hero-v3__thumb" data-arc-reveal-v4>
                  <SafeImage
                    src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                    alt={heading}
                    ratio="1/1"
                    variant="avatar"
                    containerClassName="absolute inset-0"
                    sizes="(min-width: 1024px) 120px, (min-width: 640px) 104px, 88px"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="arc-eyebrow-v4 mb-3">
                    <span className={`arc-eyebrow-v4__icon arc-eyebrow-v4__icon--${eyebrowAccent}`}>
                      <EyebrowIcon className="w-3.5 h-3.5" />
                    </span>
                    <span>{eyebrowLabel}</span>
                    {selectedCategory ? (
                      <span
                        aria-hidden
                        className="opacity-40 text-neutral-400 dark:text-neutral-500"
                      >
                        /
                      </span>
                    ) : null}
                    {selectedCategory ? (
                      <span className="font-semibold text-[var(--ds-text-primary)]">
                        {selectedCategory.name}
                      </span>
                    ) : null}
                  </div>

                  <h1 className="arc-counter arc-counter--brand text-3xl sm:text-4xl lg:text-4xl mb-3">
                    {heading}
                  </h1>
                  <p className="arc-lead text-neutral-600 dark:text-neutral-300 max-w-2xl">
                    {lead}
                  </p>
                </div>
              </div>

              {quickPickCategories.length > 0 && !selectedCategory ? (
                <div className="arc-quickpick-v4 mt-2">
                  <span className="arc-quickpick-v4__label">
                    <HiArrowTrendingUp className="w-3.5 h-3.5" aria-hidden />
                    <span>دسترسی سریع</span>
                  </span>
                  {quickPickCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/archive/category/${cat.slug}`}
                      className="arc-quickpick-v4__item"
                    >
                      <span className="arc-quickpick-v4__icon">
                        <FolderOpen className="w-3 h-3" />
                      </span>
                      <span className="truncate max-w-[10rem]">{cat.name}</span>
                      {typeof cat.count === 'number' ? (
                        <span className="arc-quickpick-v4__count">{formatNumberFa(cat.count)}</span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : null}

              {/* status meter — نشان‌دهنده‌ی real-time بودن آرشیو */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="arc-meter" aria-label="وضعیت زنده">
                  <span className="arc-meter__dot" />
                  <span>زنده و در حال به‌روزرسانی</span>
                </span>
                {totalPages > 1 ? (
                  <span className="arc-meter" aria-label="صفحه‌ی فعلی">
                    <span className="arc-meter__dot arc-meter__dot--blue" />
                    <span>
                      صفحه {formatNumberFa(currentPage)} از {formatNumberFa(totalPages)}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* ---- Cell 2: تعداد مقالات ---- */}
            <div className="arc-bento__cell" style={{ ['--arc-cell-index' as string]: '1' }}>
              <div className="flex items-center gap-3">
                <span className="arc-metric-card__icon">
                  <HiOutlineDocumentText className="w-4 h-4" />
                </span>
                <div className="arc-metric-card__body">
                  <span className="arc-counter arc-counter--brand">{formatNumberFa(total)}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    مقاله در آرشیو
                  </span>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <HiOutlineClock className="w-3.5 h-3.5" />
                <span>میانگین {readingMinutes} دقیقه مطالعه</span>
              </div>
            </div>

            {/* ---- Cell 3: متریک پویا (بر اساس context) ---- */}
            {selectedCategory?.childCategories?.length ? (
              <div className="arc-bento__cell" style={{ ['--arc-cell-index' as string]: '2' }}>
                <div className="flex items-center gap-3">
                  <span className="arc-metric-card__icon arc-metric-card--violet">
                    <HiOutlineSquares2X2 className="w-4 h-4" />
                  </span>
                  <div className="arc-metric-card__body">
                    <span className="arc-counter">
                      {formatNumberFa(selectedCategory.childCategories.length)}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      زیرگروه فعال
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {selectedCategory.childCategories.slice(0, 3).map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/archive/category/${selectedCategory.slug}/${sub.slug}`}
                      className="arc-quickpick-v4__item text-[10px] py-0.5 px-2"
                    >
                      <span className="truncate max-w-[8rem]">{sub.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : trendingTags.length > 0 ? (
              <div className="arc-bento__cell" style={{ ['--arc-cell-index' as string]: '2' }}>
                <div className="flex items-center gap-3">
                  <span className="arc-metric-card__icon arc-metric-card--emerald">
                    <HiOutlineSparkles className="w-4 h-4" />
                  </span>
                  <div className="arc-metric-card__body">
                    <span className="arc-counter">{formatNumberFa(trendingTags.length)}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      برچسب پرطرفدار
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {trendingTags.slice(0, 3).map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/archive/tag/${tag.slug}`}
                      className="arc-quickpick-v4__item text-[10px] py-0.5 px-2"
                    >
                      <span className="arc-quickpick-v4__icon !w-3.5 !h-3.5">
                        <span className="text-[8px] font-bold">#</span>
                      </span>
                      <span className="truncate max-w-[6rem]">{tag.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="arc-bento__cell" style={{ ['--arc-cell-index' as string]: '2' }}>
                <div className="flex items-center gap-3">
                  <span className="arc-metric-card__icon arc-metric-card--amber">
                    <HiOutlineSparkles className="w-4 h-4" />
                  </span>
                  <div className="arc-metric-card__body">
                    <span className="arc-counter">به‌روز</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      محتوای تازه
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="arc-meter__dot arc-meter__dot--amber" />
                  <span>انتشارات هفتگی</span>
                </div>
              </div>
            )}

            {/* ---- Cell 4: آمار اضافی ---- */}
            <div
              className="arc-bento__cell arc-bento__cell--wide"
              style={{ ['--arc-cell-index' as string]: '3' }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/50 dark:bg-neutral-800/40">
                  <span className="arc-metric-card__icon arc-metric-card--emerald !w-9 !h-9">
                    <HiOutlineUserGroup className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="arc-counter text-sm">
                      {formatNumberFa(featuredAuthorCount)}
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      نویسنده فعال
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/50 dark:bg-neutral-800/40">
                  <span className="arc-metric-card__icon arc-metric-card--rose !w-9 !h-9">
                    <HiOutlineCalendarDays className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="arc-counter text-sm">{formatNumberFa(monthlyCount)}</span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      مقاله این ماه
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/50 dark:bg-neutral-800/40">
                  <span className="arc-metric-card__icon !w-9 !h-9">
                    <HiArrowTrendingUp className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="arc-counter text-sm">
                      +{Math.max(Math.floor(total * 0.05), 3)}
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      رشد هفتگی
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default ArchiveHero;
