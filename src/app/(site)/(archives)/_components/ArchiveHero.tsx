import { Chip } from '@/components/ds';
import { SafeImage } from '@/components/SafeImage';
import type { TaxonomyType } from '@/types/types';
import { FolderOpen, Hash } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import {
  HiArrowTrendingUp,
  HiOutlineCalendarDays,
  HiOutlineDocumentText,
  HiOutlineRectangleStack,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
} from 'react-icons/hi2';

/**
 * ArchiveHero — هیروی editorial صفحه آرشیو
 * - Bento grid برای metric‌ها
 * - conic ring دور thumbnail
 * - progress bar (currentPage / totalPages)
 * - quick-pick chips فقط در حالت default
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
        : 'گنجینه مقالات';

  const eyebrowAccent: 'violet' | 'slate' | 'emerald' | 'brand' = selectedSubcategory
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
        : 'از بازارهای مالی تا فناوری، از اقتصاد کلان تا استراتژی‌های سرمایه‌گذاری.';

  const progress = totalPages > 1 ? Math.min(Math.max(currentPage / totalPages, 0), 1) : 0;

  return (
    <header className="archive-hero">
      <div
        className="archive-hero__progress"
        aria-hidden
        style={{ ['--archive-progress' as string]: String(progress) }}
      />
      <span className="archive-hero__orb archive-hero__orb--a" aria-hidden />
      <span className="archive-hero__orb archive-hero__orb--b" aria-hidden />
      <div className="archive-hero__mesh" aria-hidden>
        <div className="archive-hero__mesh-dots" />
      </div>

      <div className="archive-hero__inner">
        <div className="archive-hero__head">
          <div className="archive-hero__thumb-ring">
            <div className="archive-hero__thumb">
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
          </div>

          <div className="archive-hero__copy">
            <div className="archive-hero__eyebrow">
              <Chip accent={eyebrowAccent} icon={<EyebrowIcon className="w-3.5 h-3.5" />}>
                {eyebrowLabel}
              </Chip>
              {selectedCategory ? (
                <span className="archive-hero__breadcrumb">
                  <span aria-hidden className="opacity-50">/</span>
                  <span>{selectedCategory.name}</span>
                </span>
              ) : null}
            </div>

            <h1 className="archive-hero__title">{heading}</h1>
            <p className="archive-hero__lead">{lead}</p>

            {quickPickCategories.length > 0 && !selectedCategory ? (
              <div className="archive-quickpick">
                <span className="archive-quickpick__label">
                  <HiArrowTrendingUp className="w-3.5 h-3.5" aria-hidden />
                  <span>دسترسی سریع</span>
                </span>
                {quickPickCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/archive/category/${cat.slug}`}
                    className="ds-suggestion"
                  >
                    <span className="ds-suggestion__icon">
                      <FolderOpen className="w-3 h-3" />
                    </span>
                    <span className="truncate max-w-[10rem]">{cat.name}</span>
                    {typeof cat.count === 'number' ? (
                      <span className="ds-suggestion__count">{formatNumberFa(cat.count)}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="archive-bento">
          <div className="ds-metric">
            <span className="ds-metric__icon" aria-hidden>
              <HiOutlineDocumentText className="w-4 h-4" />
            </span>
            <span className="ds-metric__body">
              <span className="ds-metric__num">{formatNumberFa(total)}</span>
              <span className="ds-metric__label">مقاله در آرشیو</span>
            </span>
          </div>

          {selectedCategory?.childCategories?.length ? (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--violet" aria-hidden>
                <HiOutlineSquares2X2 className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">
                  {formatNumberFa(selectedCategory.childCategories.length)}
                </span>
                <span className="ds-metric__label">زیرگروه فعال</span>
              </span>
            </div>
          ) : trendingTags.length > 0 ? (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--emerald" aria-hidden>
                <HiOutlineSparkles className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">{formatNumberFa(trendingTags.length)}</span>
                <span className="ds-metric__label">برچسب پرطرفدار</span>
              </span>
            </div>
          ) : (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--amber" aria-hidden>
                <HiOutlineSparkles className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">به‌روز</span>
                <span className="ds-metric__label">محتوای تازه</span>
              </span>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--amber" aria-hidden>
                <HiArrowTrendingUp className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">
                  {formatNumberFa(currentPage)}
                  <span className="opacity-50 text-sm mx-0.5">/</span>
                  {formatNumberFa(totalPages)}
                </span>
                <span className="ds-metric__label">صفحه‌ی فعلی</span>
              </span>
            </div>
          ) : (
            <div className="ds-metric">
              <span className="ds-metric__icon ds-metric__icon--rose" aria-hidden>
                <HiOutlineCalendarDays className="w-4 h-4" />
              </span>
              <span className="ds-metric__body">
                <span className="ds-metric__num">امروز</span>
                <span className="ds-metric__label">آخرین به‌روزرسانی</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default ArchiveHero;
