import type { TaxonomyType } from '@/types/types';
import { FolderOpen, Hash } from 'lucide-react';
import Image from 'next/image';
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
 * ArchiveHero — هیرو اصلی صفحه آرشیو (v3)
 * ----------------------------------------------------------------------------
 * - layout Bento برای چیدمان متریک‌ها
 * - typography بالانس و حرفه‌ای
 * - conic-ring دور thumbnail
 * - progress bar بالای هیرو
 * - server component (بدون client JS)
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

export default function ArchiveHero({
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

  const eyebrow = selectedSubcategory
    ? {
        icon: HiOutlineRectangleStack,
        variant: '--violet' as const,
        label: 'زیرگروه',
      }
    : selectedCategory
      ? {
          icon: FolderOpen,
          variant: '' as const,
          label: 'دسته‌بندی',
        }
      : selectedTag
        ? {
            icon: Hash,
            variant: '--emerald' as const,
            label: 'برچسب',
          }
        : {
            icon: HiOutlineDocumentText,
            variant: '--slate' as const,
            label: 'آرشیو کامل',
          };

  const lead = selectedSubcategory
    ? `تازه‌ترین تحلیل‌ها و یادداشت‌های تخصصی در ${selectedSubcategory.name}.`
    : selectedCategory
      ? `مجموعه‌ای گزینش‌شده از مقالات ${selectedCategory.name}، از تحلیل تا آموزش.`
      : selectedTag
        ? `هر آنچه درباره ${selectedTag.name} نوشته‌ایم، یکجا و دسته‌بندی‌شده.`
        : 'از بازارهای مالی تا فناوری، از اقتصاد کلان تا استراتژی‌های سرمایه‌گذاری.';

  const EyebrowIcon = eyebrow.icon;

  return (
    <header className="arc-hero-v3">
      {(() => {
        // progress = 0..1 — چند درصد آرشیو رو تا این صفحه دیدی
        const progress = totalPages > 1 ? Math.min(Math.max(currentPage / totalPages, 0), 1) : 0;
        return (
          <div
            className="arc-progress"
            aria-hidden
            style={{ ['--arc-progress' as string]: String(progress) }}
          />
        );
      })()}
      <span className="arc-hero-v2__orb arc-hero-v2__orb--a" aria-hidden />
      <span className="arc-hero-v2__orb arc-hero-v2__orb--b" aria-hidden />
      <div className="arc-mesh-bg" aria-hidden>
        <div className="arc-mesh-dots" />
      </div>

      <div className="arc-hero-v3__inner">
        <div className="arc-hero-v3__head">
          <div className="arc-thumb-ring justify-self-center md:justify-self-start">
            <div className="arc-hero-v3__thumb">
              <Image
                src={selectedCategory?.thumbnail || selectedTag?.thumbnail || defaultImage}
                alt={heading}
                fill
                sizes="(min-width: 1024px) 120px, (min-width: 640px) 104px, 88px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="text-center md:text-start">
            <div className="arc-eyebrow-v3">
              <span
                className={`arc-eyebrow-v3__icon${eyebrow.variant ? ` ${eyebrow.variant}` : ''}`}
                aria-hidden
              >
                <EyebrowIcon className="w-3.5 h-3.5" />
              </span>
              <span>{eyebrow.label}</span>
              {selectedCategory ? (
                <span className="text-neutral-400 dark:text-neutral-500 mx-0.5">/</span>
              ) : null}
              {selectedCategory ? (
                <span className="text-neutral-600 dark:text-neutral-300">
                  {selectedCategory.name}
                </span>
              ) : null}
            </div>

            <h1 className="arc-title text-neutral-900 dark:text-white mt-3 sm:mt-4">{heading}</h1>

            <p className="arc-lead text-neutral-600 dark:text-neutral-300 mt-2 sm:mt-3 max-w-2xl mx-auto md:mx-0">
              {lead}
            </p>

            {quickPickCategories.length > 0 && !selectedCategory ? (
              <div className="arc-quickpick-v3 mt-4 sm:mt-5 justify-center md:justify-start">
                <span className="arc-quickpick-v3__label">
                  <HiArrowTrendingUp className="w-3.5 h-3.5" aria-hidden />
                  <span>دسترسی سریع</span>
                </span>
                {quickPickCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/archive/category/${cat.slug}`}
                    className="arc-suggestion"
                  >
                    <span className="arc-suggestion__icon">
                      <FolderOpen className="w-3 h-3" />
                    </span>
                    <span className="truncate max-w-[10rem]">{cat.name}</span>
                    {typeof cat.count === 'number' ? (
                      <span className="arc-suggestion__count">{formatNumberFa(cat.count)}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="arc-bento-grid">
          <div className="arc-metric-card">
            <span className="arc-metric-card__icon" aria-hidden>
              <HiOutlineDocumentText className="w-4 h-4" />
            </span>
            <span className="arc-metric-card__body">
              <span className="arc-metric-card__num">{formatNumberFa(total)}</span>
              <span className="arc-metric-card__label">مقاله در آرشیو</span>
            </span>
          </div>

          {selectedCategory?.childCategories?.length ? (
            <div className="arc-metric-card">
              <span className="arc-metric-card__icon arc-metric-card--violet" aria-hidden>
                <HiOutlineSquares2X2 className="w-4 h-4" />
              </span>
              <span className="arc-metric-card__body">
                <span className="arc-metric-card__num">
                  {formatNumberFa(selectedCategory.childCategories.length)}
                </span>
                <span className="arc-metric-card__label">زیرگروه فعال</span>
              </span>
            </div>
          ) : trendingTags.length > 0 ? (
            <div className="arc-metric-card">
              <span className="arc-metric-card__icon arc-metric-card--emerald" aria-hidden>
                <HiOutlineSparkles className="w-4 h-4" />
              </span>
              <span className="arc-metric-card__body">
                <span className="arc-metric-card__num">{formatNumberFa(trendingTags.length)}</span>
                <span className="arc-metric-card__label">برچسب پرطرفدار</span>
              </span>
            </div>
          ) : (
            <div className="arc-metric-card">
              <span className="arc-metric-card__icon arc-metric-card--amber" aria-hidden>
                <HiOutlineSparkles className="w-4 h-4" />
              </span>
              <span className="arc-metric-card__body">
                <span className="arc-metric-card__num">به‌روز</span>
                <span className="arc-metric-card__label">محتوای تازه</span>
              </span>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="arc-metric-card">
              <span className="arc-metric-card__icon arc-metric-card--amber" aria-hidden>
                <HiArrowTrendingUp className="w-4 h-4" />
              </span>
              <span className="arc-metric-card__body">
                <span className="arc-metric-card__num">
                  {formatNumberFa(currentPage)}
                  <span className="opacity-50 text-sm mx-0.5">/</span>
                  {formatNumberFa(totalPages)}
                </span>
                <span className="arc-metric-card__label">صفحه‌ی فعلی</span>
              </span>
            </div>
          ) : (
            <div className="arc-metric-card">
              <span className="arc-metric-card__icon arc-metric-card--rose" aria-hidden>
                <HiOutlineCalendarDays className="w-4 h-4" />
              </span>
              <span className="arc-metric-card__body">
                <span className="arc-metric-card__num">امروز</span>
                <span className="arc-metric-card__label">آخرین به‌روزرسانی</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
