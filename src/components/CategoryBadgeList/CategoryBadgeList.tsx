import Badge from '@/components/Badge/Badge';
import type { TwMainColor } from '@/types/types';
import type { Category } from '@prisma/client';
import type React from 'react';
import { useMemo } from 'react';

export interface CategoryBadgeListProps {
  className?: string;
  itemClass?: string;
  categories: Category[];
  disableLinks?: boolean;
  /** حداکثر تعداد badge که نمایش داده می‌شه. بقیه جمع می‌شن توی یک +N */
  maxVisible?: number;
}

const CategoryBadgeList: React.FC<CategoryBadgeListProps> = ({
  className = 'flex flex-wrap',
  itemClass,
  categories,
  disableLinks = false,
  maxVisible = 4,
}) => {
  const colors: TwMainColor[] = [
    'pink',
    'blue',
    'green',
    'yellow',
    'red',
    'purple',
    'indigo',
    'gray',
  ];

  const { visible, hiddenCount } = useMemo(() => {
    const safe = Array.isArray(categories) ? categories : [];
    return {
      visible: safe.slice(0, maxVisible),
      hiddenCount: Math.max(0, safe.length - maxVisible),
    };
  }, [categories, maxVisible]);

  const categoryColors = useMemo(() => {
    return visible.reduce(
      (acc, category, index) => {
        acc[category.id] = colors[index % colors.length];
        return acc;
      },
      {} as Record<string, TwMainColor>,
    );
  }, [visible]);

  return (
    <div className={`nc-CategoryBadgeList ${className}`} data-nc-id="CategoryBadgeList">
      {visible.map((category) => (
        <Badge
          key={category.id}
          className={`${itemClass} text-[10px]/[14px] px-3 py-1  m-1`}
          name={category.name}
          color={categoryColors[category.id]}
          href={disableLinks ? undefined : `/archive/category/${category.slug}`}
          isLink={!disableLinks}
        />
      ))}
      {hiddenCount > 0 && (
        <span
          className={`${itemClass ?? ''} inline-flex items-center justify-center m-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-200/70 dark:bg-neutral-800/70 text-neutral-600 dark:text-neutral-300 tabular-nums`}
          aria-label={`${hiddenCount} مورد بیشتر`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

export default CategoryBadgeList;
