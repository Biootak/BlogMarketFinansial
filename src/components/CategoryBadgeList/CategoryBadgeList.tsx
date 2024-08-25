import type React from 'react';
import Badge from '@/components/Badge/Badge';
import type { Category } from '@prisma/client';

export interface CategoryBadgeListProps {
  className?: string;
  itemClass?: string;
  categories: Category[];
}

const CategoryBadgeList: React.FC<CategoryBadgeListProps> = ({
  className = 'flex flex-wrap space-x-2 rtl:space-x-reverse',
  itemClass,
  categories,
}) => {
  return (
    <div className={`nc-CategoryBadgeList ${className} rtl `} data-nc-id="CategoryBadgeList">
      {categories.map((item) => (
        <Badge
          className={itemClass}
          key={item.id}
          name={item.name}
          href={`/category/${item.slug}`}
          color="blue"
        />
      ))}
    </div>
  );
};

export default CategoryBadgeList;
