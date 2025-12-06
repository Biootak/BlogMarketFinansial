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
}

const CategoryBadgeList: React.FC<CategoryBadgeListProps> = ({
  className = 'flex flex-wrap',
  itemClass,
  categories,
  disableLinks = false,
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

  const categoryColors = useMemo(() => {
    return categories.reduce(
      (acc, category, index) => {
        acc[category.id] = colors[index % colors.length];
        return acc;
      },
      {} as Record<string, TwMainColor>,
    );
  }, [categories]);

  return (
    <div className={`nc-CategoryBadgeList ${className}`} data-nc-id="CategoryBadgeList">
      {categories.map((category) => (
        <Badge
          key={category.id}
          className={`${itemClass} text-[10px]/[14px] px-3 py-1  m-1`}
          name={category.name}
          color={categoryColors[category.id]}
          href={disableLinks ? undefined : `/archive/category/${category.slug}`}
          isLink={!disableLinks}
        />
      ))}
    </div>
  );
};

export default CategoryBadgeList;
