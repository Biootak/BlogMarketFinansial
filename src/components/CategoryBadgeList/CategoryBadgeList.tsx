import type React from 'react';
import { useMemo } from 'react';
import Badge from '@/components/Badge/Badge';
import type { Category } from '@prisma/client';
import type { TwMainColor } from '@/types/types';

export interface CategoryBadgeListProps {
  className?: string;
  itemClass?: string;
  categories: Category[];
}

const CategoryBadgeList: React.FC<CategoryBadgeListProps> = ({
  className = 'flex flex-wrap',
  itemClass,
  categories,
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
      {} as Record<string | number, TwMainColor>,
    );
  }, [categories]);

  return (
    <div className={`nc-CategoryBadgeList ${className}`} data-nc-id="CategoryBadgeList">
      {categories.map((item) => (
        <Badge
          className={`${itemClass} text-[10px]/[14px] px-3 py-1  m-1`}
          key={item.id}
          name={item.name}
          color={categoryColors[item.id]}
          href={`/archive/category/${item.slug}`}
        />
      ))}
    </div>
  );
};

export default CategoryBadgeList;
